// ── OOPS! — Main game loop ───────────────────────────────────────────────────

const LOGICAL_H = 270;

// ── Globals ───────────────────────────────────────────────────────────────────
let canvas, ctx, scale, logicalW;
let stage, player, particleSystem, hud, wire;
let enemies = [];
let bullets  = [];
let camX     = 0;
let score    = 0;
let scoreTimer = 0;
let deaths   = parseInt(localStorage.getItem('oops_deaths') || '0');
let gameState  = 'playing'; // 'playing' | 'dying' | 'dead_ui' | 'cleared'
let deathTimer = 0;

// Input
const keys      = {};
let mouseLogX   = 0;
let mouseLogY   = 0;
let mouseHeld   = false; // PC: hold to aim, release to fire

// Invincibility frames after taking damage (prevent rapid HP loss)
let iFrames = 0;
const I_FRAMES = 90; // 1.5 sec

// ── Bootstrap ─────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('gameCanvas');
  ctx    = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  const params  = new URLSearchParams(location.search);
  const stageId = params.get('stage') || 'stage_001';
  loadStage(stageId);
  setupInput();
  requestAnimationFrame(loop);
});

function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  scale    = canvas.height / LOGICAL_H;
  logicalW = canvas.width / scale;
}

// ── Stage loading ─────────────────────────────────────────────────────────────
function loadStage(id) {
  stage          = STAGES[id];
  particleSystem = new ParticleSystem();
  hud            = new HUD();
  wire           = new Wire();
  enemies        = (stage.enemies || []).map(cfg => new Enemy(cfg));
  bullets        = [];
  score          = 0;
  scoreTimer     = 0;
  camX           = 0;
  iFrames        = 0;
  gameState      = 'playing';
  deathTimer     = 0;
  hideDeath();
  player = new Player(stage.spawnX, stage.spawnY);
}

function respawn() { loadStage(stage.id); }

// ── Input ─────────────────────────────────────────────────────────────────────
function setupInput() {
  window.addEventListener('keydown', e => {
    keys[e.code] = true;

    if (gameState === 'playing') {
      if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        if (wire.state === 'attached') {
          // Jump releases wire with a slight upward boost
          const vel = wire.detach();
          if (vel) { player.vx = vel.vx; player.vy = Math.min(vel.vy - 2, -4); }
        } else {
          player.jump();
        }
      }
      // Mouse-aim shoot (F key as alternative on desktop)
      if (e.code === 'KeyF') fireAtMouse();
    }

    if (e.code === 'Enter' || e.code === 'KeyR') {
      if (gameState === 'dead_ui' || gameState === 'cleared') respawn();
    }
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });

  // Mouse move — track aim in world coordinates
  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    const cssScale = canvas.height / LOGICAL_H;
    mouseLogX = (e.clientX - r.left) / cssScale + camX;
    mouseLogY = (e.clientY - r.top)  / cssScale;
  });

  // Mouse hold to aim, release to fire (Brawl Stars style)
  canvas.addEventListener('mousedown', e => {
    if (e.button !== 0 || gameState !== 'playing') return;
    mouseHeld = true;
    const r = canvas.getBoundingClientRect();
    const cssScale = canvas.height / LOGICAL_H;
    mouseLogX = (e.clientX - r.left) / cssScale + camX;
    mouseLogY = (e.clientY - r.top)  / cssScale;
  });

  canvas.addEventListener('mouseup', e => {
    if (e.button !== 0 || !mouseHeld) return;
    mouseHeld = false;
    if (gameState !== 'playing') return;
    const r = canvas.getBoundingClientRect();
    const cssScale = canvas.height / LOGICAL_H;
    const tx = (e.clientX - r.left) / cssScale + camX;
    const ty = (e.clientY - r.top)  / cssScale;
    handleShoot(tx, ty);
  });

  // Cancel aim if mouse leaves canvas
  canvas.addEventListener('mouseleave', () => { mouseHeld = false; });

  // Touch
  canvas.addEventListener('touchstart',  onTouchStart,  { passive: false });
  canvas.addEventListener('touchmove',   onTouchMove,   { passive: false });
  canvas.addEventListener('touchend',    onTouchEnd,    { passive: false });
  canvas.addEventListener('touchcancel', onTouchEnd,    { passive: false });
}

function fireAtMouse() {
  handleShoot(mouseLogX, mouseLogY);
}

function handleShoot(tx, ty) {
  if (!player.alive) return;
  if (stage.hasWire) {
    if (wire.state !== 'idle') {
      const vel = wire.detach();
      if (vel) { player.vx = vel.vx; player.vy = vel.vy; }
    } else {
      wire.shoot(player.centerX, player.centerY, tx, ty);
    }
  } else {
    spawnBullet(tx, ty);
  }
}

function spawnBullet(tx, ty) {
  const dx   = tx - player.centerX;
  const dy   = ty - player.centerY;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  bullets.push(new Bullet(
    player.centerX, player.centerY,
    (dx / dist) * BULLET_SPEED,
    (dy / dist) * BULLET_SPEED,
  ));
}

// ── Touch ─────────────────────────────────────────────────────────────────────
function toLogical(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const cssScale = canvas.height / LOGICAL_H;
  return { lx: (clientX - r.left) / cssScale, ly: (clientY - r.top) / cssScale };
}

function onTouchStart(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    const { lx, ly } = toLogical(t.clientX, t.clientY);
    const stick = lx < logicalW / 2 ? hud.leftStick : hud.rightStick;
    if (!stick.active) stick.onTouchStart(lx, ly, t.identifier);
  }
}

function onTouchMove(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    const { lx, ly } = toLogical(t.clientX, t.clientY);
    if (hud.leftStick.touchId  === t.identifier) hud.leftStick.onTouchMove(lx, ly);
    if (hud.rightStick.touchId === t.identifier) hud.rightStick.onTouchMove(lx, ly);
  }
}

function onTouchEnd(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (hud.leftStick.touchId === t.identifier) {
      hud.leftStick.onTouchEnd();
    }
    if (hud.rightStick.touchId === t.identifier) {
      // Fire on right-stick release
      if (hud.rightStick.active && gameState === 'playing') {
        const dx = hud.rightStick.dx;
        const dy = hud.rightStick.dy;
        if (Math.abs(dx) > 0.12 || Math.abs(dy) > 0.12) {
          const tx = player.centerX + dx * 300;
          const ty = player.centerY + dy * 300;
          handleShoot(tx, ty);
        }
      }
      hud.rightStick.onTouchEnd();
    }
  }
}

// ── Camera ────────────────────────────────────────────────────────────────────
function updateCamera() {
  const target = player.centerX - logicalW / 2;
  const maxCam = Math.max(0, stage.width - logicalW);
  camX = Math.max(0, Math.min(target, maxCam));
}

// ── Goal ──────────────────────────────────────────────────────────────────────
function checkGoal() {
  const gp = stage.platforms[stage.goalPlatformIndex];
  if (player.onGround &&
      player.x + player.w > gp.x && player.x < gp.x + gp.w &&
      Math.abs((player.y + player.h) - gp.y) < 4) {
    score += 500;
    const c = parseInt(localStorage.getItem('oops_coins') || '0') + 10;
    localStorage.setItem('oops_coins', c);
    wire.release();
    gameState = 'cleared';
    showCleared();
  }
}

// ── Death ─────────────────────────────────────────────────────────────────────
function triggerDeath() {
  deaths++;
  localStorage.setItem('oops_deaths', deaths);
  const c = parseInt(localStorage.getItem('oops_coins') || '0') + 3;
  localStorage.setItem('oops_coins', c);
  wire.release();
  gameState  = 'dying';
  deathTimer = 0;
  particleSystem.explode(player.centerX, player.centerY, player.color);
}

// ── Combat ────────────────────────────────────────────────────────────────────
function updateBullets() {
  for (const b of bullets) {
    b.update(stage.width);
    if (!b.alive) continue;
    for (const en of enemies) {
      if (en.alive && b.hitTest(en)) {
        b.alive = false;
        en.hit();
        if (!en.alive) {
          score += 100;
          particleSystem.explodeSmall(en.cx, en.cy, en.color);
        }
        break;
      }
    }
  }
  bullets = bullets.filter(b => b.alive);
  enemies = enemies.filter(en => en.alive);
}

function checkPlayerHit() {
  if (!player.alive || iFrames > 0) return;
  for (const en of enemies) {
    if (!en.alive) continue;
    const dx = player.centerX - en.cx;
    const dy = player.centerY - en.cy;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
      player.hp--;
      iFrames = I_FRAMES;
      // Knockback
      player.vx = dx > 0 ? 5 : -5;
      player.vy = -4;
      wire.release();
      if (player.hp <= 0) {
        player.alive      = false;
        player.deathReason = 'enemy';
      }
      return;
    }
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update() {
  if (gameState === 'playing') {
    // Movement input
    player.moveLeft  = !!(keys['KeyA'] || keys['ArrowLeft']);
    player.moveRight = !!(keys['KeyD'] || keys['ArrowRight']);

    // Left touch stick overrides keyboard
    const ldx = hud.leftStick.dx;
    if (Math.abs(ldx) > 0.15) {
      player.moveLeft  = ldx < 0;
      player.moveRight = ldx > 0;
    }
    if (hud.leftStick.checkJump()) {
      if (wire.state === 'attached') {
        const vel = wire.detach();
        if (vel) { player.vx = vel.vx; player.vy = Math.min(vel.vy - 2, -4); }
      } else {
        player.jump();
      }
    }

    // Wire takes over position when attached
    if (wire.state === 'attached') {
      // Space = pull rope (shorten) to gain height
      if (keys['Space'] || keys['KeyW'] || keys['ArrowUp']) {
        wire.length = Math.max(30, wire.length - 1.2);
      }
      wire.update(player, stage.platforms);
    } else {
      player.update(stage.platforms);
      wire.update(player, stage.platforms); // advance flying tip
    }

    if (!player.alive) {
      triggerDeath();
    } else {
      if (iFrames > 0) iFrames--;

      for (const en of enemies) en.update(stage.platforms);
      updateBullets();
      checkPlayerHit();

      // Survival score: +10 pt / sec
      scoreTimer++;
      if (scoreTimer >= 60) { score += 10; scoreTimer = 0; }

      updateCamera();
      checkGoal();
    }
  }

  if (gameState === 'dying') {
    deathTimer++;
    particleSystem.update();
    if (deathTimer > 72) {
      gameState = 'dead_ui';
      showDeath();
    }
  }

  if (gameState === 'dead_ui') {
    particleSystem.update();
  }
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = stage.bgColor;
  ctx.fillRect(0, 0, logicalW, LOGICAL_H);
  drawStars(ctx);

  // World (camera-translated)
  ctx.save();
  ctx.translate(-camX, 0);

  for (let i = 0; i < stage.platforms.length; i++) {
    drawPlatform(ctx, stage.platforms[i], i === stage.goalPlatformIndex);
  }

  wire.draw(ctx, player);

  for (const en of enemies) en.draw(ctx);
  for (const b  of bullets)  b.draw(ctx);

  // Player: flicker during invincibility
  const showPlayer = iFrames === 0 || Math.floor(iFrames / 5) % 2 === 0;
  if (showPlayer) player.draw(ctx);

  particleSystem.draw(ctx);

  ctx.restore(); // end camera

  // HUD (screen space, no camera)
  hud.draw(ctx, logicalW, player.hp, score);

  // Wire aim indicator (screen space — shows current stick direction)
  drawAimIndicator(ctx);

  ctx.restore();
}

// ── Aim indicator ─────────────────────────────────────────────────────────────
function drawAimIndicator(ctx) {
  if (gameState !== 'playing' || !player.alive) return;

  let aimDx = 0, aimDy = 0;

  const rs = hud.rightStick;
  if (rs.active) {
    // Mobile: show while stick is held
    if (Math.abs(rs.dx) > 0.1 || Math.abs(rs.dy) > 0.1) {
      aimDx = rs.dx; aimDy = rs.dy;
    }
  } else if (mouseHeld) {
    // PC: show while mouse button is held
    const dx = mouseLogX - player.centerX;
    const dy = mouseLogY - player.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 8) { aimDx = dx / dist; aimDy = dy / dist; }
  }

  if (Math.abs(aimDx) < 0.05 && Math.abs(aimDy) < 0.05) return;

  const px = player.centerX - camX;
  const py = player.centerY;

  ctx.save();

  if (stage.hasWire && wire.state === 'idle') {
    const len = 90;
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = '#9FE1CB';
    ctx.lineWidth   = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + aimDx * len, py + aimDy * len);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#9FE1CB';
    ctx.beginPath();
    ctx.arc(px + aimDx * len, py + aimDy * len, 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (!stage.hasWire) {
    const len = 55;
    ctx.globalAlpha = 0.65;
    ctx.strokeStyle = '#FAC775';
    ctx.lineWidth   = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + aimDx * len, py + aimDy * len);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

// ── Platform drawing ──────────────────────────────────────────────────────────
const ANCHOR_COLOR = '#5B4FA8';

function drawPlatform(ctx, p, isGoal) {
  const isAnchor = p.color === ANCHOR_COLOR;
  const r = isAnchor ? 4 : 6;

  ctx.fillStyle   = p.color;
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth   = 2.5;
  _rrect(ctx, p.x, p.y, p.w, p.h, r);
  ctx.fill();
  ctx.stroke();

  if (isAnchor) {
    // Glowing pulse effect
    const t   = Date.now() / 600;
    const glow = 0.3 + 0.25 * Math.sin(t);
    ctx.save();
    ctx.globalAlpha = glow;
    ctx.strokeStyle = '#9FE1CB';
    ctx.lineWidth   = 2.5;
    _rrect(ctx, p.x - 2, p.y - 2, p.w + 4, p.h + 4, r + 2);
    ctx.stroke();
    ctx.restore();
    // Hook icon (small circle + line)
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth   = 1.5;
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    ctx.beginPath();
    ctx.arc(cx, cy + 1, 3.5, Math.PI * 0.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - 2.5); ctx.lineTo(cx, cy - 5.5);
    ctx.stroke();
    return; // skip highlight/depth for anchors
  }

  // Bottom depth
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(p.x + 3, p.y + p.h - 4, p.w - 6, 4);

  // Top highlight
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillRect(p.x + 4, p.y + 2, p.w - 8, 3);

  // GOAL badge
  if (isGoal) {
    const tw = 46, th = 16;
    const tx = p.x + p.w / 2 - tw / 2;
    const ty = p.y - th - 4;
    ctx.fillStyle   = '#1D9E75';
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth   = 2;
    _rrect(ctx, tx, ty, tw, th, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle    = '#FFFFFF';
    ctx.font         = 'bold 10px "M PLUS Rounded 1c", sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GOAL', p.x + p.w / 2, ty + th / 2);
  }
}

// ── Background stars ──────────────────────────────────────────────────────────
const STARS = Array.from({ length: 45 }, () => ({
  x: Math.random(),
  y: Math.random() * 210,
  r: 0.5 + Math.random() * 1.5,
  a: 0.25 + Math.random() * 0.5,
}));

function drawStars(ctx) {
  ctx.save();
  for (const s of STARS) {
    ctx.globalAlpha = s.a;
    ctx.fillStyle   = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(s.x * logicalW, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ── Overlay UI ────────────────────────────────────────────────────────────────
function showDeath() {
  const REASON_MAP = { fall: '落下死', enemy: '敵にやられた' };
  document.getElementById('death-reason-text').textContent =
    (REASON_MAP[player.deathReason] || '死亡') + ' — ' + deaths + '回目';
  document.getElementById('final-score').textContent = score.toLocaleString() + ' pt';
  document.getElementById('death-ui').classList.remove('hidden');
}

function showCleared() {
  const ui = document.getElementById('cleared-ui');
  const sub = ui.querySelector('.cleared-subtitle');
  if (sub) sub.textContent = stage.name;
  document.getElementById('cleared-score').textContent = score.toLocaleString() + ' pt';
  ui.classList.remove('hidden');
}

function hideDeath() {
  document.getElementById('death-ui').classList.add('hidden');
  document.getElementById('cleared-ui').classList.add('hidden');
}

// ── Main loop ─────────────────────────────────────────────────────────────────
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

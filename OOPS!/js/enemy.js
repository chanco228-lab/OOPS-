// ── Enemy & Bullet system ─────────────────────────────────────────────────────

// Shared rounded-rect helper (globally available — loads before game.js)
function _rrect(ctx, x, y, w, h, r) {
  if (typeof r === 'number') {
    if (ctx.roundRect) {
      ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
  } else {
    // r is [tl, tr, br, bl]
    const [tl, tr, br, bl] = r;
    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
    ctx.lineTo(x + w, y + h - br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    ctx.lineTo(x + bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
    ctx.lineTo(x, y + tl);
    ctx.quadraticCurveTo(x, y, x + tl, y);
    ctx.closePath();
  }
}

// ── Enemy ─────────────────────────────────────────────────────────────────────

class Enemy {
  constructor(cfg) {
    this.x     = cfg.x;
    this.y     = cfg.y;
    this.w     = 20;
    this.h     = 20;
    this.type  = cfg.type;
    this.hp    = 1;
    this.alive = true;
    this.hurtFlash = 0;

    if (this.type === 'walker') {
      this.color   = '#E24B4A';
      this.speed   = cfg.speed  || 1;
      this.vx      = this.speed;
      this.vy      = 0;
      this.startX  = cfg.x;
      this.range   = cfg.range  || 80;
    } else {
      // floater
      this.color      = '#7F77DD';
      this.startY     = cfg.y;
      this.floatAmp   = cfg.floatAmp   || 28;
      this.floatSpeed = cfg.floatSpeed || 0.028;
      this.floatT     = Math.random() * Math.PI * 2;
    }
  }

  update(platforms) {
    if (!this.alive) return;
    if (this.hurtFlash > 0) this.hurtFlash--;

    if (this.type === 'walker') {
      this.x += this.vx;
      // Bounce at range edges
      if (this.x < this.startX - this.range ||
          this.x + this.w > this.startX + this.range + this.w) {
        this.vx *= -1;
      }
      // Gravity
      this.vy += GRAVITY * 0.55;
      this.y  += this.vy;
      // Platform collision
      for (const p of platforms) {
        const prevBot = this.y + this.h - this.vy;
        if (this.x + this.w > p.x && this.x < p.x + p.w &&
            prevBot <= p.y + 1 && this.y + this.h >= p.y && this.vy >= 0) {
          this.y  = p.y - this.h;
          this.vy = 0;
        }
      }
    } else {
      this.floatT += this.floatSpeed;
      this.y = this.startY + Math.sin(this.floatT) * this.floatAmp;
    }
  }

  hit() {
    this.hurtFlash = 6;
    this.alive = false;
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  draw(ctx) {
    if (!this.alive) return;
    const { cx, cy, w, h } = this;

    ctx.save();
    ctx.translate(cx, cy);

    // Body
    ctx.fillStyle   = this.hurtFlash > 0 ? '#FFFFFF' : this.color;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth   = 2.5;
    _rrect(ctx, -w / 2, -h / 2, w, h, 5);
    ctx.fill();
    ctx.stroke();

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(-w / 2 + 3, -h / 2 + 2, w - 6, 3);

    // Eyes
    for (const ex of [-3.5, 3.5]) {
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(ex, 1, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Angry brows
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth   = 1.8;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, -5.5); ctx.lineTo(-1.5, -3.5);
    ctx.moveTo(6,  -5.5); ctx.lineTo(1.5,  -3.5);
    ctx.stroke();

    // Floater: small propeller dots
    if (this.type === 'floater') {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (const ey of [-h / 2 - 3, h / 2 + 3]) {
        ctx.beginPath();
        ctx.arc(0, ey, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}

// ── Bullet ────────────────────────────────────────────────────────────────────

const BULLET_SPEED = 8;

class Bullet {
  constructor(x, y, vx, vy) {
    this.x     = x;
    this.y     = y;
    this.vx    = vx;
    this.vy    = vy;
    this.r     = 7;
    this.alive = true;
  }

  update(stageWidth) {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < -80 || this.x > stageWidth + 80 || this.y < -80 || this.y > 380) {
      this.alive = false;
    }
  }

  // Circle vs AABB (generous hit radius)
  hitTest(en) {
    const dx = this.x - en.cx;
    const dy = this.y - en.cy;
    return dx * dx + dy * dy < (this.r + 12) * (this.r + 12);
  }

  draw(ctx) {
    if (!this.alive) return;
    // Glow
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle   = '#FAC775';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Core
    ctx.fillStyle   = '#FAC775';
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

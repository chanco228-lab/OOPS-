// ── Wire (grapple hook + pendulum physics) ────────────────────────────────────

const WIRE_FLY_SPEED = 14;
const WIRE_MAX_DIST  = 260;

class Wire {
  constructor() {
    this.state    = 'idle';   // 'idle' | 'flying' | 'attached'
    this.tipX     = 0;
    this.tipY     = 0;
    this.dirX     = 0;
    this.dirY     = 0;
    this.anchorX  = 0;
    this.anchorY  = 0;
    this.length   = 0;
    this.angle    = 0;        // radians from vertical (down = 0)
    this.angleVel = 0;
    this._shootX  = 0;        // origin of the shot
    this._shootY  = 0;
  }

  // Fire wire from player center toward (tx, ty)
  shoot(ox, oy, tx, ty) {
    const dx   = tx - ox;
    const dy   = ty - oy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    this.state   = 'flying';
    this._shootX = ox;
    this._shootY = oy;
    this.tipX    = ox;
    this.tipY    = oy;
    this.dirX    = dx / dist;
    this.dirY    = dy / dist;
  }

  // Detach and return velocity { vx, vy } for the player
  detach() {
    if (this.state !== 'attached') { this.state = 'idle'; return null; }
    let vx =  Math.cos(this.angle) * this.angleVel * this.length;
    let vy = -Math.sin(this.angle) * this.angleVel * this.length;
    // Cap release speed so it never goes wild
    const spd = Math.sqrt(vx * vx + vy * vy);
    const MAX_RELEASE = 9;
    if (spd > MAX_RELEASE) { vx = vx / spd * MAX_RELEASE; vy = vy / spd * MAX_RELEASE; }
    this.state = 'idle';
    return { vx, vy };
  }

  release() {
    this.state = 'idle';
  }

  // Call every frame. player is mutated when attached.
  update(player, platforms) {
    if (this.state === 'flying') {
      this.tipX += this.dirX * WIRE_FLY_SPEED;
      this.tipY += this.dirY * WIRE_FLY_SPEED;

      // Miss if too far
      if (Math.hypot(this.tipX - this._shootX, this.tipY - this._shootY) > WIRE_MAX_DIST) {
        this.state = 'idle';
        return;
      }

      // Hit check vs platform AABBs
      for (const p of platforms) {
        if (this.tipX > p.x && this.tipX < p.x + p.w &&
            this.tipY > p.y && this.tipY < p.y + p.h) {
          this._attach(player);
          return;
        }
      }
    }

    if (this.state === 'attached') {
      // Pendulum: ω' = −g·sin(θ) / L
      this.angleVel += (-GRAVITY * 0.55 * Math.sin(this.angle)) / this.length;
      this.angleVel *= 0.985; // damping — prevents runaway acceleration

      // Left/right input nudges the swing (gentle)
      if (player.moveLeft)  this.angleVel -= 0.018;
      if (player.moveRight) this.angleVel += 0.018;

      // Hard cap on angular velocity
      this.angleVel = Math.max(-0.12, Math.min(0.12, this.angleVel));

      this.angle += this.angleVel;

      // Reposition player
      player.x = this.anchorX + Math.sin(this.angle) * this.length - player.w / 2;
      player.y = this.anchorY + Math.cos(this.angle) * this.length - player.h / 2;
      player.vx = 0;
      player.vy = 0;

      // Auto-detach if player hits a platform from below (unlikely but safe)
      for (const p of platforms) {
        if (player.x + player.w > p.x && player.x < p.x + p.w &&
            player.y + player.h >= p.y && player.y < p.y) {
          const vel = this.detach();
          if (vel) { player.vx = vel.vx; player.vy = vel.vy; }
          return;
        }
      }
    }
  }

  _attach(player) {
    this.state   = 'attached';
    this.anchorX = this.tipX;
    this.anchorY = this.tipY;
    this.length  = Math.hypot(
      player.centerX - this.anchorX,
      player.centerY - this.anchorY,
    ) || 60;

    // Bootstrap angle from current geometry
    this.angle = Math.atan2(
      player.centerX - this.anchorX,
      player.centerY - this.anchorY,
    );

    // Convert player's linear velocity to angular velocity
    const tang      = Math.cos(this.angle) * player.vx - Math.sin(this.angle) * player.vy;
    this.angleVel   = tang / this.length;
  }

  draw(ctx, player) {
    if (this.state === 'idle') return;

    const ox = player.centerX;
    const oy = player.centerY;
    const tx = this.state === 'attached' ? this.anchorX : this.tipX;
    const ty = this.state === 'attached' ? this.anchorY : this.tipY;

    ctx.save();

    // Dashed rope line
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = '#9FE1CB';
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.setLineDash([]);

    // Anchor dot
    if (this.state === 'attached') {
      ctx.fillStyle   = '#9FE1CB';
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.arc(this.anchorX, this.anchorY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Flying tip dot
    if (this.state === 'flying') {
      ctx.fillStyle = '#9FE1CB';
      ctx.beginPath();
      ctx.arc(this.tipX, this.tipY, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

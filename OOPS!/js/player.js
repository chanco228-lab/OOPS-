// Player — physics, squash & stretch, drawing
const GRAVITY    = 0.44;
const JUMP_FORCE = -10.5;
const MOVE_SPEED = 3.2;

class Player {
  constructor(x, y) {
    this.reset(x, y);
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.w = 22;
    this.h = 22;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.hp = 3;
    this.alive = true;
    this.deathReason = null;
    this.color = '#FFFFFF';
    this.facing = 1; // 1=right, -1=left

    // Squash & stretch spring
    this.scaleX = 1;
    this.scaleY = 1;
    this.scaleVx = 0;
    this.scaleVy = 0;

    // Input state
    this.moveLeft  = false;
    this.moveRight = false;
  }

  jump() {
    if (!this.onGround || !this.alive) return;
    this.vy = JUMP_FORCE;
    this.onGround = false;
    this._setScale(0.78, 1.32);
  }

  _setScale(sx, sy) {
    this.scaleX = sx;
    this.scaleY = sy;
    this.scaleVx = 0;
    this.scaleVy = 0;
  }

  _springScale() {
    const stiffness = 0.28;
    const damping   = 0.55;
    this.scaleVx += (1 - this.scaleX) * stiffness;
    this.scaleVy += (1 - this.scaleY) * stiffness;
    this.scaleVx *= damping;
    this.scaleVy *= damping;
    this.scaleX  += this.scaleVx;
    this.scaleY  += this.scaleVy;
  }

  update(platforms) {
    if (!this.alive) return;

    // Horizontal
    if (this.moveLeft) {
      this.vx = -MOVE_SPEED;
      this.facing = -1;
    } else if (this.moveRight) {
      this.vx = MOVE_SPEED;
      this.facing = 1;
    } else {
      this.vx *= 0.82; // deceleration friction
    }

    // Gravity
    this.vy += GRAVITY;

    // Move
    this.x += this.vx;
    this.y += this.vy;

    // Left boundary
    if (this.x < 0) { this.x = 0; this.vx = 0; }

    // Platform collision (top only — stand on platforms)
    const wasOnGround = this.onGround;
    this.onGround = false;

    for (const p of platforms) {
      const prevBottom = this.y + this.h - this.vy;
      const inXRange   = this.x + this.w > p.x && this.x < p.x + p.w;
      const crossedTop = prevBottom <= p.y + 1 && this.y + this.h >= p.y;

      if (inXRange && crossedTop && this.vy >= 0) {
        this.y        = p.y - this.h;
        this.vy       = 0;
        this.onGround = true;
      }
    }

    // Landing squash
    if (!wasOnGround && this.onGround) {
      this._setScale(1.38, 0.62);
    }

    this._springScale();

    // Fall death
    if (this.y > 340) {
      this.alive = false;
      this.deathReason = 'fall';
    }
  }

  // Draw player in stage-space coordinates (camera already translated)
  draw(ctx) {
    if (!this.alive) return;

    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const w  = this.w;
    const h  = this.h;
    const r  = 7;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(this.scaleX, this.scaleY);

    // Body
    ctx.fillStyle   = this.color;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth   = 2.5;
    this._roundRect(ctx, -w / 2, -h / 2, w, h, r);
    ctx.fill();
    ctx.stroke();

    // Top highlight band
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    this._roundRect(ctx, -w / 2 + 3, -h / 2 + 3, w - 6, 4, 2);
    ctx.fill();

    // Eyes
    const eyeY  = 0;
    const eyeGap = 3.8;
    const eyeOffX = this.facing * 1.2;

    for (const ex of [-eyeGap + eyeOffX, eyeGap + eyeOffX]) {
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(ex, eyeY, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Highlight
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(ex + 0.9, eyeY - 1, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // Axis-aligned bounding box center
  get centerX() { return this.x + this.w / 2; }
  get centerY() { return this.y + this.h / 2; }
}

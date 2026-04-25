// HUD rendering + virtual sticks for touch input

const STICK_RADIUS   = 52;
const KNOB_RADIUS    = 26;

class VirtualStick {
  constructor(side) {
    this.side  = side;  // 'left' | 'right'
    this.active    = false;
    this.baseX     = 0;
    this.baseY     = 0;
    this.stickX    = 0;
    this.stickY    = 0;
    this.touchId   = null;
    this._jumpTriggered = false;
  }

  get dx() {
    if (!this.active) return 0;
    return Math.max(-1, Math.min(1, (this.stickX - this.baseX) / STICK_RADIUS));
  }

  get dy() {
    if (!this.active) return 0;
    return Math.max(-1, Math.min(1, (this.stickY - this.baseY) / STICK_RADIUS));
  }

  onTouchStart(lx, ly, id) {
    this.active  = true;
    this.baseX   = lx;
    this.baseY   = ly;
    this.stickX  = lx;
    this.stickY  = ly;
    this.touchId = id;
    this._jumpTriggered = false;
  }

  onTouchMove(lx, ly) {
    const dx = lx - this.baseX;
    const dy = ly - this.baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > STICK_RADIUS) {
      const scale = STICK_RADIUS / dist;
      this.stickX = this.baseX + dx * scale;
      this.stickY = this.baseY + dy * scale;
    } else {
      this.stickX = lx;
      this.stickY = ly;
    }
  }

  onTouchEnd() {
    this.active  = false;
    this.touchId = null;
    this._jumpTriggered = false;
  }

  // Returns true if a jump should be triggered this frame
  checkJump() {
    if (!this.active) return false;
    if (this.dy < -0.55 && !this._jumpTriggered) {
      this._jumpTriggered = true;
      return true;
    }
    if (this.dy >= -0.2) {
      this._jumpTriggered = false;
    }
    return false;
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.save();

    // Outer ring
    ctx.globalAlpha = 0.25;
    ctx.fillStyle   = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(this.baseX, this.baseY, STICK_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Ring border
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(this.baseX, this.baseY, STICK_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // Knob
    ctx.globalAlpha = 0.65;
    ctx.fillStyle   = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(this.stickX, this.stickY, KNOB_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// ── HUD ─────────────────────────────────────────────────────────────────────

class HUD {
  constructor() {
    this.leftStick  = new VirtualStick('left');
    this.rightStick = new VirtualStick('right');
  }

  draw(ctx, logicalW, hp, score) {
    this._drawHP(ctx, hp);
    this._drawScore(ctx, logicalW, score);
    this.leftStick.draw(ctx);
    this.rightStick.draw(ctx);
  }

  _drawHP(ctx, hp) {
    const size = 18;
    const pad  = 7;
    for (let i = 0; i < 3; i++) {
      const x = 14 + i * (size + pad);
      const y = 14;
      this._drawHeart(ctx, x, y, size, i < hp);
    }
  }

  _drawHeart(ctx, x, y, s, filled) {
    ctx.save();
    ctx.translate(x + s / 2, y + s / 2 + 1);
    const k = s / 18;
    ctx.scale(k, k);

    ctx.beginPath();
    // Heart path (center at origin, fits ~18px)
    ctx.moveTo(0, 6);
    ctx.bezierCurveTo(-10, -2, -11, -12, 0, -7);
    ctx.bezierCurveTo(11, -12, 10, -2, 0, 6);
    ctx.closePath();

    ctx.fillStyle   = filled ? '#E24B4A' : 'rgba(255,255,255,0.18)';
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth   = 2.2 / k;
    ctx.fill();
    ctx.stroke();

    if (filled) {
      // Highlight
      ctx.fillStyle   = 'rgba(255,255,255,0.35)';
      ctx.strokeStyle = 'transparent';
      ctx.beginPath();
      ctx.ellipse(-2, -5, 2.5, 1.5, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  _drawScore(ctx, logicalW, score) {
    ctx.save();
    ctx.font         = 'bold 18px monospace';
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'top';

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText(score.toLocaleString() + ' pt', logicalW - 13, 16);
    // Text
    ctx.fillStyle = '#FAC775';
    ctx.fillText(score.toLocaleString() + ' pt', logicalW - 14, 15);

    ctx.restore();
  }
}

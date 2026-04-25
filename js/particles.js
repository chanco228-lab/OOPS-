// Particle system — death explosion effect
const PARTICLE_COLORS = ['#FAC775', '#F4C0D1', '#E24B4A', '#FFFFFF'];

class Particle {
  constructor(x, y, large) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = large
      ? 0.8 + Math.random() * 2.5
      : 1.5 + Math.random() * 5.5;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - (large ? 0.5 : 1.5);
    this.r = large ? 7 + Math.random() * 7 : 1.5 + Math.random() * 2;
    this.color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
    this.alpha = 1;
    this.life = large ? 90 : 65;
    this.maxLife = this.life;
  }

  update() {
    this.vy += 0.22; // lighter gravity for floaty feel
    this.vx *= 0.98;
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
    this.alpha = this.life / this.maxLife;
    return this.life > 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  explode(x, y, skinColor) {
    // 60 small particles
    for (let i = 0; i < 60; i++) {
      const p = new Particle(x, y, false);
      if (Math.random() < 0.35) p.color = skinColor;
      this.particles.push(p);
    }
    // 8 large slow particles
    for (let i = 0; i < 8; i++) {
      this.particles.push(new Particle(x, y, true));
    }
  }

  // Smaller burst for enemy death
  explodeSmall(x, y, color) {
    for (let i = 0; i < 20; i++) {
      const p = new Particle(x, y, false);
      p.color = Math.random() < 0.5 ? color : PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
      p.r     = 1 + Math.random() * 2;
      this.particles.push(p);
    }
    for (let i = 0; i < 3; i++) {
      const p = new Particle(x, y, true);
      p.color = color;
      p.r     = 4 + Math.random() * 4;
      this.particles.push(p);
    }
  }

  update() {
    this.particles = this.particles.filter(p => p.update());
  }

  draw(ctx) {
    for (const p of this.particles) p.draw(ctx);
  }

  get active() {
    return this.particles.length > 0;
  }
}

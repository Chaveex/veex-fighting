'use strict';
// "Juice": particles, screen shake, hit-stop, slow-mo, zoom punch, flashes, aberration.
const NEON = ['#ff2fd0', '#27f0ff', '#ffe44d', '#8b5cff', '#ff6a3d', '#3dffa0'];

const FX = {
  parts: [], shake: 0, sx: 0, sy: 0, zoom: 0, zx: W / 2, zy: H / 2,
  flash: 0, flashCol: '#fff', aberr: 0, hitstop: 0, slowT: 0, slowScale: 1, slowAcc: 0, pulse: 0,

  reset() { this.parts.length = 0; this.shake = 0; this.zoom = 0; this.flash = 0; this.aberr = 0; this.hitstop = 0; this.slowT = 0; this.slowScale = 1; },
  addShake(m) { this.shake = Math.min(20, Math.max(this.shake, m)); },
  freeze(n) { this.hitstop = Math.max(this.hitstop, n); },
  slow(frames, scale) { this.slowT = Math.max(this.slowT, frames); this.slowScale = scale; },
  punch(z, x, y) { this.zoom = Math.max(this.zoom, z); if (x !== undefined) { this.zx = x; this.zy = y; } },
  flashScreen(a, col) { this.flash = Math.max(this.flash, a); this.flashCol = col || '#fff'; },

  // real-time decay (runs every rendered frame, even during hit-stop)
  updateReal() {
    if (this.shake > 0.25) {
      this.sx = (Math.random() * 2 - 1) * this.shake; this.sy = (Math.random() * 2 - 1) * this.shake;
      this.shake *= 0.84;
    } else { this.shake = 0; this.sx = this.sy = 0; }
    this.zoom *= 0.86; if (this.zoom < 0.002) this.zoom = 0;
    this.flash *= 0.84; if (this.flash < 0.01) this.flash = 0;
    if (this.aberr > 0) this.aberr -= 1;
    this.pulse += 0.05;
  },

  add(p) {
    if (this.parts.length > 900) this.parts.splice(0, 100);
    p.max = p.life; this.parts.push(p); return p;
  },
  updateWorld() {
    const a = this.parts;
    for (let i = a.length - 1; i >= 0; i--) {
      const p = a[i];
      if (--p.life <= 0) { a[i] = a[a.length - 1]; a.pop(); continue; }
      if (p.type === 'text') { p.y += p.vy; p.vy *= 0.94; continue; }
      if (p.type === 'ring') { p.r += p.vr; p.vr *= 0.9; continue; }
      if (p.type === 'smoke') { p.r += p.vr; p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96; continue; }
      if (p.type === 'glow') { continue; }
      p.x += p.vx; p.y += p.vy;
      if (p.g) p.vy += p.g;
      if (p.drag) { p.vx *= p.drag; p.vy *= p.drag; }
      if (p.rot !== undefined) p.rot += p.vr;
      if (p.floor !== undefined && p.y > p.floor) { p.y = p.floor; p.vy *= -0.4; p.vx *= 0.7; }
    }
  },

  // ---------- emitters ----------
  sparks(x, y, ang, spread, n, spd, color, life = 14, size = 1.5) {
    for (let i = 0; i < n; i++) {
      const a = ang + (Math.random() - 0.5) * spread, s = rand(spd * 0.4, spd);
      this.add({ type: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * rand(0.6, 1.2), color: color || pick(['#fff', '#fff', '#ffe44d', '#27f0ff', '#ff2fd0']), size, g: 0.12, drag: 0.93 });
    }
  },
  shards(x, y, dir, n, spd) {
    for (let i = 0; i < n; i++) {
      const a = (dir > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 2.2 - 0.5;
      const s = rand(spd * 0.3, spd);
      this.add({ type: 'shard', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(22, 40), color: pick(NEON), size: rand(2, 4.5), g: 0.28, rot: rand(6), vr: rand(-0.5, 0.5), drag: 0.97 });
    }
  },
  ring(x, y, r, vr, life, color, w = 2) { this.add({ type: 'ring', x, y, r, vr, life, color, w }); },
  glow(x, y, r, life, color) { this.add({ type: 'glow', x, y, r, life, color }); },
  smoke(x, y, n, color = '#8a7aa8', size = 3) {
    for (let i = 0; i < n; i++) this.add({ type: 'smoke', x: x + rand(-4, 4), y: y + rand(-2, 2), vx: rand(-1, 1), vy: rand(-0.8, -0.1), r: size * rand(0.6, 1.2), vr: 0.25, life: rand(18, 34), color });
  },
  text(s, x, y, o = {}) {
    this.add({ type: 'text', s, x, y, vy: o.vy === undefined ? -1.3 : o.vy, life: o.life || 46, size: o.size || 12, color: o.color || '#fff', outline: o.outline || '#1b0a33', glow: o.glow, pop: o.pop === undefined ? 1 : o.pop });
  },
  speedLines(x, y, dir, n, len = 24) {
    for (let i = 0; i < n; i++) this.add({ type: 'line', x: x + rand(-8, 8) - dir * rand(0, 20), y: y + rand(-30, 20), vx: -dir * rand(2, 5), vy: 0, len: rand(len * 0.5, len), life: rand(6, 12), color: pick(['#27f0ff', '#ff2fd0', '#fff']) });
  },
  dust(x, y, n = 6, dir = 0) {
    for (let i = 0; i < n; i++) this.add({ type: 'smoke', x: x + rand(-6, 6), y: y + rand(-1, 1), vx: rand(-1.4, 1.4) + dir * rand(0.5, 1.5), vy: rand(-0.5, -0.05), r: rand(2, 4), vr: 0.18, life: rand(14, 26), color: '#9a90b8' });
  },

  // main impact burst. power 1 (light) .. 3 (huge)
  impact(x, y, dir, power, crit) {
    const ang = dir > 0 ? 0 : Math.PI;
    this.sparks(x, y, ang, 2.4, 6 + power * 6, 4 + power * 2.6, null, 14 + power * 3);
    this.sparks(x, y, 0, 6.3, 4 + power * 3, 3 + power, '#fff', 8, 1);
    this.shards(x, y, dir, 1 + power * 2, 3 + power * 1.6);
    this.ring(x, y, 3, 2.4 + power * 1.2, 9 + power * 3, power > 1 ? '#27f0ff' : '#ff2fd0', 2);
    this.glow(x, y, 10 + power * 7, 6, '#fff');
    if (crit) {
      this.ring(x, y, 2, 5 + power * 1.5, 18, '#ffe44d', 3);
      this.ring(x, y, 2, 2.5, 26, '#ff2fd0', 2);
      this.sparks(x, y, 0, 6.3, 22, 10, null, 24, 2);
      this.glow(x, y, 34, 10, '#ffe44d');
    }
  },
  explosion(x, y, power = 1) {
    this.sparks(x, y, 0, 6.3, 30 * power, 9, null, 30, 2);
    this.shards(x, y, 1, 10 * power, 8); this.shards(x, y, -1, 10 * power, 8);
    this.ring(x, y, 4, 6, 24, '#ff2fd0', 4); this.ring(x, y, 2, 3.5, 30, '#27f0ff', 2);
    this.glow(x, y, 40 * power, 14, '#fff'); this.smoke(x, y, 8, '#b06ad8', 5);
  },

  // ---------- drawing (world space, buffer ctx) ----------
  draw(c, camX) {
    const a = this.parts;
    // normal blend items first
    for (let i = 0; i < a.length; i++) {
      const p = a[i], k = p.life / p.max;
      if (p.type === 'smoke') {
        c.globalAlpha = k * 0.5; c.fillStyle = p.color;
        c.beginPath(); c.arc(p.x - camX, p.y, p.r, 0, 6.3); c.fill();
      } else if (p.type === 'shard') {
        c.globalAlpha = Math.min(1, k * 2); c.fillStyle = p.color;
        c.save(); c.translate(p.x - camX, p.y); c.rotate(p.rot); c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); c.restore();
      }
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < a.length; i++) {
      const p = a[i], k = p.life / p.max;
      switch (p.type) {
        case 'spark':
          c.globalAlpha = Math.min(1, k * 1.6); c.strokeStyle = p.color; c.lineWidth = p.size;
          c.beginPath(); c.moveTo(p.x - camX, p.y); c.lineTo(p.x - camX - p.vx * 1.8, p.y - p.vy * 1.8); c.stroke(); break;
        case 'ring':
          c.globalAlpha = k; c.strokeStyle = p.color; c.lineWidth = Math.max(0.5, p.w * k);
          c.beginPath(); c.arc(p.x - camX, p.y, p.r, 0, 6.3); c.stroke(); break;
        case 'glow': {
          const r = p.r * (0.5 + 0.5 * k);
          c.globalAlpha = k * 0.85; c.fillStyle = p.color;
          c.beginPath(); c.arc(p.x - camX, p.y, r, 0, 6.3); c.fill(); break;
        }
        case 'line':
          c.globalAlpha = k * 0.7; c.fillStyle = p.color; c.fillRect(p.x - camX, p.y, p.vx > 0 ? -p.len : p.len, 1); break;
      }
    }
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
  },
  drawText(c, camX) {
    for (const p of this.parts) {
      if (p.type !== 'text') continue;
      const k = p.life / p.max, born = 1 - k;
      const sc = p.pop ? (born < 0.18 ? 0.5 + born / 0.18 * 0.9 : born < 0.3 ? 1.4 - (born - 0.18) / 0.12 * 0.4 : 1) : 1;
      drawText(c, p.s, Math.round(p.x - camX), Math.round(p.y), { size: p.size, color: p.color, outline: p.outline, align: 'center', italic: true, scale: sc, alpha: Math.min(1, k * 3), glow: p.glow, outlineW: 3 });
    }
  }
};

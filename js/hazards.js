'use strict';
// Steam vents (bouches d'egout a vapeur): off -> warn (about to blow) -> burst/active (jet) -> cool.
// Anything standing on an active vent is hurt and thrown to the ground: the hero AND the enemies.
// Jump over it, dash through it (i-frames = perfect dodge) or keep enemies on it.
const VentSprites = {
  base: new SpriteSheet(typeof VENT_SHEETS !== 'undefined' ? VENT_SHEETS.base : null),
  steam: new SpriteSheet(typeof VENT_SHEETS !== 'undefined' ? VENT_SHEETS.steam : null),
  ready() { return this.base.ready && this.steam.ready; }
};
function loadVentSprites() { VentSprites.base.load(); VentSprites.steam.load(); }

class SteamVent {
  constructor(x, y, cfg) {
    this.x = x; this.y = y; this.off = cfg.off; this.warn = cfg.warn; this.act = cfg.act; this.cycle = cfg.off + cfg.warn + cfg.act;
    this.t = -(cfg.delay || 0); this.hit = new Set(); this.dodged = false;
    this.state = 'off'; this.fi = 0; this.at = -1; this.dormant = !!cfg.dormant;   // dormant = decor only (stage 3): closed lid, no steam
  }
  onScreen() { return this.x > G.camX - 50 && this.x < G.camX + W + 50; }

  // The clock only runs while the vent is on screen and starts after a quiet delay, so a fight never opens on a vent about to blow.
  update() {
    if (this.dormant || !this.onScreen()) { this.state = 'off'; this.fi = 0; return; }
    this.t++;
    const ph = this.t < 0 ? -1 : this.t % this.cycle;
    let st, fi;
    if (ph < this.off) {
      if (ph >= 0 && ph < 12 && this.t > 12) { st = 'cool'; fi = Math.min(2, Math.floor(ph / 4)); } else { st = 'off'; fi = 0; }
    } else if (ph < this.off + this.warn) {
      st = 'warn'; const wt = ph - this.off; fi = Math.floor(wt / 8) % 6;
      if (this.state !== 'warn') this.warnClip = Snd.sfx.ventWarn();   // first warning frame (even if a frame was skipped)
      if (!this.warnClip && wt % 16 === 0) Snd.sfx.hiss(0.4 + wt / this.warn);   // synth fallback
    } else {
      const at = ph - this.off - this.warn;
      if (at < 6) { st = 'burst'; fi = Math.floor(at / 3); } else { st = 'active'; fi = Math.floor((at - 6) / 4) % 8; }
      if (at === 0) this.onBurst();
    }
    this.state = st; this.fi = fi;
    if (st === 'burst' || st === 'active') this.damage();
  }

  onBurst() {
    this.hit.clear(); this.dodged = false;
    if (!this.onScreen()) return;
    Snd.sfx.ventBurst(); FX.addShake(2.5);
    FX.ring(this.x, this.y - 2, 6, 5, 16, '#ffffff', 2); FX.dust(this.x, this.y, 8);
    FX.sparks(this.x, this.y - 6, -Math.PI / 2, 1.6, 10, 6, '#ffc85a', 18);
  }

  // floor footprint of the jet: an ellipse on the ground, only fighters with their feet low are caught
  standing(f) { return Math.abs(f.x - this.x) < 21 && Math.abs(f.y - this.y) < 9 && f.z < 26; }

  damage() {
    const p = G.player;
    if (p && !p.dead && !this.hit.has(p) && this.standing(p)) {
      const dir = sgn(p.x - this.x) || 1;
      if (p.iframes > 0) { if (!this.dodged) { this.dodged = true; G.onPerfectDodge(p, this); } }
      else if (p.canBeHit()) {
        this.hit.add(p);
        if (p.hurtBy(14, dir, 3.5, 6.5, this)) G.onPlayerHit(this, { dmg: 14, hs: 6, shake: 6 }, dir);
        FX.text('VAPEUR!', p.x, p.y - 84, { size: 10, color: '#ffc85a', glow: '#ff8a3a', life: 34 });
      }
    }
    for (const e of G.enemies) {
      if (this.hit.has(e) || !e.hittable() || !this.standing(e)) continue;
      this.hit.add(e); ventHit(e, this, sgn(e.x - this.x) || (Math.random() < 0.5 ? 1 : -1));
    }
  }

  // ---- drawing: base = lid on the floor (under everybody), draw = steam plume (depth-sorted with fighters) ----
  drawBase(c, camX) {
    if (!VentSprites.ready()) return;
    const x = this.x - camX;
    VentSprites.base.draw(c, this.state + this.fi, x, this.y, 1);
    // glow on the floor around the vent
    let a = 0, col = '255,140,60', rx = 30, ry = 11;
    if (this.state === 'warn') a = 0.10 + 0.12 * (0.5 + 0.5 * Math.sin(G.frame * 0.35));
    else if (this.state === 'burst') { a = 0.5; col = '255,240,200'; rx = 44; ry = 16; }
    else if (this.state === 'active') { a = 0.28; col = '255,200,120'; rx = 38; ry = 14; }
    else if (this.state === 'cool') a = 0.12;
    if (a > 0) {
      c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(${col},${a})`;
      c.beginPath(); c.ellipse(x, this.y, rx, ry, 0, 0, 6.3); c.fill(); c.globalCompositeOperation = 'source-over';
    }
  }
  draw(c, camX) {
    if (!VentSprites.ready() || this.state === 'off') return;
    VentSprites.steam.draw(c, this.state + this.fi, this.x - camX, this.y, 1);
  }
}

// an enemy caught on a vent: damage + thrown to the ground, credited like any other KO
function ventHit(e, vent, dir) {
  Ach.unlock('steam');
  const dmg = Math.round(16 + G.level * 2);
  e.takeHit(dir, { kb: 3.5, lift: 6.5, w: 3, hs: 6, shake: 5, knock: true, name: 'VAPEUR' }, dmg, false, false);
  FX.impact(e.x, e.y - e.z - 30, dir, 2, false); Snd.sfx.hit(2); FX.freeze(5); FX.addShake(4);
  FX.text(String(dmg), e.x + rand(-5, 5), e.y - e.z - 60, { size: 11, color: '#ffc85a', glow: '#ff8a3a', life: 40 });
  FX.text('VAPEUR!', e.x, e.y - e.z - 78, { size: 9, color: '#ffe0b0', life: 32 });
  G.target = e; G.targetT = 200; G.addStyle(6); G.addScore(dmg * 3);
  if (e.boss) checkBossPhase(e);
  if (e.hp <= 0) onKill(e, dir, e.x, e.y - 30);
}

// ============ electrified floor plates (stage 4: replaces the steam vents) ============
// A plate covers the upper OR the lower half of the street on ~120 px, so there is always a way around.
// off -> charge (cyan seams blink faster, crackles) -> discharge (bright surface + arcs: hurts whoever has his feet on it) -> off.
// Like the vents, the clock only runs on screen and starts after a quiet delay; jump over it or dash through it (perfect dodge).
class ElectroPlate {
  constructor(o, timing) {
    this.x0 = o.x; this.x1 = o.x + (o.w || 120); this.y0 = o.y; this.y1 = o.y + (o.h || 34);
    this.x = (this.x0 + this.x1) / 2; this.y = this.y0;                     // x: culling, y: depth sorting (drawn under everybody)
    this.off = timing.off; this.warn = timing.warn; this.act = timing.act; this.cycle = this.off + this.warn + this.act;
    this.t = -(o.delay || 0); this.state = 'off'; this.hit = new Set(); this.dodged = false; this.arcs = [];
  }
  onScreen() { return this.x1 > G.camX - 20 && this.x0 < G.camX + W + 20; }
  on(f) { return f.x > this.x0 - 4 && f.x < this.x1 + 4 && f.y > this.y0 - 3 && f.y < this.y1 + 3 && f.z < 10; }
  update() {
    if (!this.onScreen()) { this.state = 'off'; return; }
    this.t++;
    const ph = this.t < 0 ? -1 : this.t % this.cycle;
    const prev = this.state;
    if (ph < this.off) this.state = 'off';
    else if (ph < this.off + this.warn) { this.state = 'warn'; this.k = (ph - this.off) / this.warn; }
    else { this.state = 'active'; this.k = (ph - this.off - this.warn) / this.act; }
    if (this.state === 'warn' && prev !== 'warn') { this.warnClip = Snd.sfx.plateCharge(); }
    if (this.state === 'warn' && !this.warnClip && (ph - this.off) % 14 === 0) Snd.sfx.zap(0.15 + this.k * 0.3);   // synth fallback
    if (this.state === 'active' && prev !== 'active') this.discharge();
    if (this.state === 'active') this.damage();
    if (this.state !== 'off' && G.frame % (this.state === 'active' ? 2 : 6) === 0) this.newArcs();
  }
  discharge() {
    this.hit.clear(); this.dodged = false;
    Snd.sfx.plateZap(); FX.addShake(3); FX.flashScreen(0.12, '#9ff8ff');
    FX.sparks(this.x, this.y0 + 10, -Math.PI / 2, 1.8, 14, 6, '#9ff8ff', 18);
  }
  damage() {
    const p = G.player;
    if (p && !p.dead && !this.hit.has(p) && this.on(p)) {
      const dir = sgn(p.x - this.x) || 1;
      if (p.iframes > 0) { if (!this.dodged) { this.dodged = true; G.onPerfectDodge(p, this); } }
      else if (p.canBeHit()) {
        this.hit.add(p);
        if (p.hurtBy(12, dir, 2.5, 5.5, this)) G.onPlayerHit(this, { dmg: 12, hs: 6, shake: 6 }, dir);
        FX.text('ZZZAP!', p.x, p.y - 84, { size: 10, color: '#9ff8ff', glow: '#27f0ff', life: 34 });
      }
    }
    for (const e of G.enemies) {
      if (this.hit.has(e) || !e.hittable() || !this.on(e)) continue;
      this.hit.add(e); envHit(e, sgn(e.x - this.x) || 1, Math.round(14 + G.level * 2), 'ZZZAP!', { kb: 2.5, lift: 5.5, w: 3, freeze: 4, stun: 30, style: 6, col: '#9ff8ff', glow: '#27f0ff' });
    }
  }
  newArcs() {   // a few jagged lightning polylines across the plate
    const n = this.state === 'active' ? 3 : 1; this.arcs = [];
    for (let i = 0; i < n; i++) {
      let x = this.x0 + rand(4, 20), y = rand(this.y0 + 3, this.y1 - 3); const pts = [[x, y]];
      while (x < this.x1 - 8) { x += rand(6, 14); y = clamp(y + rand(-6, 6), this.y0 + 2, this.y1 - 2); pts.push([x, y]); }
      this.arcs.push(pts);
    }
  }
  // Aseprite sheets (assets/props/plate.aseprite, tools/ase/plate.lua): 'plate' = steel, 'plate_light' = additive light; procedural fallback below
  drawSprite(c, camX) {
    const S = typeof PropSprites !== 'undefined' ? PropSprites : {}, base = S.plate, light = S.plate_light;
    if (!base || !base.ready || !light || !light.ready) return false;
    const f = this.state === 'off' ? 'off_' + ((G.frame >> 5) % 2) : this.state === 'warn' ? 'warn_' + Math.min(5, Math.floor(this.k * 6)) : 'active_' + ((G.frame >> 1) % 6);
    const x = Math.round(this.x0 - camX), y = this.y0, w = this.x1 - this.x0, h = this.y1 - this.y0;
    base.draw(c, f, x, y, 1);
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = this.state === 'warn' ? (G.frame % Math.max(3, Math.round(14 - this.k * 11)) < 2 ? 1 : 0.55) : 1;
    light.draw(c, f, x, y, 1);
    c.globalAlpha = 1;
    if (this.state === 'active') {
      const g = c.createRadialGradient(x + w / 2, y + h / 2, 4, x + w / 2, y + h / 2, w * 0.7); g.addColorStop(0, `rgba(39,240,255,${0.22 + 0.1 * Math.random()})`); g.addColorStop(1, 'rgba(39,240,255,0)');
      c.fillStyle = g; c.fillRect(x - w * 0.2, y - 16, w * 1.4, h + 32);
    }
    c.globalCompositeOperation = 'source-over';
    return true;
  }
  drawBase(c, camX) {
    if (this.drawSprite(c, camX)) return;
    const x0 = Math.round(this.x0 - camX), x1 = Math.round(this.x1 - camX), y0 = this.y0, y1 = this.y1, w = x1 - x0, h = y1 - y0;
    // steel plate, hazard border, grate seams
    c.fillStyle = '#05070f'; c.fillRect(x0 - 2, y0 - 2, w + 4, h + 4);
    for (let x = x0 - 2; x < x1 + 2; x += 6) { c.fillStyle = ((x - x0) / 6 | 0) % 2 ? '#0a0a0a' : '#c8a812'; c.fillRect(x, y0 - 2, 3, 2); c.fillRect(x, y1, 3, 2); }
    c.fillStyle = '#121a2c'; c.fillRect(x0, y0, w, h);
    c.fillStyle = '#1a2640'; for (let x = x0 + 3; x < x1; x += 8) c.fillRect(x, y0 + 1, 1, h - 2);
    let glow = 0.06;
    if (this.state === 'warn') glow = (0.10 + 0.35 * this.k) * (G.frame % Math.max(3, Math.round(14 - this.k * 11)) < 2 ? 1 : 0.35);
    else if (this.state === 'active') glow = 0.55 + 0.25 * Math.random();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = `rgba(39,240,255,${glow})`; for (let x = x0 + 3; x < x1; x += 8) c.fillRect(x, y0 + 1, 1, h - 2);
    if (this.state === 'active') {
      c.fillStyle = `rgba(120,240,255,${0.18 + 0.12 * Math.random()})`; c.fillRect(x0, y0, w, h);
      const g = c.createRadialGradient(x0 + w / 2, y0 + h / 2, 4, x0 + w / 2, y0 + h / 2, w * 0.7); g.addColorStop(0, 'rgba(39,240,255,.25)'); g.addColorStop(1, 'rgba(39,240,255,0)');
      c.fillStyle = g; c.fillRect(x0 - w * 0.2, y0 - 14, w * 1.4, h + 28);
    }
    if (this.state !== 'off') {
      c.strokeStyle = this.state === 'active' ? '#e8ffff' : 'rgba(150,240,255,.7)'; c.lineWidth = 1; c.beginPath();
      for (const pts of this.arcs) { c.moveTo(pts[0][0] - camX, pts[0][1]); for (const q of pts) c.lineTo(q[0] - camX, q[1]); }
      c.stroke();
    }
    c.globalCompositeOperation = 'source-over';
  }
  draw() { }
}

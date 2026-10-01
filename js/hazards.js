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
    this.state = 'off'; this.fi = 0; this.at = -1;
  }
  onScreen() { return this.x > G.camX - 50 && this.x < G.camX + W + 50; }

  // The clock only runs while the vent is on screen and starts after a quiet delay, so a fight never opens on a vent about to blow.
  update() {
    if (!this.onScreen()) { this.state = 'off'; this.fi = 0; return; }
    this.t++;
    const ph = this.t < 0 ? -1 : this.t % this.cycle;
    let st, fi;
    if (ph < this.off) {
      if (ph >= 0 && ph < 12 && this.t > 12) { st = 'cool'; fi = Math.min(2, Math.floor(ph / 4)); } else { st = 'off'; fi = 0; }
    } else if (ph < this.off + this.warn) {
      st = 'warn'; const wt = ph - this.off; fi = Math.floor(wt / 8) % 6;
      if (wt % 16 === 0) Snd.sfx.hiss(0.4 + wt / this.warn);
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
    Snd.sfx.steam(); FX.addShake(2.5);
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
  const dmg = Math.round(16 + G.level * 2);
  e.takeHit(dir, { kb: 3.5, lift: 6.5, w: 3, hs: 6, shake: 5, knock: true, name: 'VAPEUR' }, dmg, false, false);
  FX.impact(e.x, e.y - e.z - 30, dir, 2, false); Snd.sfx.hit(2); FX.freeze(5); FX.addShake(4);
  FX.text(String(dmg), e.x + rand(-5, 5), e.y - e.z - 60, { size: 11, color: '#ffc85a', glow: '#ff8a3a', life: 40 });
  FX.text('VAPEUR!', e.x, e.y - e.z - 78, { size: 9, color: '#ffe0b0', life: 32 });
  G.target = e; G.targetT = 200; G.addStyle(6); G.addScore(dmg * 3);
  if (e.boss) checkBossPhase(e);
  if (e.hp <= 0) onKill(e, dir, e.x, e.y - 30);
}

'use strict';
// Level props: one breakable set-piece + one signature mechanic per level.
//   L1  bin (health)           hydrant (jet shoves enemies into the walls)
//   L2  cabinet (electric)     bumper (pinball rebound for launched enemies AND your dash)
//   L3  cabriolet (explosion)  ball (kick it: it pierces enemies while bouncing)
//   L4  server (EMP stun)      conveyor (carries everyone)
const PropSprites = {};
if (typeof PROP_SHEETS !== 'undefined') for (const k in PROP_SHEETS) PropSprites[k] = new SpriteSheet(PROP_SHEETS[k]);
function loadPropSprites() { for (const k in PropSprites) PropSprites[k].load(); }

const PROP_HINTS = {
  bin: 'CASSE LES POUBELLES : SOINS ET FURY',
  hydrant: "BORNE D'INCENDIE : FRAPPE-LA, LE JET PROJETTE LES ENNEMIS CONTRE LE MUR",
  cabinet: "BORNE D'ARCADE : ELLE EXPLOSE EN ARC ELECTRIQUE",
  bumper: 'BUMPER : RENVOIE LES ENNEMIS PROJETES ET TON DASH',
  car: 'CABRIOLET : CASSE-LA POUR UNE EXPLOSION GEANTE',
  ball: 'BALLON : FRAPPE-LE, IL PERCE LES ENNEMIS EN REBONDISSANT',
  server: 'SERVEUR : LE DETRUIRE ETOURDIT TOUS LES ENNEMIS',
  conveyor: 'TAPIS ROULANT : IL ENTRAINE TOUT LE MONDE'
};
PROP_HINTS.cabriolet = PROP_HINTS.car;

// coloured shards (metal, glass, water...) thrown from a point
FX.debris = function (x, y, dir, n, cols, spd = 5) {
  for (let i = 0; i < n; i++) {
    const a = (dir > 0 ? -0.6 : Math.PI + 0.6) + (Math.random() - 0.5) * 3.2, s = rand(spd * 0.3, spd);
    this.add({ type: 'shard', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, life: rand(26, 46), color: pick(cols), size: rand(2, 5), g: 0.3, rot: rand(6), vr: rand(-0.5, 0.5), drag: 0.97 });
  }
};

// damage + throw an enemy, credited like a normal KO
function envHit(e, dir, dmg, label, o) {
  o = o || {};
  const ach = { 'JET!': 'jet', 'TILT!': 'tilt', 'STRIKE!': 'strike', 'ZZZAP!': 'zap' }[label]; if (ach) Ach.unlock(ach);
  e.takeHit(dir, { kb: o.kb || 3.5, lift: o.lift || 6.5, w: o.w || 3, hs: 6, shake: 5, knock: true, stun: o.stun }, dmg, false, false);
  FX.impact(e.x, e.y - e.z - 30, dir, 2, false); Snd.sfx.hit(2); FX.freeze(o.freeze || 5); FX.addShake(4);
  FX.text(String(dmg), e.x + rand(-5, 5), e.y - e.z - 60, { size: 11, color: o.col || '#ffc85a', glow: o.glow || '#ff8a3a', life: 40 });
  if (label) FX.text(label, e.x, e.y - e.z - 78, { size: 9, color: '#ffe0b0', life: 32 });
  G.target = e; G.targetT = 200; G.addStyle(o.style || 6); G.addScore(dmg * 3);
  if (e.boss) checkBossPhase(e);
  if (e.hp <= 0) onKill(e, dir, e.x, e.y - 30);
}
// area damage around a point (enemies + a softened hit on the hero)
function blast(x, y, rx, dmgE, dmgP, label, o) {
  o = o || {};
  for (const e of G.enemies) {
    if (e.dead || !e.hittable() || Math.abs(e.x - x) > rx || Math.abs(e.y - y) > rx * 0.34 || e.z > 60) continue;
    envHit(e, sgn(e.x - x) || 1, dmgE, label, { kb: o.kb || 7, lift: o.lift || 7.5, freeze: 4, style: 8, col: o.col, glow: o.glow });
  }
  const p = G.player;
  if (p && !p.dead && dmgP > 0 && Math.abs(p.x - x) < rx * 0.72 && Math.abs(p.y - y) < rx * 0.26 && p.z < 50) {
    if (p.iframes > 0) G.onPerfectDodge(p, { x, y });
    else if (p.canBeHit()) { const dir = sgn(p.x - x) || 1; if (p.hurtBy(dmgP, dir, 5, 6.5, null)) G.onPlayerHit(null, { dmg: dmgP, hs: 6, shake: 8 }, dir); }
  }
}
function dropPickup(x, y, kind) { G.pickups.push(new Pickup(kind, x, y)); }

// ============================================================ base prop
class Prop {
  constructor(type, x, y, o) {
    this.type = type; this.x = x; this.y = y; this.z = 0; this.t = randi(0, 60); this.flash = 0; this.wob = 0; this.hitT = 0;
    this.hw = 10; this.hh = 30; this.hp = 1; this.maxHp = 1; this.dead = false; this.key = type; this.cd = new Map(); this.o = o || {}; this.floor = false;
  }
  get spr() { const s = PropSprites[this.key]; return s && s.ready ? s : null; }
  onScreen() { return this.x > G.camX - 60 && this.x < G.camX + W + 60; }
  breakable() { return !this.dead; }
  hurtbox() { return { x: this.x, y: this.y, z: this.z, hw: this.hw, hh: this.hh }; }
  onHit() { }
  tick() {
    this.t++; if (this.flash > 0) this.flash--; if (this.wob > 0) this.wob--; if (this.hitT > 0) this.hitT--;
    if (!G.seenProps[this.type] && this.onScreen()) {
      G.seenProps[this.type] = true; if (!G.banner && PROP_HINTS[this.type]) G.hint = { t: 0, text: PROP_HINTS[this.type] };
    }
  }
  update() { this.tick(); }
  // fighters flung into a breakable prop damage it
  thrownCheck(dmg) {
    for (const e of G.enemies) {
      if (e.state !== 'launched' || Math.abs(e.vx) < 2 || (this.cd.get(e) || 0) > G.frame) continue;
      if (Math.abs(e.x - this.x) < this.hw + e.hw && Math.abs(e.y - this.y) < 14 && e.z < this.hh) {
        this.cd.set(e, G.frame + 30); this.onHit(null, { w: 2 }, sgn(e.vx), dmg || 1); e.vx *= 0.5;
      }
    }
  }
  shadow(c, camX) {
    c.fillStyle = 'rgba(6,0,20,.4)'; c.beginPath(); c.ellipse(Math.round(this.x - camX), Math.round(this.y + 1), this.hw * 1.3, 4, 0, 0, 6.3); c.fill();
  }
  frameName() { return null; }
  draw(c, camX) {
    const s = this.spr, f = this.frameName(); if (!s || !f) return;
    const x = this.x - camX + (this.wob > 0 ? Math.sin(this.wob * 1.7) * Math.min(2.5, this.wob * 0.4) : 0), y = this.y - this.z;
    s.draw(c, f, x, y, 1);
    if (this.flash > 0) s.draw(c, f, x, y, 1, null, 'white');
  }
}

// ============================================================ L1
class Bin extends Prop {
  constructor(x, y) { super('bin', x, y); this.hw = 9; this.hh = 32; this.hp = this.maxHp = 3; }
  frameName() { return this.hp >= 3 ? 'bin0' : this.hp === 2 ? 'bin1' : 'bin2'; }
  update() { this.tick(); this.thrownCheck(1); }
  onHit(att, mv, dir, dmg) {
    this.hp -= dmg || 1; this.flash = 4; this.wob = 10;
    FX.sparks(this.x, this.y - 24, dir > 0 ? 0 : Math.PI, 2, 8, 6, pick(['#fff', '#c8cee0', '#ffe44d']), 14); FX.debris(this.x, this.y - 20, dir, 3, ['#8088a8', '#c8cee0', '#4d5278'], 4);
    FX.freeze(3); FX.addShake(2);
    if (this.hp <= 0) this.destroy(dir); else Snd.sfx.binHit();
  }
  destroy(dir) {
    this.dead = true; this.remove = true; Ach.add('bins', 10, 'bins10');
    FX.debris(this.x, this.y - 24, dir, 16, ['#8088a8', '#c8cee0', '#4d5278', '#ff2fd0', '#27f0ff'], 7); FX.smoke(this.x, this.y - 12, 5, '#8a8aa0', 4); FX.ring(this.x, this.y - 22, 4, 4, 14, '#fff', 2);
    FX.addShake(4); Snd.sfx.binBreak();
    const p = G.player; let kind = pick(['soda', 'soda', 'pizza', 'tape']);
    if (p && p.hp < 40) kind = 'pizza';
    if (Math.random() < 0.8) dropPickup(this.x, this.y, kind);
    FX.text('CLANG!', this.x, this.y - 44, { size: 10, color: '#c8f0ff', life: 30 }); G.addScore(40); G.addStyle(5);
  }
}

class Hydrant extends Prop {
  constructor(x, y) { super('hydrant', x, y); this.hw = 8; this.hh = 30; this.state = 'idle'; this.gushT = 0; this.dir = 1; }
  breakable() { return this.state !== 'spent'; }
  frameName() { return this.state === 'idle' ? 'hyd0' : 'hyd1'; }
  onHit(att, mv, dir) {
    if (this.state === 'spent') return;
    this.flash = 4; this.wob = 8; this.dir = dir || this.dir; Snd.sfx.hydrantHit(); FX.freeze(3); FX.addShake(2);
    if (this.state === 'idle') {
      this.state = 'gush'; this.gushT = 210; FX.text('SPLASH!', this.x, this.y - 52, { size: 10, color: '#7fe4ff', glow: '#27f0ff', life: 34 });
      FX.ring(this.x, this.y - 30, 4, 5, 16, '#7fe4ff', 2); Snd.sfx.hydrantBurst();
    } else this.gushT = Math.min(260, this.gushT + 50);   // hit it again from the other side to re-aim the jet
  }
  inJet(f) { const dx = (f.x - this.x) * this.dir; return dx > 4 && dx < 104 && Math.abs(f.y - this.y) < 17 && f.z < 46; }
  update() {
    this.tick();
    if (this.state !== 'gush') return;
    const key = 'hydrant' + this.x;
    if (--this.gushT <= 0) { this.state = 'spent'; Snd.loopStop(key, 0.6); return; }
    // water jet loop, quieter when the hydrant is far from the middle of the screen; synth hiss if the clip is missing
    if (Snd.loopStart(key, 'hydrant_jet', 0.55)) Snd.loopVol(key, 0.55 * clamp(1 - Math.abs(this.x - (G.camX + W / 2)) / 520, 0.08, 1) * (this.gushT < 40 ? this.gushT / 40 : 1));
    else if (this.gushT % 22 === 0) Snd.sfx.hiss(2);
    if (this.t % 2 === 0) FX.sparks(this.x + this.dir * (14 + rand(90)), this.y - rand(6, 26), -Math.PI / 2, 1.4, 1, 3, pick(['#7fe4ff', '#ffffff', '#4fb8ff']), 12, 1.2);
    const p = G.player;
    if (p && !p.dead && this.inJet(p) && p.state !== 'dash' && p.state !== 'launched' && p.state !== 'down') p.x += this.dir * 1.3;      // the hero is only carried
    if (this.gushT % 26 === 0) {
      for (const e of G.enemies) if (!e.dead && e.hittable() && this.inJet(e)) envHit(e, this.dir, 3, 'JET!', { kb: 6.5, lift: 3.2, w: 2, freeze: 2, col: '#7fe4ff', glow: '#27f0ff', style: 3 });
    }
  }
  drawBase(c, camX) {
    const s = this.spr; if (s && this.state !== 'idle') s.draw(c, 'puddle', this.x - camX, this.y, 1);
  }
  draw(c, camX) {
    super.draw(c, camX);
    const s = this.spr; if (!s || this.state !== 'gush') return;
    if (this.gushT < 30 && this.gushT % 4 < 2) return;
    s.draw(c, 'jet' + (Math.floor(this.t / 2) % 6), this.x - camX, this.y, this.dir);
  }
}

// ============================================================ L2
class Cabinet extends Prop {
  constructor(x, y) { super('cabinet', x, y); this.hw = 14; this.hh = 62; this.hp = this.maxHp = 4; }
  breakable() { return !this.dead; }
  frameName() {
    if (this.dead) return 'cab_wreck';
    if (this.hitT > 0) return 'cab_hit';
    return this.hp >= 3 ? 'cab' + (Math.floor(this.t / 8) % 4) : this.hp === 2 ? 'cab_dmg1' : 'cab_dmg2';
  }
  update() {
    this.tick(); if (this.dead) { if (this.t % 26 === 0) FX.smoke(this.x, this.y - 60, 1, '#6a6a80', 3); return; }
    this.thrownCheck(1);
    // nearly broken: the faulty electric buzz plays ~2.5 s once (started in onHit) then fades out; it is not a loop
    if (this.buzzT > 0 && --this.buzzT === 0) Snd.loopStop('cab' + this.x, 0.6);
    if (this.hp <= 1 && this.t % 14 === 0) FX.sparks(this.x + rand(-8, 8), this.y - rand(20, 50), rand(6.3), 6.3, 4, 5, pick(['#27f0ff', '#ff2fd0', '#ffe44d']), 12, 1.2);
  }
  onHit(att, mv, dir, dmg) {
    if (this.dead) return;
    this.hp -= dmg || 1; this.flash = 3; this.hitT = 5; this.wob = 8; FX.freeze(3); FX.addShake(2.5); if (this.hp > 0) Snd.sfx.cabHit();
    if (this.hp === 1 && !this.buzzT) { if (Snd.loopStart('cab' + this.x, 'cab_buzz', 0.2)) this.buzzT = 150; else Snd.sfx.hiss(0.6); }
    FX.sparks(this.x, this.y - 34, dir > 0 ? 0 : Math.PI, 2.2, 10, 6, pick(['#27f0ff', '#ff2fd0', '#ffe44d']), 16, 1.5);
    if (this.hp <= 0) this.destroy(dir);
  }
  destroy(dir) {
    this.dead = true; this.hp = 0; Ach.unlock('electro');
    FX.flashScreen(0.4, '#9ff8ff'); FX.addShake(8); FX.freeze(6); Snd.loopStop('cab' + this.x, 0.15); this.buzzT = 0; Snd.sfx.cabBreak();
    for (let i = 0; i < 3; i++) FX.ring(this.x, this.y - 34, 4 + i * 3, 5 + i * 2, 16 + i * 5, ['#27f0ff', '#ff2fd0', '#fff'][i], 3 - i * 0.6);
    for (let i = 0; i < 26; i++) { const a = rand(6.3); FX.add({ type: 'spark', x: this.x, y: this.y - 34, vx: Math.cos(a) * rand(3, 9), vy: Math.sin(a) * rand(2, 8) - 1, life: rand(14, 30), color: pick(['#27f0ff', '#ff2fd0', '#ffe44d', '#fff']), size: 2, g: 0.12, drag: 0.94 }); }
    FX.debris(this.x, this.y - 40, dir, 14, ['#3f2b78', '#27f0ff', '#ff2fd0', '#14102a'], 7); FX.text('ELECTRO!', this.x, this.y - 84, { size: 13, color: '#9ff8ff', glow: '#27f0ff', life: 50 });
    blast(this.x, this.y, 64, 14, 8, 'ZAP!', { kb: 6, lift: 6.5, col: '#9ff8ff', glow: '#27f0ff' });
    dropPickup(this.x, this.y, 'tape'); if (Math.random() < 0.5) dropPickup(this.x + 14, this.y + 4, 'soda');
    G.addScore(100); G.addStyle(10);
  }
}

class Bumper extends Prop {
  constructor(x, y) { super('bumper', x, y); this.hw = 13; this.hh = 30; }
  breakable() { return true; }
  frameName() { return this.hitT > 0 ? 'bmp_hit' + (this.hitT > 4 ? 0 : 1) : 'bmp' + (Math.floor(this.t / 8) % 3); }
  bump(fx) { this.hitT = 9; this.wob = 6; Snd.sfx.bumper(); FX.ring(this.x, this.y - 24, 4, 4, 12, '#ff9ae9', 2); FX.sparks(this.x, this.y - 26, rand(6.3), 6.3, 8, 6, pick(['#ffe44d', '#fff', '#ff2fd0']), 12, 1.5); }
  onHit(att, mv, dir) { if (att) { this.bump(); FX.text('DING!', this.x, this.y - 48, { size: 9, color: '#ffe44d', life: 26 }); } }
  update() {
    this.tick();
    const p = G.player;
    const near = (f, pad) => Math.abs(f.x - this.x) < this.hw + pad && Math.abs(f.y - this.y) < 10 && f.z < 34;
    if (p && !p.dead) {
      if (p.state === 'dash' && near(p, 9) && (this.cd.get(p) || 0) < G.frame) {           // dash rebound: restores a charge, so bumpers chain
        this.cd.set(p, G.frame + 14); p.dashDX = -p.dashDX || -p.facing; p.dashDY = -p.dashDY * 0.5; p.dashT = Math.max(0, p.dashT - 5); p.facing = p.dashDX > 0 ? 1 : -1;
        p.dashCharges = Math.min(3, p.dashCharges + 1); p.iframes = Math.max(p.iframes, 8); this.bump();
        FX.text('BOING!', this.x, this.y - 52, { size: 11, color: '#ff9ae9', glow: '#ff2fd0', life: 34 }); G.addStyle(8); G.addScore(60); FX.addShake(2);
      } else if (p.state !== 'dash' && near(p, 7)) p.x = this.x + (sgn(p.x - this.x) || 1) * (this.hw + 7);   // solid post
    }
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (e.state === 'launched' && Math.abs(e.vx) > 1.2 && near(e, 8) && (this.cd.get(e) || 0) < G.frame) {
        this.cd.set(e, G.frame + 16); this.bump();
        envHit(e, sgn(e.x - this.x) || (e.vx > 0 ? -1 : 1), 8, 'TILT!', { kb: 8.5, lift: 4.5, w: 3, freeze: 3, col: '#ff9ae9', glow: '#ff2fd0', style: 6 });
      } else if (e.state !== 'launched' && e.state !== 'down' && near(e, 7)) e.x = this.x + (sgn(e.x - this.x) || 1) * (this.hw + 7);
    }
  }
}

// ============================================================ L3
class Car extends Prop {
  constructor(x, y) { super('cabriolet', x, y); this.hw = 44; this.hh = 34; this.hp = this.maxHp = 8; this.warned = false; }
  frameName() {
    if (this.dead) return 'wreck';
    return this.hp > 5 ? 'car0' : this.hp > 2 ? 'car1' : 'car2_' + (Math.floor(this.t / 4) % 3);
  }
  update() {
    this.tick(); if (this.dead) { if (this.t % 18 === 0) FX.smoke(this.x + 30, this.y - 32, 1, '#5a5a68', 3); return; }
    this.thrownCheck(1);
    if (this.hp <= 2) {
      if (!this.warned) { this.warned = true; this.alarm = Snd.sfx.carAlarm(); FX.text('ATTENTION!', this.x, this.y - 70, { size: 10, color: '#ff8a3a', glow: '#ff2a4d', life: 50 }); }
      if (!this.alarm && this.t % 20 === 0) Snd.sfx.warn();   // synth beep only if the alarm clip is missing
      if (this.t % 4 === 0) FX.sparks(this.x + 34 + rand(-8, 8), this.y - 34, -Math.PI / 2, 1.2, 1, 3, pick(['#ffc85a', '#ff8a3a']), 14, 1.5);
    }
  }
  onHit(att, mv, dir, dmg) {
    if (this.dead) return;
    this.hp -= dmg || 1; this.flash = 3; this.wob = 8; if (this.hp > 0) Snd.sfx.carHit(); FX.freeze(3); FX.addShake(3);
    FX.sparks(this.x + dir * -20, this.y - 30, dir > 0 ? Math.PI : 0, 2, 10, 6, pick(['#fff', '#ffc85a', '#ff5fb0']), 16); FX.debris(this.x, this.y - 34, dir, 4, ['#ff5fb0', '#c8d0e8', '#fff4f8'], 5);
    if (this.hp <= 0) this.destroy(dir);
  }
  destroy(dir) {
    this.dead = true; this.hp = 0; Ach.unlock('kaboom');
    FX.flashScreen(0.85, '#fff0c0'); FX.addShake(16); FX.freeze(10); FX.slow(26, 0.3); Snd.sfx.carExplode();
    FX.explosion(this.x, this.y - 30, 2.2); FX.explosion(this.x + 24, this.y - 24, 1.4); FX.explosion(this.x - 24, this.y - 24, 1.4);
    for (let i = 0; i < 3; i++) FX.ring(this.x, this.y - 20, 6, 8 + i * 3, 24 + i * 6, ['#fff', '#ffc85a', '#ff5fb0'][i], 4 - i);
    FX.debris(this.x, this.y - 30, dir, 26, ['#ff5fb0', '#c8d0e8', '#fff4f8', '#ff8a3a', '#22202e'], 10);
    FX.text('BOOM!', this.x, this.y - 84, { size: 22, color: '#ffe44d', glow: '#ff2a4d', life: 70 });
    blast(this.x, this.y, 110, 32, 12, 'KABOOM!', { kb: 9, lift: 8.5, col: '#ffe44d', glow: '#ff2a4d' });
    dropPickup(this.x - 18, this.y, 'pizza'); dropPickup(this.x + 18, this.y, 'tape'); G.addScore(300); G.addStyle(20);
    Input.rumble(1, 1, 250);
  }
}

class Ball extends Prop {
  constructor(x, y) {
    super('ball', x, y); this.hw = 9; this.hh = 20; this.home = [x, y]; this.state = 'idle'; this.vx = 0; this.vy = 0; this.vz = 0; this.spin = 0; this.bounces = 0; this.life = 0; this.respawn = 0; this.sq = 0;
  }
  breakable() { return this.state !== 'gone'; }
  frameName() { return this.state === 'gone' ? null : (this.sq > 0 ? 'squash' : 'ball' + (Math.floor(this.spin) % 8 + 8) % 8); }
  onHit(att, mv, dir) {
    if (this.state === 'gone') return;
    if (this.state !== 'fly') { this.state = 'fly'; FX.text('BALLON!', this.x, this.y - 40, { size: 10, color: '#ffe44d', glow: '#ff2a4d', life: 30 }); }
    let tgt = null, bd = 1e9;
    for (const e of G.enemies) if (!e.dead && (e.x - this.x) * dir > 0) { const d = Math.abs(e.x - this.x); if (d < bd) { bd = d; tgt = e; } }
    this.vx = dir * 7.8; this.vy = tgt ? clamp((tgt.y - this.y) * 0.05, -1.2, 1.2) : 0; this.vz = Math.max(this.vz, 5); this.z = Math.max(this.z, 4);
    this.bounces = 0; this.life = 0; this.cd.clear(); this.sq = 5; Snd.sfx.ballKick(); FX.freeze(2); FX.addShake(2);
    FX.ring(this.x, this.y - this.z - 10, 3, 4, 12, '#fff', 2);
  }
  pop() {
    this.state = 'gone'; this.respawn = 700; Snd.sfx.ballPop();
    for (let i = 0; i < 24; i++) { const a = rand(6.3); FX.add({ type: 'spark', x: this.x, y: this.y - this.z - 10, vx: Math.cos(a) * rand(1, 6), vy: Math.sin(a) * rand(1, 6) - 1, life: rand(20, 40), color: pick(['#ff3a4a', '#ffffff', '#2f6bff', '#ffd42a']), size: 2.5, g: 0.16, drag: 0.95 }); }
  }
  update() {
    this.tick();
    if (this.state === 'gone') {
      if (--this.respawn <= 0) { this.state = 'idle'; this.x = this.home[0]; this.y = this.home[1]; this.z = 150; this.vz = 0; this.vx = this.vy = 0; }
      return;
    }
    if (this.sq > 0) this.sq--;
    this.vz -= 0.36; this.z += this.vz;
    if (this.z <= 0) { this.z = 0; this.vz = this.state === 'fly' ? Math.max(3.2, -this.vz * 0.8) : 3.6; this.sq = 3; if (this.state === 'fly') FX.dust(this.x, this.y, 2, sgn(this.vx)); }
    this.spin += Math.abs(this.vx) * 0.16 + 0.05;
    if (this.state !== 'fly') return;
    this.x += this.vx; this.y = clamp(this.y + this.vy, LANE_MIN, LANE_MAX); this.vx *= 0.997; this.life++;
    const b = G.bounds;
    if (this.x < b.minX + 10 || this.x > b.maxX - 10) {
      this.x = clamp(this.x, b.minX + 10, b.maxX - 10); this.vx = -this.vx * 0.92; this.bounces++; this.sq = 4; Snd.sfx.ballBounce();
      FX.sparks(this.x, this.y - this.z - 10, this.vx > 0 ? 0 : Math.PI, 2, 8, 5, '#fff', 12); FX.addShake(1.5);
    }
    if (this.bounces >= 6 || this.life > 460 || Math.abs(this.vx) < 1.4) { this.pop(); return; }
    for (const e of G.enemies) {
      if (e.dead || !e.hittable() || (this.cd.get(e) || 0) > G.frame) continue;
      if (Math.abs(e.x - this.x) < e.hw + 9 && Math.abs(e.y - this.y) < 15 && e.z < this.z + 24 && e.z + e.hh > this.z - 8) {
        this.cd.set(e, G.frame + 26); this.sq = 4;
        envHit(e, sgn(this.vx), 10, 'STRIKE!', { kb: 5.5, lift: 4.6, w: 2, freeze: 4, style: 7, col: '#ffe44d', glow: '#ff2a4d' });
        this.vx *= 0.94;
      }
    }
  }
  shadow(c, camX) {
    if (this.state === 'gone') return;
    const k = clamp(1 - this.z / 90, 0.3, 1); c.fillStyle = `rgba(6,0,20,${0.4 * k})`; c.beginPath(); c.ellipse(Math.round(this.x - camX), Math.round(this.y + 1), 9 * k, 3 * k, 0, 0, 6.3); c.fill();
  }
  draw(c, camX) {
    if (this.state === 'gone') return;
    const s = this.spr, f = this.frameName(); if (!s || !f) return;
    const x = this.x - camX, y = this.y - this.z;
    s.draw(c, f, x, y, 1); if (this.flash > 0) s.draw(c, f, x, y, 1, null, 'white');
    if (this.state === 'fly' && this.t % 2 === 0) FX.sparks(this.x, this.y - this.z - 10, this.vx > 0 ? Math.PI : 0, 0.5, 1, 3, pick(['#ffe44d', '#fff']), 8, 1.2);
  }
}

// ============================================================ L4
class Server extends Prop {
  constructor(x, y) { super('server', x, y); this.hw = 12; this.hh = 62; this.hp = this.maxHp = 5; }
  frameName() {
    if (this.dead) return 'srv_dead';
    if (this.hitT > 0) return 'srv_hit';
    return this.hp >= 4 ? 'srv' + (Math.floor(this.t / 7) % 4) : this.hp >= 2 ? 'srv_dmg1' : 'srv_dmg2';
  }
  update() {
    this.tick(); if (this.dead) { if (this.t % 30 === 0) FX.smoke(this.x, this.y - 64, 1, '#6a6a80', 3); return; }
    this.thrownCheck(1);
    // nearly destroyed: the fault alarm plays ~2.5 s once (started in onHit) then fades out; not a loop
    if (this.faultT > 0 && --this.faultT === 0) Snd.loopStop('srv' + this.x, 0.6);
    if (this.hp <= 2 && this.t % 12 === 0) FX.sparks(this.x + rand(-8, 8), this.y - rand(20, 56), rand(6.3), 6.3, 4, 5, pick(['#27f0ff', '#ff2a4d', '#ffe44d']), 12, 1.2);
  }
  onHit(att, mv, dir, dmg) {
    if (this.dead) return;
    this.hp -= dmg || 1; this.flash = 3; this.hitT = 5; this.wob = 8; FX.freeze(3); FX.addShake(2.5); if (this.hp > 0) Snd.sfx.srvHit();
    if (this.hp > 0 && this.hp <= 2 && !this.faultT && !this.faulted) { this.faulted = true; if (Snd.loopStart('srv' + this.x, 'srv_fault', 0.16)) this.faultT = 150; else Snd.sfx.hiss(0.6); }
    FX.sparks(this.x, this.y - 40, dir > 0 ? 0 : Math.PI, 2.2, 10, 6, pick(['#27f0ff', '#ff2a4d', '#ffe44d']), 16, 1.5);
    if (this.hp <= 0) this.destroy(dir);
  }
  destroy(dir) {
    this.dead = true; this.hp = 0; Ach.unlock('emp');
    FX.flashScreen(0.6, '#27f0ff'); FX.addShake(9); FX.freeze(6); FX.slow(20, 0.35); Snd.loopStop('srv' + this.x, 0.15); this.faultT = 0; Snd.sfx.srvCrash();
    for (let i = 0; i < 4; i++) FX.ring(this.x, this.y - 40, 6, 7 + i * 3, 22 + i * 6, ['#27f0ff', '#fff', '#3dffa0', '#ff2fd0'][i], 3);
    FX.debris(this.x, this.y - 40, dir, 16, ['#2a3050', '#27f0ff', '#3dffa0', '#10142a'], 8);
    FX.text('SYSTEM CRASH!', this.x, this.y - 88, { size: 14, color: '#9ff8ff', glow: '#27f0ff', life: 70 });
    for (const e of G.enemies) {                                   // EMP: everybody on screen is stunned
      if (e.dead || e.x < G.camX - 20 || e.x > G.camX + W + 20) continue;
      if (e.boss) { e.poise += 40; if (e.poise >= e.def.poiseMax) { e.poise = 0; G.bossStagger(e); e.takeHit(sgn(e.x - this.x) || 1, { kb: 1, w: 1, stun: 90 }, 10, false, false); } else { e.hp -= 10; e.flash = 4; } continue; }
      if (!e.hittable()) continue;
      const wasHp = e.hp; e.takeHit(sgn(e.x - this.x) || 1, { kb: 1, w: 1, stun: 130, hs: 3, shake: 2 }, 10, false, false);
      e.flash = 6; FX.impact(e.x, e.y - e.z - 30, 1, 2, false); FX.text('STUN', e.x, e.y - e.z - 78, { size: 9, color: '#9ff8ff', glow: '#27f0ff', life: 40 });
      FX.sparks(e.x, e.y - e.z - 34, rand(6.3), 6.3, 12, 6, pick(['#27f0ff', '#fff']), 16, 1.5);
      if (e.hp <= 0) onKill(e, 1, e.x, e.y - 30);
    }
    dropPickup(this.x, this.y, 'tape'); G.addScore(150); G.addStyle(12);
  }
}

class Conveyor extends Prop {
  constructor(x, y, o) { super('conveyor', x, 0, o); this.x0 = x; this.n = (o && o.n) || 5; this.dir = (o && o.dir) || 1; this.x1 = x + this.n * 32; this.floor = true; this.top = 266; }
  breakable() { return false; }
  shadow() { }
  onScreen() { return this.x1 > G.camX - 20 && this.x0 < G.camX + W + 20; }
  update() {
    this.tick(); if (!this.onScreen()) return;
    const carry = f => { if (!f.dead && f.z <= 1 && f.x > this.x0 && f.x < this.x1 && f.state !== 'dash' && f.state !== 'launched' && f.state !== 'dead') f.x += this.dir * 0.85; };
    if (G.player) carry(G.player);
    for (const e of G.enemies) carry(e);
  }
  drawBase(c, camX) {
    const s = this.spr; if (!s) return;
    const f = s.frames['belt' + (Math.floor(G.frame / 3) % 4)].frame, x0 = this.x0 - camX;
    c.save();
    if (this.dir > 0) c.translate(x0, this.top); else { c.translate(x0 + this.n * 32, this.top); c.scale(-1, 1); }
    for (let i = 0; i < this.n; i++) c.drawImage(s.sheet, f.x, f.y, 32, 80, i * 32, 0, 32, 80);
    c.restore();
    const cl = s.frames.capL.frame, cr = s.frames.capR.frame;
    c.drawImage(s.sheet, cl.x, cl.y, 32, 80, x0 - 32, this.top, 32, 80);
    c.drawImage(s.sheet, cr.x, cr.y, 32, 80, x0 + this.n * 32, this.top, 32, 80);
  }
  draw() { }
}

const PROP_TYPES = { bin: Bin, hydrant: Hydrant, cabinet: Cabinet, bumper: Bumper, car: Car, ball: Ball, server: Server, conveyor: Conveyor };
function makeProp(type, x, y, o) { const C = PROP_TYPES[type]; return new C(x, y, o); }

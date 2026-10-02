'use strict';
// ============ shared combat helpers ============
function hitTest(a, mv, dir, b) {
  if (Math.abs(a.y - b.y) > (mv.lane || 18)) return false;
  let lo, hi;
  if (mv.both) { lo = a.x - mv.x1; hi = a.x + mv.x1; }
  else { const p = a.x + dir * mv.x0, q = a.x + dir * mv.x1; lo = Math.min(p, q); hi = Math.max(p, q); }
  if (b.x + b.hw < lo || b.x - b.hw > hi) return false;
  return !(b.z + b.hh < a.z + mv.z0 || b.z > a.z + mv.z1);
}

const HIT_WORDS = ['POW', 'WHAM', 'BAM', 'THWACK', 'CRACK', 'BOOM', 'KRAK'];

// ============ base fighter ============
class Fighter {
  constructor() {
    this.x = 0; this.y = 300; this.z = 0; this.vx = 0; this.vy = 0; this.vz = 0;
    this.facing = 1; this.hw = 9; this.hh = 66; this.hp = 100; this.maxHp = 100;
    this.state = 'idle'; this.t = 0; this.flash = 0; this.shakeT = 0;
    this.sqx = 1; this.sqy = 1; this.rot = 0; this.spin = 0; this.gravMul = 1;
    this.trail = []; this.ghosts = [];
    this.walkPhase = 0; this.lastJ = null; this.alpha = 1;
  }
  get grounded() { return this.z <= 0.01; }
  // integrate motion. returns true on landing frame
  physics() {
    let landed = false;
    if (this.z > 0 || this.vz !== 0) {
      this.vz -= GRAV * this.gravMul;
      this.z += this.vz;
      if (this.z <= 0) { this.z = 0; if (this.vz < 0) landed = true; }
    }
    this.x += this.vx; this.y += this.vy;
    this.sqx += (1 - this.sqx) * 0.2; this.sqy += (1 - this.sqy) * 0.2;
    if (this.flash > 0) this.flash--;
    if (this.shakeT > 0) this.shakeT--;
    return landed;
  }
  worldTip(j, key) {
    const sc = (this.style && this.style.scale) || 1;
    let p;
    if (key === 'hF') p = [j.aF.tx, j.aF.ty]; else if (key === 'hB') p = [j.aB.tx, j.aB.ty];
    else if (key === 'fF') p = [j.lF.tx, j.lF.ty]; else p = [j.lB.tx, j.lB.ty];
    return [this.x + this.facing * p[0] * sc, this.y - this.z - p[1] * sc];
  }
  pushTrail(j, key) {
    this.trail.push(this.worldTip(j, key));
    if (this.trail.length > 6) this.trail.shift();
  }
  drawTrail(c, camX, col) {
    const tr = this.trail;
    if (tr.length < 2) return;
    c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    for (let i = 1; i < tr.length; i++) {
      const k = i / tr.length;
      c.strokeStyle = col; c.globalAlpha = k * 0.85; c.lineWidth = 1 + k * 4;
      c.beginPath(); c.moveTo(tr[i - 1][0] - camX, tr[i - 1][1]); c.lineTo(tr[i][0] - camX, tr[i][1]); c.stroke();
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
  shadow(c, camX) {
    const k = clamp(1 - this.z / 120, 0.3, 1), sc = (this.style && this.style.scale) || 1;
    c.fillStyle = `rgba(6,0,20,${0.42 * k * this.alpha})`;
    c.beginPath(); c.ellipse(Math.round(this.x - camX), Math.round(this.y + 1), 15 * sc * k, 4.5 * sc * k, 0, 0, 6.3); c.fill();
  }
}

// ============ player move tables ============
const MV = {
  // ---- punch chain
  jab:    { name: 'JAB', st: 3, ac: 3, rc: 9, dmg: 6, x0: 0, x1: 34, z0: 24, z1: 68, kb: 2.2, stun: 15, hs: 3, shake: 1.5, w: 1, lunge: 1.6, pw: 'jab', tip: 'hF', sfx: 0.9 },
  cross:  { name: 'CROSS', st: 4, ac: 3, rc: 10, dmg: 8, x0: 0, x1: 37, z0: 24, z1: 68, kb: 3.6, stun: 17, hs: 4, shake: 2.5, w: 1, lunge: 2.2, pw: 'cross', tip: 'hB', sfx: 1.0 },
  elbow:  { name: 'COUDE', st: 6, ac: 4, rc: 18, dmg: 13, x0: -4, x1: 36, z0: 24, z1: 70, kb: 6, lift: 5.5, hs: 8, shake: 6, w: 3, lunge: 2.6, pw: 'elbow', spin: 1, tip: 'hF', fin: true, sfx: 1.2 },
  // ---- kick chain
  teep:   { name: 'TEEP', st: 5, ac: 3, rc: 12, dmg: 8, x0: 0, x1: 40, z0: 16, z1: 58, kb: 6.5, stun: 18, hs: 4, shake: 2.6, w: 2, lunge: 0.6, pw: 'teep', tip: 'fF', sfx: 0.8 },
  round:  { name: 'ROUNDHOUSE', st: 7, ac: 4, rc: 16, dmg: 12, x0: -6, x1: 48, z0: 14, z1: 66, kb: 5.5, lift: 3.4, hs: 6, shake: 5, w: 2, lunge: 2.2, pw: 'round', tip: 'fB', arc: true, sfx: 0.7 },
  head:   { name: 'HEAD KICK', st: 8, ac: 4, rc: 20, dmg: 15, x0: -6, x1: 50, z0: 30, z1: 74, kb: 8, lift: 6.5, hs: 9, shake: 7, w: 3, lunge: 2.2, pw: 'round', tip: 'fB', arc: true, fin: true, sfx: 0.6 },
  // ---- knee chain
  knee:   { name: 'GENOU', st: 4, ac: 3, rc: 12, dmg: 9, x0: 0, x1: 31, z0: 14, z1: 60, kb: 3.2, stun: 20, hs: 4, shake: 3, w: 2, lunge: 2.8, pw: 'knee', tip: 'fF', sfx: 1.1 },
  knee2:  { name: 'GENOU', st: 4, ac: 3, rc: 12, dmg: 11, x0: 0, x1: 33, z0: 14, z1: 60, kb: 4, lift: 3, hs: 5, shake: 3.5, w: 2, lunge: 3, pw: 'knee', tip: 'fF', sfx: 1.1 },
  knee3:  { name: 'DOUBLE GENOU', st: 6, ac: 4, rc: 18, dmg: 14, x0: 0, x1: 37, z0: 12, z1: 66, kb: 6, lift: 6, hs: 8, shake: 6, w: 3, lunge: 4, pw: 'knee', tip: 'fF', fin: true, sfx: 1.2 },
  // ---- crouch
  upper:  { name: 'UPPERCUT', st: 5, ac: 3, rc: 14, dmg: 9, x0: 0, x1: 31, z0: 28, z1: 80, kb: 1.5, lift: 5.6, hs: 5, shake: 3.5, w: 2, lunge: 0.5, pw: 'upper', tip: 'hF', sfx: 1.0 },
  lowk:   { name: 'LOW KICK', st: 6, ac: 4, rc: 16, dmg: 10, x0: -2, x1: 45, z0: 0, z1: 16, kb: 5, lift: 2.8, knock: true, hs: 5, shake: 3.5, w: 2, lunge: 1, pw: 'low', tip: 'fF', sfx: 0.7 },
  rknee:  { name: 'GENOU REMONTANT', st: 5, ac: 4, rc: 16, dmg: 11, x0: 0, x1: 30, z0: 8, z1: 74, kb: 1.5, lift: 8, hs: 6, shake: 4.5, w: 3, lunge: 1.4, pw: 'rknee', tip: 'fF', fin: true, sfx: 1.1 },
  // ---- air
  airp:   { name: 'AIR JAB', st: 2, ac: 6, rc: 8, dmg: 6, x0: 0, x1: 36, z0: 8, z1: 70, kb: 3, stun: 16, hs: 3, shake: 1.8, w: 1, air: true, vxa: 1.6, pw: 'airp', tip: 'hF', sfx: 0.9 },
  airk:   { name: 'DIVE KICK', st: 3, ac: 12, rc: 6, dmg: 11, x0: -2, x1: 36, z0: -6, z1: 46, kb: 4, lift: 2.5, knock: true, hs: 6, shake: 4, w: 2, air: true, vxa: 3.8, vz0: -5.4, pw: 'airk', tip: 'fF', sfx: 0.8 },
  airn:   { name: 'FLYING KNEE', st: 3, ac: 10, rc: 8, dmg: 13, x0: 0, x1: 34, z0: 14, z1: 72, kb: 6, lift: 4.2, hs: 7, shake: 5, w: 3, air: true, vxa: 5.2, vz0: 1.4, pw: 'airknee', tip: 'fF', fin: true, sfx: 1.1 },
  // ---- dash attacks
  rushp:  { name: 'RUSH HOOK', st: 2, ac: 5, rc: 12, dmg: 10, x0: 0, x1: 40, z0: 22, z1: 68, kb: 6.5, lift: 3.2, hs: 6, shake: 4, w: 2, lunge: 5.2, pw: 'rushp', tip: 'hB', sfx: 1.0 },
  rushk:  { name: 'RUSH KICK', st: 3, ac: 6, rc: 14, dmg: 12, x0: -2, x1: 44, z0: 8, z1: 56, kb: 8.5, lift: 4.6, hs: 6, shake: 5, w: 2, lunge: 5.6, pw: 'rushk', tip: 'fF', arc: true, sfx: 0.7 },
  rushn:  { name: 'RUSH KNEE', st: 3, ac: 6, rc: 14, dmg: 14, x0: 0, x1: 38, z0: 10, z1: 68, kb: 7, lift: 6, hs: 8, shake: 6, w: 3, lunge: 6, pw: 'rushn', tip: 'fF', fin: true, sfx: 1.1 }
};
const CHAIN = { punch: [MV.jab, MV.cross, MV.elbow], kick: [MV.teep, MV.round, MV.head], knee: [MV.knee, MV.knee2, MV.knee3] };
const CROUCHATK = { punch: MV.upper, kick: MV.lowk, knee: MV.rknee };
const AIRATK = { punch: MV.airp, kick: MV.airk, knee: MV.airn };
const DASHATK = { punch: MV.rushp, kick: MV.rushk, knee: MV.rushn };

// the hero is drawn PU times bigger: reach, heights and speeds follow so the feel stays the same
(function scaleMoves() {
  const seen = new Set();
  for (const k in MV) {
    const m = MV[k]; if (seen.has(m)) continue; seen.add(m);
    m.x0 *= PU; m.x1 *= PU; m.z0 *= PU; m.z1 *= PU; m.lane = (m.lane || 18) * Math.sqrt(PU);
    if (m.lunge) m.lunge *= 1.12; if (m.vxa) m.vxa *= 1.1; if (m.vz0) m.vz0 *= 1.05;
  }
})();
const DASH_LEN = 13, DASH_SPEED = 8.8 * 1.15, WALK = 1.95 * 1.12, DEPTH = 1.3 * 1.08, JUMP_VZ = 8.6 * 1.06;

// ============ the hero ============
class Player extends Fighter {
  constructor(x, y) {
    super();
    this.x = x; this.y = y; this.style = HERO_STYLE;
    this.hp = this.maxHp = 100; this.meter = 0; this.dashCharges = 3;
    this.hw = Math.round(9 * PU * 0.92); this.hh = HERO_H;
    this.move = null; this.moveT = 0; this.moveHit = false; this.hitSet = new Set();
    this.chainStep = -1; this.chainTimer = 0; this.dashT = 0; this.dashWin = 0; this.dashDX = 1; this.dashDY = 0;
    this.iframes = 0; this.invul = 0; this.cancelBonus = 0; this.airAtk = 0; this.landLag = 0; this.dashCd = 0;
    this.airDash = false; this.dead = false; this.stunT = 0; this.bounced = false; this.specialT = 0; this.lastCancel = 0;
  }
  get crouching() { return this.state === 'crouch'; }
  get hurtHeight() {
    if (this.state === 'crouch') return HERO_CROUCH_H;
    if (this.state === 'dash') return Math.round(44 * PU);
    if (this.state === 'down') return Math.round(12 * PU);
    if (this.state === 'attack' && this.move && this.move.pw === 'low') return Math.round(30 * EU);
    if (this.state === 'attack' && this.move && (this.move.pw === 'upper' || this.move.pw === 'rknee')) return Math.round(50 * PU);
    return HERO_H;
  }
  canBeHit() { return this.invul <= 0 && this.iframes <= 0 && !['down', 'dead', 'special', 'getup'].includes(this.state); }

  update() {
    this.t++;
    if (this.invul > 0) this.invul--;
    if (this.iframes > 0) this.iframes--;
    if (this.cancelBonus > 0) this.cancelBonus--;
    if (this.chainTimer > 0 && --this.chainTimer === 0) this.chainStep = -1;
    if (this.dashWin > 0) this.dashWin--;
    if (this.dashCd > 0) this.dashCd--;
    if (this.dashCharges < 3) this.dashCharges = Math.min(3, this.dashCharges + 1 / 36);
    this.hh = this.hurtHeight;
    if (this.landLag > 0) this.landLag--;

    switch (this.state) {
      case 'idle': case 'walk': case 'crouch': this.groundControl(); break;
      case 'air': this.airControl(); break;
      case 'dash': this.updateDash(); break;
      case 'attack': this.updateAttack(); break;
      case 'special': this.updateSpecial(); break;
      case 'hurt':
        this.vx *= 0.86; this.vy *= 0.86;
        if (--this.stunT <= 0) this.state = 'idle';
        break;
      case 'launched':
        this.rot = lerp(this.rot, -1.0, 0.12); this.vx *= 0.99;
        break;
      case 'down':
        this.vx *= 0.82; this.vy *= 0.82;
        if (--this.stunT <= 0) { if (this.hp <= 0) { this.state = 'dead'; this.t = 0; } else { this.state = 'getup'; this.stunT = 18; this.invul = 70; } }
        break;
      case 'getup':
        if (--this.stunT <= 0) this.state = 'idle';
        break;
      case 'dead': this.vx *= 0.9; break;
    }
    if (this.state !== 'attack' && this.state !== 'dash') this.trail.length = 0;

    const landed = this.physics();
    if (landed) this.onLand();
    // arena bounds
    const b = G.bounds;
    this.x = clamp(this.x, b.minX + 12, b.maxX - 12);
    this.y = clamp(this.y, LANE_MIN, LANE_MAX);
    // ghosts
    for (let i = this.ghosts.length - 1; i >= 0; i--) if (--this.ghosts[i].life <= 0) this.ghosts.splice(i, 1);
  }

  onLand() {
    if (this.state === 'air' || (this.state === 'attack' && this.move && this.move.air)) {
      this.state = 'idle'; this.airAtk = 0; this.landLag = this.move && this.move.air ? 4 : 0; this.move = null;
      this.sqy = 0.78; this.sqx = 1.2; this.vx *= 0.5;
      FX.dust(this.x, this.y, 7); Snd.sfx.land();
      if (this.vz < -7) FX.addShake(1.5);
    } else if (this.state === 'launched') {
      // bounce once, then lie down
      if (this.vz < -5 && !this.bounced) { this.vz = -this.vz * 0.35; this.bounced = true; FX.dust(this.x, this.y, 8); FX.addShake(3); Snd.sfx.land(); return; }
      this.state = 'down'; this.stunT = 42; this.rot = 0; this.bounced = false; this.vz = 0;
      FX.dust(this.x, this.y, 10); FX.addShake(2);
    } else if (this.state === 'dash') { this.state = 'idle'; }
    this.vz = 0;
  }

  facingAssist(ax) {
    if (ax) { this.facing = ax; return; }
    // auto-face the closest enemy in front/behind when attacking without direction
    let best = null, bd = 80;
    for (const e of G.enemies) {
      if (e.dead || e.state === 'down') continue;
      const dx = e.x - this.x, dy = Math.abs(e.y - this.y);
      if (dy < 26 && Math.abs(dx) < bd) { bd = Math.abs(dx); best = e; }
    }
    if (best) this.facing = sgn(best.x - this.x);
  }

  canDash() { return this.dashCharges >= 1 && this.dashCd <= 0; }

  groundControl() {
    const ax = Input.ax(), ay = Input.ay(), crouch = Input.held.crouch;
    if (this.landLag > 0) { this.vx *= 0.5; return; }
    if (Input.peek('special') && this.meter >= 100) { Input.eat('special'); return this.startSpecial(); }
    if (Input.peek('dash') && this.canDash()) { Input.eat('dash'); return this.startDash(ax, ay); }
    if (Input.eat('jump')) return this.jump(ax);
    for (const b of ['punch', 'kick', 'knee']) if (Input.eat(b)) return this.startAttack(b, ax);
    if (crouch) { this.state = 'crouch'; this.vx *= 0.6; this.vy *= 0.6; if (ax) this.facing = ax; }
    else if (ax || ay) {
      this.state = 'walk'; this.vx = ax * WALK; this.vy = ay * DEPTH; if (ax) this.facing = ax;
      this.walkPhase += 0.26;
      if (Math.floor(this.walkPhase * 1.2) % 6 === 0 && this.t % 10 === 0) FX.dust(this.x - this.facing * 4, this.y, 1);
    } else { this.state = 'idle'; this.vx *= 0.55; this.vy *= 0.55; }
  }

  jump(ax, boost) {
    this.vz = boost || JUMP_VZ; this.state = 'air'; this.airAtk = 0; this.vx = ax * WALK * 1.2 + this.vx * 0.3;
    this.sqy = 1.22; this.sqx = 0.85; this.move = null;
    Snd.sfx.jump(); FX.dust(this.x, this.y, 4);
  }

  airControl() {
    const ax = Input.ax(), ay = Input.ay();
    this.vx += (ax * 2.2 - this.vx) * 0.1; this.vy = ay * 1.0;
    if (ax) this.facing = ax;
    if (Input.peek('dash') && this.canDash()) { Input.eat('dash'); return this.startDash(ax, ay); }
    for (const b of ['punch', 'kick', 'knee']) if (Input.peek(b) && this.airAtk < 2) { Input.eat(b); return this.startAttack(b, ax); }
  }

  startDash(ax, ay, cancel) {
    let dx = ax, dy = ay * 0.75;
    if (!ax && !ay) dx = this.facing;
    const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    this.dashCharges -= 1; this.state = 'dash'; this.dashT = 0; this.dashDX = dx; this.dashDY = dy;
    this.iframes = 11; this.dashWin = 24; this.dashCd = 3; this.move = null; this.spin = 0;
    if (ax) this.facing = ax;
    this.airDash = this.z > 2;
    if (this.airDash) { this.vz = 0; this.airAtk = 0; }
    Snd.sfx[this.airDash ? 'airdash' : 'dash']();
    FX.speedLines(this.x, this.y - this.z - 30, sgn(dx), 6);
    if (!this.airDash) FX.dust(this.x, this.y, 8, -sgn(dx));
    FX.ring(this.x, this.y - this.z - 30, 4, 3, 10, '#27f0ff', 1.5);
    this.sqx = 1.25; this.sqy = 0.85;
  }
  updateDash() {
    const t = this.dashT++;
    const sp = DASH_SPEED * (1 - (t / DASH_LEN) * 0.4);
    this.vx = this.dashDX * sp; this.vy = this.dashDY * sp;
    if (this.airDash || this.z > 0) { this.vz = 0; }
    if (t % 2 === 0 && this.lastJ) this.ghosts.push({ j: this.lastJ, frame: this.curFrame, x: this.x, y: this.y - this.z, f: this.facing, life: 10, o: { sx: 1 } });
    if (t % 3 === 0) FX.sparks(this.x, this.y - this.z - 28 + rand(-14, 14), Math.PI * (this.dashDX > 0 ? 1 : 0), 0.6, 1, 3, pick(['#27f0ff', '#ff2fd0']), 10, 1.2);
    // attack out of a dash keeps the momentum
    for (const b of ['punch', 'kick', 'knee']) if (Input.peek(b)) { Input.eat(b); return this.startAttack(b, this.dashDX > 0 ? 1 : this.dashDX < 0 ? -1 : 0); }
    if (Input.peek('jump') && !this.airDash && this.z <= 0 && t > 3) { Input.eat('jump'); this.cancelBonus = 20; return this.jump(sgn(this.dashDX) * (Math.abs(this.dashDX) > 0.3 ? 1 : 0), 9 * 1.06); }
    if (t >= DASH_LEN) {
      this.vx *= 0.3; this.vy *= 0.3;
      this.state = this.z > 1 ? 'air' : 'idle';
      if (this.state === 'air') this.vz = -0.5;
    }
  }

  startAttack(btn, ax) {
    const air = this.z > 2;
    let mv, chained = false;
    if (air) mv = AIRATK[btn];
    else if (this.dashWin > 0) mv = DASHATK[btn];
    else if (Input.held.crouch) mv = CROUCHATK[btn];
    else {
      let step = (this.chainTimer > 0 || this.state === 'attack') ? this.chainStep + 1 : 0;
      if (step > 2) step = 0;
      this.chainStep = step; chained = step > 0;
      mv = CHAIN[btn][step];
    }
    if (mv.air || air) this.airAtk++;
    this.facingAssist(ax);
    this.state = 'attack'; this.move = mv; this.moveT = 0; this.moveHit = false; this.hitSet.clear();
    this.trail.length = 0;
    if (mv.air) { if (mv.vz0 !== undefined) this.vz = mv.vz0; this.vx = this.facing * mv.vxa; }
    this.chainTimer = 0;
    if (mv.pw === 'low' || mv.pw === 'upper' || mv.pw === 'rknee') this.sqy = 0.95;
    Snd.sfx.swing(mv.sfx || 1);
    if (!mv.fin && Math.random() < 0.35) Snd.sfx.cry('atk', G.hero);   // a short effort breath on some strikes
    this.dashWin = 0;
  }

  updateAttack() {
    const mv = this.move, t = ++this.moveT, rs = mv.st + mv.ac, total = rs + mv.rc;
    if (mv.air) {
      this.vx += (this.facing * mv.vxa * (t < rs ? 1 : 0.3) - this.vx) * 0.15;
    } else if (t <= rs) this.vx = this.facing * (mv.lunge || 0) * (t > mv.st ? 0.6 : 1);
    else this.vx *= 0.7;
    if (!mv.air) this.vy *= 0.6;
    if (mv.air && t > rs && this.vz > 0) this.vz *= 0.8;
    // active frames: hit detection
    if (t >= mv.st && t < rs) {
      this.pushTrail(this.lastJ || computeJoints(POSES.stance), mv.tip);
      for (const e of G.enemies) {
        if (this.hitSet.has(e) || !e.hittable()) continue;
        if (hitTest(this, mv, this.facing, e)) { this.hitSet.add(e); this.connect(e, mv); }
      }
      for (const pr of G.props) {           // level props: bins, hydrants, cabinets, bumpers, cars, balls, servers
        if (this.hitSet.has(pr) || !pr.breakable()) continue;
        if (hitTest(this, mv, this.facing, pr.hurtbox())) { this.hitSet.add(pr); this.moveHit = true; this.gain(2, 3); pr.onHit(this, mv, this.facing, mv.w >= 3 ? 2 : 1); }
      }
      for (const pr of G.projs) {
        if (pr.team === 'enemy' && pr.deflectable && !this.hitSet.has(pr) && Math.abs(pr.y - this.y) < 22 && Math.abs(pr.x - (this.x + this.facing * mv.x1 * 0.5)) < mv.x1 * 0.7 && pr.z + 10 > this.z + mv.z0 && pr.z - 10 < this.z + mv.z1) {
          this.hitSet.add(pr); pr.deflect(this.facing, this); FX.freeze(4); FX.addShake(2.5); Snd.sfx.hit(2);
          this.moveHit = true; this.gain(6, 4);
        }
      }
    } else if (this.trail.length) this.trail.shift();
    // ----- cancel system -----
    const window = t >= mv.st && (this.moveHit || t >= rs + mv.rc * 0.45);
    if (window) {
      if (Input.peek('dash') && this.canDash()) { Input.eat('dash'); this.cancelInto('dash'); return; }
      if (Input.peek('jump') && !mv.air && this.grounded) { Input.eat('jump'); this.cancelInto('jump'); return; }
    }
    // ----- chain (link on hit, or once recovery is done) -----
    if (!mv.air && t >= rs && (this.moveHit || t >= total - 3) && this.chainStep < 2) {
      for (const b of ['punch', 'kick', 'knee']) if (Input.peek(b) && !Input.held.crouch) { Input.eat(b); this.chainTimer = 1; return this.startAttack(b, Input.ax()); }
    }
    if (t >= total) {
      if (mv.air) { this.state = 'air'; this.move = null; return; }
      this.state = 'idle'; this.move = null;
      this.chainTimer = this.chainStep < 2 ? 16 : 0; if (this.chainStep >= 2) this.chainStep = -1;
    }
  }

  cancelInto(what) {
    const ax = Input.ax(), ay = Input.ay();
    const hit = this.moveHit;
    this.cancelBonus = 26; this.chainTimer = 44; this.move = null;
    this.gain(3, 6);
    if (hit) this.dashCharges = Math.min(3, this.dashCharges + 0.5);
    FX.text('CANCEL', this.x, this.y - this.z - 78, { color: '#27f0ff', size: 9, glow: '#27f0ff', life: 32 });
    FX.ring(this.x, this.y - this.z - 30, 3, 3.5, 12, '#fff', 1.5);
    Snd.sfx.cancel();
    G.combo.cancels++; if (G.combo.cancels === 10) Ach.unlock('cancel10');
    if (what === 'dash') { this.canceledDash = true; this.startDash(ax, ay, true); }
    else { this.jump(ax, 9.2 * 1.06); this.airAtk = 0; }
  }

  gain(meter, style) { this.meter = Math.min(100, this.meter + meter); G.addStyle(style || 0); }

  // player hits an enemy
  connect(e, mv) {
    this.moveHit = true;
    let dmg = mv.dmg;
    if (this.cancelBonus > 0) dmg *= 1.25;
    const counter = e.isWinding();
    const crit = !!mv.fin || counter;
    if (mv.fin) Snd.sfx.cry('kiai', G.hero);   // finisher: the hero shouts
    if (crit) dmg *= 1.4;
    if (e.juggle > 0) dmg *= Math.max(0.55, 1 - e.juggle * 0.08);
    dmg = Math.round(dmg);
    G.registerHit(this, e, mv, dmg, crit, counter);
  }

  // ----- special: Muay Thai fury -----
  startSpecial() {
    Ach.unlock('fury'); Snd.sfx.cry('fury', G.hero);
    this.meter = 0; this.state = 'special'; this.specialT = 0; this.invul = 200; this.vx = 0; this.move = null;
    Snd.sfx.special(); FX.flashScreen(0.6, '#ff2fd0'); FX.freeze(10); FX.addShake(5); FX.punch(0.12, this.x - G.camX, this.y - 40);
    FX.text('MUAY THAI FURY!', this.x, this.y - 92, { color: '#ffe44d', size: 16, glow: '#ff2fd0', life: 70 });
    FX.ring(this.x, this.y - 30, 4, 6, 24, '#ffe44d', 4);
  }
  updateSpecial() {
    const t = ++this.specialT;
    this.vx = 0; this.vy = 0;
    if (t > 20 && t < 76) {
      if (t % 8 === 4) {
        this.hitSet.clear();
        const pm = { x0: 0, x1: 76 * PU, both: true, lane: 40, z0: -10, z1: 90 * PU, dmg: 7, kb: 4.5, stun: 22, hs: 2, shake: 3, w: 2, lift: 0, name: 'FURY' };
        this.furyBlast(pm);
        FX.ring(this.x, this.y - 30, 6, 5, 14, pick(['#27f0ff', '#ff2fd0', '#ffe44d']), 3);
        Snd.sfx.hit(2);
      }
      if (t % 3 === 0) FX.sparks(this.x, this.y - 32, rand(6.3), 6.3, 3, 6, null, 12, 1.5);
    }
    if (t === 80) {
      this.hitSet.clear();
      this.furyBlast({ x0: 0, x1: 120 * PU, both: true, lane: 60, z0: -10, z1: 120 * PU, dmg: 16, kb: 10, lift: 8, hs: 10, shake: 10, w: 4, fin: true, name: 'FURY' });
      FX.explosion(this.x, this.y - 30, 1.4); FX.flashScreen(0.8, '#fff'); FX.addShake(14); FX.slow(24, 0.3); FX.punch(0.16, this.x - G.camX, this.y - 30);
      FX.ring(this.x, this.y, 5, 9, 30, '#fff', 5); Snd.sfx.boom();
      Input.rumble(1, 1, 300);
    }
    if (t >= 96) { this.state = 'idle'; this.invul = 20; }
  }
  furyBlast(pm) {
    for (const pr of G.props) {
      if (!pr.breakable() || this.hitSet.has(pr) || Math.abs(pr.x - this.x) > pm.x1 || Math.abs(pr.y - this.y) > pm.lane) continue;
      this.hitSet.add(pr); pr.onHit(this, pm, sgn(pr.x - this.x) || 1, 2);
    }
    for (const e of G.enemies) {
      if (!e.hittable() || this.hitSet.has(e)) continue;
      if (hitTest(this, pm, this.facing, e)) { this.hitSet.add(e); e.facing = -sgn(e.x - this.x) || 1; G.registerHit(this, e, Object.assign({ dir: sgn(e.x - this.x) }, pm), Math.round(pm.dmg * (pm.fin ? 1.2 : 1)), !!pm.fin, false); }
    }
  }

  // ----- receive damage -----
  hurtBy(dmg, dir, kb, lift, src) {
    if (!this.canBeHit()) return false;
    dmg = Math.round(dmg * (G.dmgMul || 1));
    this.hp -= dmg; this.flash = 5; this.invul = 34; this.move = null; this.chainStep = -1; this.chainTimer = 0;
    this.spin = 0; this.trail.length = 0; this.cancelBonus = 0;
    G.combo.count = 0; G.combo.timer = 0; G.styleHurt();
    this.vx = dir * kb; this.vy = 0;
    this.facing = -dir || this.facing;
    Snd.sfx.cry(this.hp <= 0 ? 'ko' : 'hurt', G.hero);
    if (this.hp <= 0) { this.hp = 0; this.vz = 7; this.state = 'launched'; this.bounced = false; this.vx = dir * 6; this.dead = true; this.invul = 9999; }
    else if (lift > 0 || this.z > 1) { this.vz = Math.max(lift, 3.5); this.state = 'launched'; this.bounced = false; this.invul = 60; }
    else { this.state = 'hurt'; this.stunT = 16; }
    return true;
  }

  // ----- rendering -----
  getPose() {
    const t = this.t;
    switch (this.state) {
      case 'idle': return idlePose(t);
      case 'walk': return walkPose(this.walkPhase);
      case 'crouch': return idlePose(t, POSES.crouch);
      case 'air': return lerpPose(POSES.jumpUp, POSES.jumpFall, clamp((-this.vz + 3) / 9, 0, 1));
      case 'dash': return this.airDash ? POSES.airdash : POSES.dash;
      case 'attack': return this.attackPose();
      case 'special': {
        const p = Object.assign({}, POSES.spin_s); const k = clamp(this.specialT / 18, 0, 1);
        return lerpPose(POSES.stance, p, easeOut(k));
      }
      case 'hurt': return (this.stunT > 8 ? POSES.hurt2 : POSES.hurt);
      case 'launched': return POSES.tumble;
      case 'down': return this.stunT > 34 ? lerpPose(POSES.tumble, POSES.down, 0.8) : POSES.down;
      case 'getup': return lerpPose(POSES.down, POSES.getup, 1 - this.stunT / 18);
      case 'dead': return POSES.down;
    }
    return POSES.stance;
  }
  attackPose() {
    const mv = this.move, t = this.moveT, rs = mv.st + mv.ac;
    const base = mv.air ? POSES.jumpFall : (mv.pw === 'low' || mv.pw === 'upper' || mv.pw === 'rknee') ? POSES.crouch : POSES.stance;
    const wp = POSES[mv.pw + '_w'] || base, sp = POSES[mv.pw + '_s'];
    if (t < mv.st) return lerpPose(base, wp, easeOut(t / Math.max(1, mv.st)));
    if (t < rs) return lerpPose(wp, sp, easeOut(clamp((t - mv.st + 1) / Math.max(1, Math.min(mv.ac, 2)), 0, 1)));
    return lerpPose(sp, base, easeInOut(clamp((t - rs) / (mv.rc * 0.9), 0, 1)));
  }
  draw(c, camX) {
    const j = computeJoints(this.getPose()); this.lastJ = j;
    const o = { t: this.t, sqx: this.sqx, sqy: this.sqy, hurt: this.flash > 0, rot: 0 };
    if (this.state === 'launched') o.rot = this.rot;
    if (!HeroSprites.ready && this.state === 'attack' && this.move && this.move.spin) {
      const p = clamp(this.moveT / (this.move.st + this.move.ac + 2), 0, 1);
      o.sx = Math.cos(p * Math.PI * 2 * this.move.spin);
      if (Math.abs(o.sx) < 0.18) o.sx = 0.18 * (o.sx < 0 ? -1 : 1);
    }
    if (!HeroSprites.ready && this.state === 'special') {
      o.sx = Math.cos(this.specialT * 0.75); if (Math.abs(o.sx) < 0.18) o.sx = 0.18;
    }
    // afterimages
    const spr = HeroSprites.ready;
    if (spr) this.curFrame = HeroSprites.frameFor(this);
    c.globalCompositeOperation = 'lighter';
    this.ghosts.forEach((g, i) => {
      c.globalAlpha = g.life / 14;
      if (spr && g.frame) HeroSprites.draw(c, g.frame, g.x - camX, g.y, g.f, {}, i % 2 ? 'pink' : 'cyan');
      else Rig.draw(c, g.j, HERO_STYLE, g.x - camX, g.y, g.f, { flat: i % 2 ? '#ff2fd0' : '#27f0ff', sx: 1 });
    });
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    if (this.invul > 0 && this.state !== 'launched' && this.state !== 'down' && this.state !== 'special' && (this.t % 4 < 2) && !this.dead) c.globalAlpha = 0.55;
    const shx = this.shakeT > 0 ? rand(-1.5, 1.5) : 0;
    if (spr) {
      HeroSprites.draw(c, this.curFrame, this.x - camX + shx, this.y - this.z, this.facing, o);
      if (this.flash > 0) HeroSprites.draw(c, this.curFrame, this.x - camX + shx, this.y - this.z, this.facing, o, 'white');
    } else {
      Rig.draw(c, j, HERO_STYLE, this.x - camX + shx, this.y - this.z, this.facing, o);
      if (this.flash > 0) Rig.draw(c, j, HERO_STYLE, this.x - camX + shx, this.y - this.z, this.facing, Object.assign({}, o, { flat: '#fff' }));
    }
    c.globalAlpha = 1;
    this.drawTrail(c, camX, this.cancelBonus > 0 ? '#27f0ff' : '#ff9ae9');
    if (this.cancelBonus > 0 && this.t % 3 === 0) FX.sparks(this.x, this.y - this.z - 30, rand(6.3), 6.3, 1, 3, '#27f0ff', 8, 1);
    if (this.state === 'special') {
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5 + 0.3 * Math.sin(this.t);
      c.fillStyle = '#ff2fd0'; c.beginPath(); c.ellipse(this.x - camX, this.y - this.z - 30, 24 + this.specialT * 0.3, 40, 0, 0, 6.3); c.fill();
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    }
  }
}


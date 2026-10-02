'use strict';
// ============ enemy archetypes ============
// attack fields: range(start distance), st/ac/rc frames, hitbox (x0,x1,z0,z1,lane,both), dmg, kb, lift, pw (pose prefix)
// type: melee (default) | dash | leap | proj | wave | beam | summon | tp
const KINDS = {
  grunt: {
    hp: 36, spd: 1.15, hw: 10, score: 100, engage: 30, coolMin: 30, coolMax: 90, drop: 0.12,
    attacks: [
      { id: 'jab', wt: 6, range: 36, st: 20, ac: 4, rc: 22, dmg: 7, x0: 0, x1: 40, z0: 38, z1: 68, kb: 3, hs: 3, shake: 2, pw: 'jab', lunge: 1.8 },
      { id: 'low', wt: 4, range: 40, st: 24, ac: 4, rc: 26, dmg: 8, x0: 0, x1: 44, z0: 0, z1: 14, kb: 4, lift: 2.6, hs: 3, shake: 2.5, pw: 'low', lunge: 1.2 }
    ]
  },
  heavy: {
    hp: 84, spd: 0.85, hw: 12, scale: 1.22, score: 250, armor: true, engage: 40, coolMin: 40, coolMax: 100, drop: 0.35,
    attacks: [
      { id: 'hay', wt: 6, range: 48, st: 36, ac: 6, rc: 36, dmg: 15, x0: 0, x1: 54, z0: 20, z1: 76, kb: 7, lift: 4.2, hs: 6, shake: 5, pw: 'hay', lunge: 3, warn: true, armorAtk: true },
      { id: 'slam', wt: 4, range: 44, st: 42, ac: 4, rc: 44, dmg: 12, both: true, x1: 60, z0: 0, z1: 16, lane: 26, kb: 6, lift: 3.6, hs: 5, shake: 6, pw: 'slam', warn: true, armorAtk: true, quake: true }
    ]
  },
  fast: {
    hp: 26, spd: 1.9, hw: 9, score: 150, engage: 34, coolMin: 24, coolMax: 60, drop: 0.14,
    attacks: [
      { id: 'flykick', wt: 5, type: 'dash', minR: 80, range: 250, st: 16, ac: 24, rc: 34, dmg: 9, x0: 0, x1: 30, z0: 10, z1: 60, kb: 6, lift: 3, hs: 4, shake: 3, pw: 'flykick', speed: 7.4, lane: 14 },
      { id: 'jab2', wt: 5, range: 36, st: 11, ac: 3, rc: 16, dmg: 5, x0: 0, x1: 38, z0: 38, z1: 68, kb: 2.5, hs: 2, shake: 1.5, pw: 'jab', lunge: 2.2 },
      { id: 'spin', wt: 3, range: 40, st: 16, ac: 7, rc: 30, dmg: 8, both: true, x1: 42, z0: 6, z1: 54, kb: 6, lift: 2.8, hs: 4, shake: 3, pw: 'spin', spin: 1 }
    ]
  },
  thrower: {
    hp: 24, spd: 1.35, hw: 9, score: 150, keepDist: 175, coolMin: 60, coolMax: 110, drop: 0.2,
    attacks: [
      { id: 'throw', wt: 1, type: 'proj', minR: 90, range: 330, st: 26, ac: 2, rc: 32, pw: 'throw', shots: [{ kind: 'disc', dmg: 8, vx: 4.4, z: 44 }] },
      { id: 'jab', wt: 1, range: 34, st: 20, ac: 4, rc: 22, dmg: 6, x0: 0, x1: 38, z0: 38, z1: 68, kb: 3, hs: 3, shake: 2, pw: 'jab', lunge: 1.5 }
    ]
  },
  rusher: {
    hp: 30, spd: 1.5, hw: 10, score: 180, engage: 130, coolMin: 50, coolMax: 110, drop: 0.14,
    attacks: [
      { id: 'charge', wt: 1, type: 'dash', minR: 120, range: 360, st: 28, ac: 62, rc: 56, dmg: 11, x0: 0, x1: 30, z0: 0, z1: 44, kb: 8, lift: 4, hs: 5, shake: 4, pw: 'charge', speed: 8.2, lane: 14, warn: true, ground: true },
      { id: 'kick', wt: 1, range: 38, st: 22, ac: 4, rc: 26, dmg: 7, x0: 0, x1: 42, z0: 0, z1: 16, kb: 4, lift: 2.4, hs: 3, shake: 2, pw: 'low', lunge: 1.2 }
    ]
  },
  // ---------------- bosses ----------------
  boss1: {
    boss: true, hp: 430, spd: 0.95, hw: 15, scale: 1.55, score: 2000, poiseMax: 55, engage: 46, phases: [0.5],
    attacks: [
      { id: 'hay', wt: 5, range: 66, st: 30, ac: 7, rc: 30, dmg: 15, x0: 0, x1: 70, z0: 20, z1: 100, kb: 8, lift: 4.5, hs: 7, shake: 6, pw: 'hay', lunge: 3.4, warn: true, lane: 22 },
      { id: 'slam', wt: 4, range: 70, st: 40, ac: 4, rc: 40, dmg: 13, both: true, x1: 96, z0: 0, z1: 20, lane: 30, kb: 7, lift: 4, hs: 7, shake: 9, pw: 'slam', warn: true, quake: true },
      { id: 'quake', wt: 4, type: 'wave', minR: 90, range: 340, st: 36, ac: 2, rc: 44, pw: 'slam', warn: true, shots: [{ kind: 'wave', dmg: 11, vx: 3.4, z: 0 }] },
      { id: 'sonic', wt: 4, type: 'proj', minR: 100, range: 340, st: 30, ac: 2, rc: 36, pw: 'throw', warn: true, shots: [{ kind: 'sonic', dmg: 10, vx: 3.6, z: 40 }] },
      { id: 'summon', wt: 3, type: 'summon', phase: 1, cd: 640, st: 40, ac: 1, rc: 30, pw: 'arms_up', minions: ['grunt', 'grunt'], warn: true }
    ]
  },
  boss2: {
    boss: true, hp: 470, spd: 1.55, hw: 11, scale: 1.18, score: 2500, poiseMax: 42, engage: 40, phases: [0.5],
    attacks: [
      { id: 'dashstrike', wt: 5, type: 'dash', minR: 90, range: 320, st: 14, ac: 22, rc: 30, dmg: 11, x0: 0, x1: 34, z0: 8, z1: 66, kb: 7, lift: 3.6, hs: 6, shake: 5, pw: 'flykick', speed: 10.5, lane: 16, warn: true },
      { id: 'spin', wt: 4, range: 48, st: 14, ac: 9, rc: 26, dmg: 10, both: true, x1: 50, z0: 4, z1: 60, kb: 7, lift: 3.4, hs: 5, shake: 4, pw: 'spin', spin: 1.5, lane: 22 },
      { id: 'rings', wt: 4, type: 'proj', minR: 100, range: 360, st: 24, ac: 2, rc: 34, pw: 'point', warn: true, shots: [{ kind: 'ring', dmg: 8, vx: 3.9, z: 38, vy: -0.7 }, { kind: 'ring', dmg: 8, vx: 4.1, z: 38, vy: 0 }, { kind: 'ring', dmg: 8, vx: 3.9, z: 38, vy: 0.7 }] },
      { id: 'dive', wt: 4, type: 'leap', phase: 1, minR: 90, range: 320, st: 20, ac: 90, rc: 36, dmg: 13, both: true, x1: 60, z0: 0, z1: 40, lane: 26, kb: 7, lift: 4.6, hs: 7, shake: 8, pw: 'slam', vz: 10.5, warn: true },
      { id: 'jab', wt: 3, range: 40, st: 12, ac: 4, rc: 16, dmg: 6, x0: 0, x1: 44, z0: 38, z1: 70, kb: 3, hs: 3, shake: 2, pw: 'jab', lunge: 2.5 },
      { id: 'summon', wt: 2, type: 'summon', phase: 1, cd: 700, st: 34, ac: 1, rc: 26, pw: 'arms_up', minions: ['fast', 'fast'], warn: true }
    ]
  },
  boss3: {
    boss: true, hp: 560, spd: 1.2, hw: 13, scale: 1.3, score: 3000, poiseMax: 50, engage: 44, phases: [0.66, 0.33],
    attacks: [
      { id: 'slide', wt: 5, type: 'dash', minR: 110, range: 340, st: 24, ac: 30, rc: 44, dmg: 12, x0: 0, x1: 44, z0: 0, z1: 14, kb: 7, lift: 3.8, hs: 6, shake: 6, pw: 'charge', speed: 9.4, lane: 18, warn: true, ground: true },
      { id: 'upper', wt: 5, range: 56, st: 22, ac: 5, rc: 26, dmg: 14, x0: 0, x1: 58, z0: 10, z1: 96, kb: 5, lift: 6.5, hs: 7, shake: 6, pw: 'hay', lunge: 3, warn: true, lane: 20 },
      { id: 'flurry', wt: 4, range: 52, st: 14, ac: 14, rc: 30, dmg: 7, x0: 0, x1: 52, z0: 30, z1: 90, kb: 3, stun: 10, hs: 3, shake: 3, pw: 'jab', lunge: 3.2, rehit: 5, lane: 18 },
      { id: 'case', wt: 4, type: 'proj', minR: 100, range: 340, st: 30, ac: 2, rc: 34, pw: 'throw', warn: true, shots: [{ kind: 'case', dmg: 11, vx: 5, z: 40 }] },
      { id: 'guards', wt: 2, type: 'summon', phase: 1, cd: 760, st: 40, ac: 1, rc: 30, pw: 'arms_up', minions: ['grunt', 'heavy'], warn: true },
      { id: 'blink', wt: 3, type: 'tp', phase: 2, minR: 90, range: 340, st: 26, ac: 6, rc: 30, dmg: 13, x0: 0, x1: 58, z0: 20, z1: 96, kb: 8, lift: 4.6, hs: 7, shake: 7, pw: 'hay', lane: 22, warn: true }
    ]
  },
  boss4: {
    boss: true, hp: 800, spd: 1.25, hw: 15, scale: 1.45, score: 6000, poiseMax: 60, engage: 50, phases: [0.66, 0.33],
    attacks: [
      { id: 'beam', wt: 5, type: 'beam', minR: 0, range: 700, st: 46, ac: 1, rc: 40, pw: 'point', warn: true, dmg: 14 },
      { id: 'smash', wt: 4, range: 76, st: 30, ac: 6, rc: 32, dmg: 16, both: true, x1: 90, z0: 0, z1: 96, lane: 28, kb: 9, lift: 5, hs: 8, shake: 10, pw: 'slam', warn: true, quake: true },
      { id: 'bolts', wt: 4, type: 'proj', minR: 100, range: 380, st: 26, ac: 2, rc: 34, pw: 'throw', warn: true, shots: [{ kind: 'bolt', dmg: 9, vx: 5.2, z: 40, vy: -0.5 }, { kind: 'bolt', dmg: 9, vx: 5.2, z: 40, vy: 0 }, { kind: 'bolt', dmg: 9, vx: 5.2, z: 40, vy: 0.5 }] },
      { id: 'blink', wt: 4, type: 'tp', minR: 80, range: 380, st: 24, ac: 6, rc: 30, dmg: 14, x0: 0, x1: 66, z0: 16, z1: 100, kb: 8, lift: 4.6, hs: 8, shake: 8, pw: 'hay', lane: 22, warn: true },
      { id: 'leap', wt: 3, type: 'leap', phase: 1, minR: 90, range: 340, st: 22, ac: 90, rc: 38, dmg: 15, both: true, x1: 74, z0: 0, z1: 44, lane: 30, kb: 8, lift: 5, hs: 8, shake: 10, pw: 'slam', vz: 11, warn: true },
      { id: 'drones', wt: 2, type: 'summon', phase: 1, cd: 720, st: 40, ac: 1, rc: 30, pw: 'arms_up', minions: ['thrower', 'thrower', 'rusher'], warn: true }
    ]
  }
};

// the enemies are drawn EU times bigger (see util.js): reach, heights, engage distances and speeds follow
(function scaleKinds() {
  for (const key in KINDS) {
    const d = KINDS[key];
    d.spd *= 1.08; d.hw = (d.hw || 10) * EU; if (d.engage) d.engage *= EU;
    for (const a of d.attacks) {
      for (const f of ['x0', 'x1', 'z0', 'z1']) if (a[f] !== undefined) a[f] *= EU;
      if (a.lane) a.lane *= Math.sqrt(EU);
      if (!a.type || a.type === 'melee') a.range *= EU;
      if (a.lunge) a.lunge *= 1.1; if (a.speed) a.speed *= 1.1;
      if (a.shots) for (const s of a.shots) if (s.z) s.z *= EU;
    }
  }
})();

// ============ enemy ============
let ENEMY_ID = 0;
class Enemy extends Fighter {
  constructor(kind, look, x, y) {
    super();
    const d = this.def = KINDS[kind];
    this.kind = kind; this.id = ++ENEMY_ID; this.boss = !!d.boss;
    this.name = look.name; this.sprKey = look.key;
    this.style = Object.assign({}, look.style, { scale: (d.scale || 1) * EU });
    const hpMul = G.hpMul || 1;
    this.hp = this.maxHp = Math.round(d.hp * hpMul);
    this.hw = (d.hw || 10); this.hh = 66 * (d.scale || 1) * EU;
    this.x = x; this.y = y; this.facing = x < G.camX + W / 2 ? 1 : -1;
    this.state = 'move'; this.stT = 0; this.cool = randi(20, 50);
    this.attacker = false; this.entered = false; this.atk = null; this.atkHit = false; this.dodged = false;
    this.poise = 0; this.phase = 0; this.juggle = 0; this.dead = false; this.stunT = 0; this.bounced = false;
    this.acd = {}; this.beams = []; this.invulT = 0;
    this.moving = false; this.flip = Math.random() < 0.5 ? 1 : -1; this.sway = rand(6);
    this.score = d.score || 100;
  }
  get spdMul() { return 1 + this.phase * 0.14; }
  isWinding() { return this.state === 'windup'; }
  hittable() { return !this.dead && this.state !== 'down' && this.state !== 'dead' && this.invulT <= 0 && !(this.state === 'getup' && this.stT < 8) && this.alpha > 0.6; }
  setState(s, n) { this.state = s; this.stT = 0; if (n !== undefined) this.stunT = n; }
  release() {
    if (this.attacker) { this.attacker = false; G.tokens = Math.max(0, G.tokens - 1); }
    const d = this.def;
    this.cool = randi(d.coolMin || 30, d.coolMax || 80) * (this.boss ? 0.5 : 1) * (1 - G.level * 0.09) / (this.spdMul);
  }

  update() {
    this.t++; this.stT++;
    if (this.invulT > 0) this.invulT--;
    switch (this.state) {
      case 'move': this.aiMove(); break;
      case 'windup': this.updWindup(); break;
      case 'attack': this.updAttack(); break;
      case 'recover':
        this.vx *= 0.8; this.vy *= 0.8;
        if (this.stT >= this.atk.rc) { this.setState('move'); this.release(); }
        break;
      case 'hurt':
        this.vx *= 0.86; this.vy *= 0.86;
        if (this.stT >= this.stunT) { this.setState('move'); this.release(); this.cool = Math.min(this.cool, 30); }
        break;
      case 'launched': this.rot = lerp(this.rot, -1.1, 0.1); this.vx *= 0.995; this.wallSplat(); break;
      case 'down':
        this.vx *= 0.8; this.vy *= 0.8;
        if (this.stT >= this.stunT) { this.setState('getup'); this.juggle = 0; }
        break;
      case 'getup':
        if (this.stT >= 20) { this.setState('move'); this.release(); this.invulT = 0; }
        break;
      case 'dead':
        this.vx *= 0.85;
        if (this.stT > 44) this.alpha = (this.stT % 4 < 2) ? 0.2 : 0.9;
        if (this.stT > 84) this.remove = true;
        break;
    }
    if (this.state !== 'attack' && this.state !== 'windup') this.trail.length = 0;
    const landed = this.physics();
    if (landed) this.onLand();
    // keep inside the arena once we walked in
    const b = G.bounds;
    if (!this.entered) {
      if (this.x > G.camX + 24 && this.x < G.camX + W - 24) this.entered = true;
    } else if (this.state !== 'dead') this.x = clamp(this.x, b.minX + 12, b.maxX - 12);
    this.y = clamp(this.y, LANE_MIN, LANE_MAX);
    // soft separation between enemies
    if (this.state === 'move') for (const o of G.enemies) {
      if (o === this || o.state !== 'move') continue;
      const dx = this.x - o.x, dy = this.y - o.y;
      if (Math.abs(dx) < 16 && Math.abs(dy) < 9) { this.x += (dx >= 0 ? 0.5 : -0.5); this.y += (dy >= 0 ? 0.3 : -0.3); }
    }
  }

  onLand() {
    if (this.state === 'launched') {
      if (this.vz < -6 && !this.bounced) {
        this.vz = -this.vz * 0.3; this.bounced = true; FX.dust(this.x, this.y, 8); FX.addShake(this.dead ? 5 : 3); Snd.sfx.land();
        FX.ring(this.x, this.y, 3, 2.5, 10, '#9a90b8', 1.5); return;
      }
      this.bounced = false; this.vz = 0; FX.dust(this.x, this.y, 8);
      if (this.dead) { this.setState('dead'); }
      else this.setState('down', this.boss ? 46 : 52);
    } else if (this.state === 'attack' && this.atk && this.atk.type === 'leap') {
      this.vz = 0; this.vx = 0; this.vy = 0;
      this.leapImpact();
    }
    this.vz = 0;
  }
  wallSplat() {
    const b = G.bounds;
    if (!this.entered) return;
    if ((this.x < b.minX + 8 && this.vx < -2.5) || (this.x > b.maxX - 8 && this.vx > 2.5)) {
      const dmg = this.dead ? 0 : 4;
      this.vx *= -0.35; this.x = clamp(this.x, b.minX + 9, b.maxX - 9);
      if (dmg) { this.hp -= dmg; G.floatDmg(this, dmg, false); if (this.hp <= 0) this.dead = true; }
      FX.addShake(4); FX.freeze(4); FX.sparks(this.x, this.y - this.z - 30, this.vx > 0 ? 0 : Math.PI, 2.2, 10, 6, null, 16);
      FX.text('SPLAT', this.x, this.y - this.z - 60, { color: '#ffe44d', size: 9, life: 30 });
      Snd.sfx.hit(2);
    }
  }

  // ---------------- AI ----------------
  aiMove() {
    const p = G.player, d = this.def, spd = d.spd * this.spdMul;
    this.moving = false;
    if (!this.entered) {
      const tx = clamp(this.x, G.camX + 34, G.camX + W - 34);
      const dir = sgn(tx - this.x);
      this.vx = dir * spd * 1.6; this.vy = 0; this.moving = true; this.facing = dir || this.facing;
      if (Math.abs(this.x - tx) < 3) this.entered = true;
      return;
    }
    if (!p || p.dead) { this.vx *= 0.8; this.vy *= 0.8; return; }
    const dx = p.x - this.x, dy = p.y - this.y, adx = Math.abs(dx), ady = Math.abs(dy);
    this.facing = dx >= 0 ? 1 : -1;
    if (this.cool > 0) this.cool--;
    // thrower style: keep distance
    if (d.keepDist) return this.aiRanged(p, dx, dy, adx, ady, spd);
    if (!this.attacker && this.cool <= 0 && (this.boss || G.tokenFree())) { this.attacker = true; G.tokens++; }
    if (this.attacker) {
      const a = this.pickAttack(adx, ady);
      if (a) return this.startAttack(a);
      const want = d.engage || 34;
      const dirx = adx > want ? sgn(dx) : (adx < want * 0.5 ? -sgn(dx) * 0.4 : 0);
      this.vx = dirx * spd; this.vy = clamp(dy, -1, 1) * spd * 0.75 * (ady > 3 ? 1 : 0);
      this.moving = Math.abs(this.vx) + Math.abs(this.vy) > 0.2;
    } else {
      // circle around the hero at a respectful distance
      const want = 120 + (this.id % 4) * 26, side = this.flip;
      let vx = 0;
      if (adx < want - 20) vx = -sgn(dx) * spd * 0.6; else if (adx > want + 30) vx = sgn(dx) * spd * 0.7;
      this.vx = vx;
      this.vy = Math.sin(this.t * 0.03 + this.sway) * spd * 0.5 + side * 0.1;
      this.moving = Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.15;
      if (this.t % 180 === 0) this.flip = -this.flip;
    }
  }
  aiRanged(p, dx, dy, adx, ady, spd) {
    const d = this.def, a = d.attacks;
    let vx = 0;
    const b = G.bounds, cornered = (this.x < b.minX + 40 && dx > 0) || (this.x > b.maxX - 40 && dx < 0);
    if (adx < d.keepDist - 55 && !cornered) vx = -sgn(dx) * spd; else if (adx > d.keepDist + 60) vx = sgn(dx) * spd * 0.8;
    this.vx = vx; this.vy = clamp(dy, -1, 1) * spd * 0.6 * (ady > 6 ? 1 : 0);
    this.moving = Math.abs(vx) + Math.abs(this.vy) > 0.2;
    if (this.cool <= 0) {
      if (adx < 44 && ady < 14) return this.startAttack(a[1]);
      if (ady < 14 && adx > a[0].minR && adx < a[0].range) return this.startAttack(a[0]);
    }
  }
  pickAttack(adx, ady) {
    const list = this.def.attacks, ok = [];
    let tot = 0;
    for (const a of list) {
      if (a.phase !== undefined && this.phase < a.phase) continue;
      if (a.cd && (this.acd[a.id] || 0) > G.frame) continue;
      const lane = (a.lane || 18) * 0.75;
      let valid;
      switch (a.type) {
        case 'dash': valid = adx >= a.minR && adx <= a.range && ady < 12; break;
        case 'proj': case 'wave': valid = adx >= a.minR && adx <= a.range && ady < 16; break;
        case 'leap': case 'tp': valid = adx >= a.minR && adx <= a.range; break;
        case 'beam': valid = true; break;
        case 'summon': valid = G.enemies.length < 5; break;
        default: valid = adx <= a.range && ady <= lane;
      }
      if (valid) { ok.push(a); tot += a.wt || 1; }
    }
    if (!ok.length) return null;
    // bosses: don't spam projectiles when the hero is right in their face
    let r = Math.random() * tot;
    for (const a of ok) { r -= a.wt || 1; if (r <= 0) return a; }
    return ok[0];
  }

  startAttack(a) {
    this.atk = a; this.atkHit = false; this.dodged = false;
    this.setState('windup');
    this.vx = 0; this.vy = 0; this.trail.length = 0;
    const p = G.player;
    if (p) this.facing = p.x >= this.x ? 1 : -1;
    if (a.cd) this.acd[a.id] = G.frame + a.cd;
    if (a.warn || this.boss) {
      FX.text('!', this.x, this.y - this.hh - 6, { color: '#ffe44d', size: 14, glow: '#ff2fd0', life: 24, vy: -0.5 });
      Snd.sfx.tele();
    }
    if (a.type === 'beam') this.spawnBeams();
    if (a.type === 'tp') { FX.ring(this.x, this.y - 30, 4, 3, 14, '#27f0ff', 2); }
  }
  spawnBeams() {
    const p = G.player, n = this.phase >= 2 ? 3 : (this.phase >= 1 ? 2 : 1);
    for (let i = 0; i < n; i++) {
      let y = i === 0 ? p.y : LANE_MIN + Math.random() * (LANE_MAX - LANE_MIN);
      const bm = new Beam(y, this.atk.st, 26, this.atk.dmg);
      G.beams.push(bm);
    }
    Snd.sfx.laserWarn();
  }
  updWindup() {
    const a = this.atk, t = this.stT;
    this.vx *= 0.5; this.vy *= 0.5;
    if (a.type === 'tp') this.alpha = clamp(1 - t / a.st * 1.2, 0, 1);
    if (a.ground && t % 4 === 0) FX.dust(this.x - this.facing * 8, this.y, 2, -this.facing);
    if (a.st - t < 9 && t % 3 === 0) this.flash = 1;
    if (t >= a.st) {
      if (a.type === 'tp') {
        const p = G.player;
        const side = p.facing * -1;
        this.x = clamp(p.x + side * 52, G.bounds.minX + 20, G.bounds.maxX - 20); this.y = clamp(p.y + rand(-6, 6), LANE_MIN, LANE_MAX);
        this.facing = p.x > this.x ? 1 : -1; this.alpha = 1;
        FX.ring(this.x, this.y - 30, 4, 4, 14, '#27f0ff', 2); FX.glow(this.x, this.y - 30, 30, 8, '#27f0ff'); FX.sparks(this.x, this.y - 30, 0, 6.3, 14, 6, '#27f0ff', 14);
        Snd.sfx.dash();
      }
      this.setState('attack'); this.begin(a);
    }
  }
  begin(a) {
    const p = G.player;
    switch (a.type) {
      case 'proj': case 'wave': {
        for (const s of a.shots) {
          G.projs.push(new Projectile({
            x: this.x + this.facing * 16 * EU, y: this.y, z: s.z + (a.type === 'wave' ? 0 : this.z), vx: this.facing * s.vx, vy: (s.vy || 0), kind: s.kind, dmg: s.dmg, team: 'enemy', owner: this
          }));
        }
        Snd.sfx.throw_(); if (a.type === 'wave') { FX.addShake(4); Snd.sfx.land(); }
        break;
      }
      case 'beam': {
        for (const b of G.beams) if (b.owner === undefined) { b.owner = this; }
        Snd.sfx.laserFire(); FX.addShake(3);
        break;
      }
      case 'summon': {
        FX.flashScreen(0.35, '#8b5cff'); FX.text('BACKUP!', this.x, this.y - this.hh - 10, { color: '#ff2fd0', size: 12, life: 50 });
        let i = 0;
        for (const k of a.minions) G.spawnEnemy(k, clamp(this.x + (i++ % 2 ? 90 : -90), G.camX + 40, G.camX + W - 40), rand(LANE_MIN, LANE_MAX), { flash: true });
        Snd.sfx.special();
        break;
      }
      case 'leap': {
        const T = 2 * (a.vz) / GRAV;
        this.vz = a.vz; this.vx = clamp((p.x - this.x) / T, -6, 6); this.vy = clamp((p.y - this.y) / T, -1.6, 1.6);
        this.sqy = 1.2; this.sqx = 0.85; Snd.sfx.jump(); FX.dust(this.x, this.y, 8);
        break;
      }
      case 'dash': {
        this.dashBegin = { x: this.x }; Snd.sfx.dash(); FX.speedLines(this.x, this.y - 30, this.facing, 5);
        break;
      }
      default:
        Snd.sfx.swing(0.7);
    }
    if (a.spin) this.spinT = 0;
  }
  updAttack() {
    const a = this.atk, t = this.stT, p = G.player;
    switch (a.type) {
      case 'dash': {
        this.vx = this.facing * a.speed * (t < 4 ? 0.7 : 1); this.vy = p ? clamp((p.y - this.y) * 0.05, -0.7, 0.7) : 0;
        if (this.z > 0 && a.id !== 'dashstrike' && a.id !== 'flykick') this.vz = 0;
        if (t % 2 === 0) { this.ghosts.push({ j: this.lastJ, frame: this.curFrame, x: this.x, y: this.y - this.z, f: this.facing, life: 8 }); }
        if (a.ground && t % 3 === 0) FX.dust(this.x - this.facing * 8, this.y, 2, -this.facing);
        this.checkHitPlayer(a);
        const b = G.bounds;
        const hitWall = (this.x <= b.minX + 14 && this.facing < 0) || (this.x >= b.maxX - 14 && this.facing > 0);
        const passed = p && ((this.x - p.x) * this.facing > 90);
        if (t >= a.ac || hitWall || (passed && a.ground)) { if (hitWall) { FX.addShake(3); FX.dust(this.x, this.y, 6); } this.finishAttack(); }
        return;
      }
      case 'leap': {
        // in the air until landing (handled by onLand). Hard timeout for safety
        if (t > a.ac) { this.leapImpact(); }
        return;
      }
      case 'proj': case 'wave': case 'beam': case 'summon':
        if (t >= a.ac) this.finishAttack();
        return;
      default: {
        if (t <= a.ac) this.vx = this.facing * (a.lunge || 0);
        if (a.rehit && t % a.rehit === 0) { this.atkHit = false; this.dodged = false; }
        this.checkHitPlayer(a);
        if (a.quake && t === 1) this.slamFx();
        if (t >= a.ac) this.finishAttack();
      }
    }
    if (a.pw !== 'spin' || true) this.pushTrail(this.lastJ || computeJoints(POSES.stance), a.pw === 'jab' || a.pw === 'hay' ? 'hF' : 'fF');
  }
  finishAttack() { this.setState('recover'); this.vx *= 0.3; }
  slamFx() {
    FX.addShake(this.boss ? 8 : 4); FX.ring(this.x, this.y, 4, 5, 18, '#ffe44d', 3); FX.dust(this.x, this.y, 12);
    FX.sparks(this.x, this.y - 4, -Math.PI / 2, 3, 12, 6, '#ffe44d', 14); Snd.sfx.land();
  }
  leapImpact() {
    const a = this.atk;
    this.slamFx(); FX.freeze(3);
    if (G.player && hitTest(this, a, this.facing, G.player)) this.resolveHit(a);
    this.setState('recover'); this.vx = 0; this.vy = 0; this.vz = 0; this.z = 0;
  }
  checkHitPlayer(a) {
    if (this.atkHit) return;
    const p = G.player;
    if (!p || p.dead) return;
    if (hitTest(this, a, this.facing, p)) {
      if (p.iframes > 0) { if (!this.dodged) { this.dodged = true; G.onPerfectDodge(p, this); } return; }
      if (!p.canBeHit()) return;
      this.resolveHit(a);
    }
  }
  resolveHit(a) {
    const p = G.player, dir = a.both ? sgn(p.x - this.x) : this.facing;
    this.atkHit = true;
    if (p.hurtBy(a.dmg, dir, a.kb || 3, a.lift || 0, this)) G.onPlayerHit(this, a, dir);
  }

  // ---------------- being hit ----------------
  takeHit(dir, mv, dmg, crit, counter) {
    this.hp -= dmg; this.flash = 4; this.shakeT = mv.hs || 3;
    const dead = this.hp <= 0;
    if (!dead) Snd.sfx.enemyHurt(this);
    let stagger = true;
    const atking = this.state === 'windup' || this.state === 'attack';
    if (this.def.armor && atking && (this.atk && this.atk.armorAtk) && (mv.w || 1) < 3 && !dead) stagger = false;
    if (this.boss && !dead) {
      this.poise += dmg + ((mv.w || 1) >= 3 ? 12 : 0) + (counter ? 15 : 0);
      if (this.poise >= this.def.poiseMax) { this.poise = 0; stagger = true; if (this.state !== 'down') G.bossStagger(this); } else stagger = false;
      if (this.z > 1 || this.state === 'launched') stagger = true;
    }
    this.moveInterrupt = false;
    if (dead) {
      this.dead = true; this.hp = 0;
      if (this.attacker) { this.attacker = false; G.tokens = Math.max(0, G.tokens - 1); }
      this.setState('launched'); this.vz = Math.max(5.5, (mv.lift || 0) + 2.5); this.vx = dir * ((mv.kb || 4) + 4.5); this.facing = -dir; this.bounced = false; this.alpha = 1;
      return true;
    }
    const airborne = this.z > 1 || this.state === 'launched';
    if (!stagger) { this.vx += dir * (mv.kb || 2) * 0.25; return false; }
    if (this.attacker) { this.attacker = false; G.tokens = Math.max(0, G.tokens - 1); }
    this.trail.length = 0; this.alpha = 1;
    const lift = mv.lift || 0;
    if (airborne || lift > 0 || mv.knock) {
      this.juggle++;
      const base = airborne ? Math.max(2.6, 5.2 - this.juggle * 0.7) : Math.max(lift, 3);
      this.setState('launched'); this.vz = airborne ? Math.max(base, this.vz * 0.2 + base * 0.7) : base;
      this.vx = dir * ((mv.kb || 3) * (airborne ? 0.6 : 1)); this.facing = -dir; this.bounced = false;
      this.gravMul = this.juggle > 4 ? 1.7 : 1;
      if (this.z <= 0.01) this.z = 0.5;
    } else {
      this.setState('hurt', mv.stun || 14); this.vx = dir * (mv.kb || 3); this.facing = -dir;
    }
    return true;
  }

  // ---------------- drawing ----------------
  getPose() {
    const t = this.t, a = this.atk;
    switch (this.state) {
      case 'move': {
        if (this.moving) { this.walkPhase += 0.2 * this.def.spd * this.spdMul * (this.def.spd > 1.5 ? 1.2 : 1) + 0.05; return walkPose(this.walkPhase, this.enemyStance(), 0.9); }
        return idlePose(t + this.id * 13, this.enemyStance());
      }
      case 'windup': {
        const w = POSES[a.pw + '_w'] || POSES.stance, k = easeOut(clamp(this.stT / a.st, 0, 1));
        return lerpPose(this.enemyStance(), w, k);
      }
      case 'attack': {
        const s = POSES[a.pw + '_s'] || POSES.spin_s;
        const w = POSES[a.pw + '_w'] || POSES.stance;
        return lerpPose(w, s, clamp((this.stT + 1) / 2, 0, 1));
      }
      case 'recover': {
        const s = POSES[a.pw + '_s'] || POSES.spin_s;
        return lerpPose(s, this.enemyStance(), easeInOut(clamp(this.stT / (a.rc * 0.9), 0, 1)));
      }
      case 'hurt': return this.stT < 6 ? POSES.hurt2 : POSES.hurt;
      case 'launched': return POSES.tumble;
      case 'down': return POSES.down;
      case 'getup': return lerpPose(POSES.down, POSES.getup, clamp(this.stT / 16, 0, 1));
      case 'dead': return POSES.down;
    }
    return POSES.stance;
  }
  // sprite frame for the current state (frame names: see tools/make_enemy_sprites.py)
  spriteFrame(S) {
    const a = this.atk, t = this.stT;
    switch (this.state) {
      case 'move': return this.moving ? 'walk' + (Math.floor(this.walkPhase / (Math.PI / 3)) % 6) : 'idle' + (Math.floor((this.t + this.id * 13) / 16) % 2);
      case 'windup': return S.first(t < a.st * 0.35 ? a.pw + '_m' : a.pw + '_w', a.pw, a.pw + '_s', 'idle0');
      case 'attack': return S.first(a.pw + '_s', a.pw, 'idle0');
      case 'recover': return (t / a.rc < 0.55) ? S.first(a.pw + '_r', a.pw, a.pw + '_s', 'idle0') : 'idle0';
      case 'hurt': return t < 6 ? 'hurt2' : 'hurt';
      case 'launched': return 'tumble';
      case 'down': case 'dead': return 'down';
      case 'getup': return t < 10 ? 'getup0' : 'getup1';
    }
    return 'idle0';
  }
  enemyStance() {
    if (!this._stance) {
      this._stance = Object.assign({}, POSES.stance);
      const k = this.kind;
      if (k === 'heavy' || k === 'boss1' || k === 'boss3') { this._stance.hFy -= 6; this._stance.hBy -= 4; this._stance.hFx -= 2; this._stance.lean = 0.02; this._stance.fFx += 3; this._stance.fBx -= 3; }
      if (k === 'thrower') { this._stance.hFy -= 12; this._stance.hBy -= 12; this._stance.lean = 0; }
      if (k === 'fast' || k === 'boss2') { this._stance.hy -= 2; this._stance.fFx += 3; this._stance.fBx -= 3; }
      if (this.style.robot) this._stance.lean = 0;
    }
    return this._stance;
  }
  draw(c, camX) {
    const j = computeJoints(this.getPose()); this.lastJ = j;
    const o = { t: this.t, sqx: this.sqx, sqy: this.sqy };
    if (this.state === 'launched') o.rot = this.rot;
    if (this.state === 'attack' && this.atk && this.atk.spin) {
      o.sx = Math.cos(this.stT / Math.max(6, this.atk.ac) * Math.PI * 2 * this.atk.spin);
      if (Math.abs(o.sx) < 0.2) o.sx = 0.2;
    }
    const x = this.x - camX + (this.shakeT > 0 ? rand(-1.6, 1.6) : 0), y = this.y - this.z;
    const sset = EnemySprites[this.sprKey], spr = sset && sset.ready ? sset : null;
    if (spr) this.curFrame = this.spriteFrame(spr);
    // afterimages for dashing enemies
    if (this.ghosts.length) {
      c.globalCompositeOperation = 'lighter';
      for (let i = this.ghosts.length - 1; i >= 0; i--) {
        const g = this.ghosts[i]; if (--g.life <= 0) { this.ghosts.splice(i, 1); continue; }
        c.globalAlpha = g.life / 12 * 0.6;
        if (spr && g.frame) spr.draw(c, g.frame, g.x - camX, g.y, g.f, {}, i % 2 ? 'pink' : 'cyan');
        else if (g.j) Rig.draw(c, g.j, this.style, g.x - camX, g.y, g.f, { flat: this.style.accent || '#f0f' });
      }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    }
    if (this.alpha < 1) c.globalAlpha = this.alpha;
    if (spr) {
      spr.draw(c, this.curFrame, x, y, this.facing, o);
      if (this.flash > 0) spr.draw(c, this.curFrame, x, y, this.facing, o, 'white');
    } else {
      Rig.draw(c, j, this.style, x, y, this.facing, o);
      if (this.flash > 0) Rig.draw(c, j, this.style, x, y, this.facing, Object.assign({}, o, { flat: '#fff' }));
    }
    c.globalAlpha = 1;
    if (this.state === 'windup' && (this.atk.warn || this.boss)) {
      // red danger pulse at the feet
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.25 + 0.2 * Math.sin(this.t * 0.9);
      c.strokeStyle = '#ff2a4d'; c.lineWidth = 1.5; c.beginPath();
      c.ellipse(this.x - camX, this.y + 1, 22 * this.style.scale, 6 * this.style.scale, 0, 0, 6.3); c.stroke();
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    }
    if (this.style.aura && !this.dead) {
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.16 + 0.08 * Math.sin(this.t * 0.2);
      c.fillStyle = this.style.aura; c.beginPath(); c.ellipse(this.x - camX, this.y - this.z - 36 * this.style.scale, 26 * this.style.scale, 44 * this.style.scale, 0, 0, 6.3); c.fill();
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    }
    this.drawTrail(c, camX, this.style.accent || '#ff9ae9');
    this.drawHpBar(c, camX);
  }
  // small health bar over the head, shown once the enemy has taken damage (bosses use the big HUD bar)
  drawHpBar(c, camX) {
    if (this.boss || this.dead || this.hp >= this.maxHp || this.hp <= 0) return;
    const k = Math.max(0, this.hp) / this.maxHp;
    if (this.hpLag === undefined || this.hpLag < k) this.hpLag = k;
    this.hpLag += (k - this.hpLag) * 0.08;                       // white chunk that drains after each hit
    if (ENEMY_HEAD_Y === null) { const j = computeJoints(POSES.stance); ENEMY_HEAD_Y = j.head[1] + RIG.headH * 0.5 + 9; }
    const sc = this.style.scale || 1, w = Math.round(26 * Math.sqrt(sc)), h = 3;
    const x = Math.round(this.x - camX - w / 2), y = Math.round(this.y - this.z - ENEMY_HEAD_Y * sc);
    c.globalAlpha = this.alpha < 1 ? this.alpha : 1;
    c.fillStyle = OUT; c.fillRect(x - 1, y - 1, w + 2, h + 2);
    c.fillStyle = '#2a1650'; c.fillRect(x, y, w, h);
    c.fillStyle = '#fff'; c.fillRect(x, y, Math.round(w * this.hpLag), h);
    c.fillStyle = k > 0.5 ? '#27f0ff' : k > 0.25 ? '#ffe44d' : '#ff2a4d';
    c.fillRect(x, y, Math.max(1, Math.round(w * k)), h);
    c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(x, y, Math.max(1, Math.round(w * k)), 1);
    c.globalAlpha = 1;
  }
}
let ENEMY_HEAD_Y = null;

// ============ projectiles ============
class Projectile {
  constructor(o) {
    Object.assign(this, { vy: 0, life: 260, team: 'enemy', kb: 4, lift: 2.5, hitOnce: true, t: 0 }, o);
    this.deflectable = true; this.r = 9; this.zr = 12; this.lane = 14; this.pierce = false; this.hitSet = new Set();
    switch (this.kind) {
      case 'wave': this.deflectable = false; this.pierce = true; this.lane = 20; this.r = 12; this.zr = 8; this.z = 4; this.life = 220; this.lift = 3.5; break;
      case 'sonic': this.r = 12; this.zr = 22; this.lane = 18; this.pierce = false; break;
      case 'case': this.r = 9; this.zr = 12; break;
      case 'ring': this.r = 8; this.zr = 12; break;
      case 'bolt': this.r = 10; this.zr = 8; break;
    }
    this.r *= EU; this.zr *= EU; this.lane *= Math.sqrt(EU);
  }
  hitbox() { return { x: this.x, y: this.y, z: this.z - this.zr, hw: this.r, hh: this.zr * 2 }; }
  update() {
    this.t++; this.x += this.vx; this.y += this.vy;
    if (this.kind === 'disc') this.z = Math.max(20, this.z);
    if (--this.life <= 0 || this.x < G.camX - 60 || this.x > G.camX + W + 60 || this.y < LANE_MIN - 20 || this.y > LANE_MAX + 20) { this.dead = true; return; }
    if (this.t % 3 === 0) FX.sparks(this.x, this.y - this.z, Math.PI * (this.vx > 0 ? 1 : 0), 0.4, 1, 2, this.color(), 8, 1);
    if (this.team === 'enemy') {
      const p = G.player;
      if (!p || p.dead) return;
      if (Math.abs(p.y - this.y) < this.lane + 4 && Math.abs(p.x - this.x) < this.r + p.hw && p.z + p.hh > this.z - this.zr && p.z < this.z + this.zr) {
        if (p.iframes > 0) { if (!this.dodged) { this.dodged = true; G.onPerfectDodge(p, this); } return; }
        if (!p.canBeHit()) return;
        const dir = sgn(this.vx);
        if (p.hurtBy(this.dmg, dir, this.kb, this.kind === 'wave' ? 3.5 : 0, this)) G.onPlayerHit(this, { dmg: this.dmg, hs: 4, shake: 4 }, dir);
        if (!this.pierce) { this.dead = true; FX.impact(this.x, this.y - this.z, dir, 1, false); }
      }
    } else {
      for (const e of G.enemies) {
        if (this.hitSet.has(e) || !e.hittable()) continue;
        if (Math.abs(e.y - this.y) < 24 && Math.abs(e.x - this.x) < this.r + e.hw + 6 && e.z + e.hh > this.z - this.zr && e.z < this.z + this.zr + 10) {
          this.hitSet.add(e);
          G.registerHit(G.player, e, { dir: sgn(this.vx), kb: 5, lift: 3, hs: 5, shake: 4, w: 2, name: 'REFLECT' }, Math.round(this.dmg * 1.6), true, false);
          this.dead = true; FX.impact(this.x, this.y - this.z, sgn(this.vx), 2, true);
          break;
        }
      }
    }
  }
  deflect(dir, by) {
    this.team = 'player'; this.vx = dir * Math.max(4.5, Math.abs(this.vx) * 1.5); this.vy = 0; this.life = 200; this.dmg = Math.round(this.dmg * 1.4);
    FX.text('REFLECT!', this.x, this.y - this.z - 16, { color: '#27f0ff', size: 10, glow: '#27f0ff', life: 34 });
    FX.impact(this.x, this.y - this.z, dir, 2, false); FX.ring(this.x, this.y - this.z, 3, 4, 14, '#27f0ff', 2);
    G.addStyle(10);
  }
  color() { return { disc: '#ff2fd0', sonic: '#ff2fd0', wave: '#ffe44d', ring: '#27f0ff', case: '#ffe44d', bolt: '#3dffa0' }[this.kind] || '#fff'; }
  draw(c, camX) {
    const x = this.x - camX, y = this.y - this.z, k = this.kind;
    // shadow
    if (this.z > 6) { c.fillStyle = 'rgba(6,0,20,.35)'; c.beginPath(); c.ellipse(x, this.y + 1, 7, 2.5, 0, 0, 6.3); c.fill(); }
    if (this.team === 'player') { c.globalCompositeOperation = 'lighter'; c.fillStyle = '#27f0ff'; c.globalAlpha = 0.5; c.beginPath(); c.arc(x, y, 12, 0, 6.3); c.fill(); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
    // Aseprite sheet (assets/props/projectiles.aseprite, tools/ase/projectiles.lua); light kinds are drawn additively; canvas fallback below
    const spr = typeof PropSprites !== 'undefined' && PropSprites.projectiles && PropSprites.projectiles.ready ? PropSprites.projectiles : null;
    const PJ = { disc: [8, 2], case: [8, 3], ring: [4, 4], sonic: [4, 4], wave: [4, 4], bolt: [2, 3] }[k];
    if (spr && PJ) {
      const light = k !== 'disc' && k !== 'case', dir = this.vx < 0 ? -1 : 1;
      if (light) c.globalCompositeOperation = 'lighter';
      spr.draw(c, k + '_' + (Math.floor(this.t / PJ[1]) % PJ[0]), x, k === 'wave' ? y - 6 : y, dir);
      c.globalCompositeOperation = 'source-over';
      return;
    }
    if (k === 'disc') {
      c.fillStyle = '#12081e'; c.beginPath(); c.arc(x, y, 8, 0, 6.3); c.fill();
      c.strokeStyle = '#4a3a6a'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, 5.5, 0, 6.3); c.stroke(); c.beginPath(); c.arc(x, y, 3.5, 0, 6.3); c.stroke();
      c.fillStyle = '#ff2fd0'; c.beginPath(); c.arc(x, y, 2.4, 0, 6.3); c.fill();
      const a = this.t * 0.5; c.strokeStyle = '#fff'; c.lineWidth = 1.2; c.beginPath(); c.arc(x, y, 7, a, a + 0.9); c.stroke();
    } else if (k === 'ring') {
      c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#27f0ff'; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y, 4 + Math.sin(this.t * 0.4) * 1, 9, 0, 0, 6.3); c.stroke();
      c.strokeStyle = '#fff'; c.lineWidth = 1; c.stroke(); c.globalCompositeOperation = 'source-over';
    } else if (k === 'sonic') {
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) { c.strokeStyle = i ? '#ff2fd0' : '#fff'; c.lineWidth = 2.5 - i * 0.6; c.globalAlpha = 1 - i * 0.25; c.beginPath(); c.arc(x - Math.sign(this.vx) * i * 7, y, 16 + i * 4, -0.9 + (this.vx < 0 ? Math.PI : 0), 0.9 + (this.vx < 0 ? Math.PI : 0)); c.stroke(); }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    } else if (k === 'wave') {
      c.globalCompositeOperation = 'lighter';
      const dir = Math.sign(this.vx);
      c.fillStyle = '#ffe44d'; c.globalAlpha = 0.85;
      c.beginPath(); c.moveTo(x - dir * 4, y + 2); c.lineTo(x + dir * 8, y - 7 - Math.sin(this.t * 0.5) * 2); c.lineTo(x + dir * 14, y + 2); c.closePath(); c.fill();
      c.fillStyle = '#ff6a3d'; c.globalAlpha = 0.6; c.fillRect(x - dir * 22, y - 1, 22, 3);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    } else if (k === 'case') {
      c.save(); c.translate(x, y); c.rotate(this.t * 0.35);
      c.fillStyle = '#1a0b2e'; c.fillRect(-8, -6, 16, 12); c.fillStyle = '#7a4b22'; c.fillRect(-7, -5, 14, 10);
      c.fillStyle = '#ffe44d'; c.fillRect(-1, -3, 2, 3); c.fillRect(-7, -1, 14, 1); c.restore();
    } else if (k === 'bolt') {
      c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#3dffa0'; c.lineWidth = 3; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x - Math.sign(this.vx) * 12, y); c.lineTo(x + Math.sign(this.vx) * 6, y); c.stroke();
      c.strokeStyle = '#fff'; c.lineWidth = 1; c.stroke(); c.globalCompositeOperation = 'source-over';
    }
  }
}

// ============ floor laser (boss 4) ============
class Beam {
  constructor(y, warn, dur, dmg) { this.y = y; this.warn = warn; this.dur = dur; this.dmg = dmg; this.age = 0; this.dead = false; this.hit = false; }
  update() {
    this.age++;
    const p = G.player;
    if (this.age > this.warn && this.age <= this.warn + this.dur) {
      if (p && !p.dead && Math.abs(p.y - this.y) < 11 && p.z < 26) {
        if (p.iframes > 0) { if (!this.dodged) { this.dodged = true; G.onPerfectDodge(p, this); } }
        else if (!this.hit && p.canBeHit()) { this.hit = true; if (p.hurtBy(this.dmg, sgn(p.x - G.camX - W / 2), 5, 3, this)) G.onPlayerHit(this, { dmg: this.dmg, hs: 5, shake: 7 }, 1); }
      }
    }
    if (this.age > this.warn + this.dur) this.dead = true;
  }
  draw(c, camX) {
    const a = this.age, y = this.y;
    // Aseprite tiles (tools/ase/projectiles.lua: beamwarn / beamfire, 32 px wide) repeated across the screen; canvas fallback below
    const spr = typeof PropSprites !== 'undefined' && PropSprites.projectiles && PropSprites.projectiles.ready ? PropSprites.projectiles : null;
    if (spr) {
      c.globalCompositeOperation = 'lighter';
      if (a <= this.warn) {
        const k = a / this.warn; c.globalAlpha = 0.35 + 0.55 * k * (0.6 + 0.4 * Math.sin(a * 0.9));
        for (let tx = 0; tx < W; tx += 32) spr.draw(c, 'beamwarn_' + ((a >> 2) % 4), tx + 32, y, 1);
      } else {
        const k = 1 - (a - this.warn) / this.dur;
        for (let tx = 0; tx < W; tx += 32) spr.draw(c, 'beamfire_' + ((a >> 1) % 4), tx + 32, y, 1, { sqy: 0.35 + 0.65 * k });
        if (a % 2 === 0) FX.sparks(camX + rand(W), y - rand(0, 6), -Math.PI / 2, 1.2, 1, 4, '#27f0ff', 12);
      }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      return;
    }
    if (a <= this.warn) {
      const k = a / this.warn;
      c.fillStyle = `rgba(255,42,77,${0.1 + 0.25 * k * (0.6 + 0.4 * Math.sin(a * 0.9))})`;
      c.fillRect(0, y - 11, W, 22);
      c.fillStyle = `rgba(255,120,140,${0.5})`; c.fillRect(0, y - 11, W, 1); c.fillRect(0, y + 10, W, 1);
      drawText(c, '!', 20 + (a * 7) % 600, y + 4, { size: 12, color: '#ff8090', align: 'center' });
    } else {
      const k = 1 - (a - this.warn) / this.dur;
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = `rgba(255,60,120,${0.5 * k})`; c.fillRect(0, y - 14 * k - 2, W, 28 * k + 4);
      c.fillStyle = `rgba(80,240,255,${0.8})`; c.fillRect(0, y - 8 * k, W, 16 * k);
      c.fillStyle = '#fff'; c.fillRect(0, y - 3 * k, W, 6 * k);
      c.globalCompositeOperation = 'source-over';
      if (a % 2 === 0) FX.sparks(camX + rand(W), y - rand(0, 6), -Math.PI / 2, 1.2, 1, 4, '#27f0ff', 12);
    }
  }
}

// ============ pickups ============
const PICKUPS = {
  soda: { hp: 22, label: 'SODA +22', col: '#27f0ff' },
  pizza: { hp: 48, label: 'PIZZA +48', col: '#ffe44d' },
  tape: { meter: 45, label: 'MIXTAPE +FURY', col: '#ff2fd0' },
  life: { life: 1, label: '1UP!', col: '#3dffa0' }
};
class Pickup {
  constructor(kind, x, y) { this.kind = kind; this.x = x; this.y = y; this.z = 30; this.vz = 5; this.t = 0; this.life = 900; this.dead = false; }
  update() {
    this.t++;
    this.vz -= GRAV * 0.8; this.z += this.vz; if (this.z < 0) { this.z = 0; this.vz = this.vz < -2 ? -this.vz * 0.45 : 0; }
    if (--this.life <= 0) this.dead = true;
    const p = G.player;
    if (p && !p.dead && Math.abs(p.x - this.x) < 16 && Math.abs(p.y - this.y) < 14 && p.z < 30 && this.t > 20) {
      const d = PICKUPS[this.kind];
      if (d.hp) p.hp = Math.min(p.maxHp, p.hp + d.hp);
      if (d.meter) p.meter = Math.min(100, p.meter + d.meter);
      if (d.life) G.lives++;
      FX.text(d.label, this.x, this.y - 40, { color: d.col, size: 10, glow: d.col, life: 50 });
      FX.ring(this.x, this.y - 8, 3, 3.5, 16, d.col, 2); FX.sparks(this.x, this.y - 8, -Math.PI / 2, 2, 16, 5, d.col, 20);
      Snd.sfx.pickup(); this.dead = true; G.addScore(50);
    }
  }
  draw(c, camX) {
    const x = this.x - camX, bob = this.z > 0.5 ? 0 : Math.sin(this.t * 0.1) * 2, y = this.y - this.z - 8 - bob;
    c.fillStyle = 'rgba(6,0,20,.4)'; c.beginPath(); c.ellipse(x, this.y + 1, 7, 2.4, 0, 0, 6.3); c.fill();
    if (this.life < 180 && this.t % 6 < 3) return;
    const d = PICKUPS[this.kind];
    // soda / pizza / mixtape: Aseprite sprites (assets/props/pickups.aseprite, tools/ase/pickups.lua), 6-frame loop at 10 fps
    const spr = typeof PropSprites !== 'undefined' && PropSprites.pickups && PropSprites.pickups.ready ? PropSprites.pickups : null;
    const fname = this.kind + '_' + (Math.floor(this.t / 6) % 6);
    if (spr && spr.has(fname)) {
      const gl = c.createRadialGradient(x, y, 2, x, y, 16); gl.addColorStop(0, d.col); gl.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.28 + 0.14 * Math.sin(this.t * 0.15); c.fillStyle = gl; c.fillRect(x - 16, y - 16, 32, 32);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      spr.draw(c, fname, x, y + 9, 1); return;
    }
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.35 + 0.2 * Math.sin(this.t * 0.15); c.fillStyle = d.col; c.beginPath(); c.arc(x, y, 12, 0, 6.3); c.fill(); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    if (this.kind === 'soda') {
      c.fillStyle = OUT; c.fillRect(x - 4, y - 7, 8, 14); c.fillStyle = '#e8323c'; c.fillRect(x - 3, y - 6, 6, 12); c.fillStyle = '#fff'; c.fillRect(x - 3, y - 2, 6, 3); c.fillStyle = '#aaa'; c.fillRect(x - 3, y - 7, 6, 2);
    } else if (this.kind === 'pizza') {
      c.fillStyle = OUT; c.beginPath(); c.moveTo(x - 9, y - 6); c.lineTo(x + 9, y - 6); c.lineTo(x, y + 9); c.closePath(); c.fill();
      c.fillStyle = '#ffcf40'; c.beginPath(); c.moveTo(x - 7, y - 5); c.lineTo(x + 7, y - 5); c.lineTo(x, y + 6); c.closePath(); c.fill();
      c.fillStyle = '#d6303c'; c.fillRect(x - 3, y - 2, 3, 3); c.fillRect(x + 1, y, 3, 3); c.fillStyle = '#c98a2a'; c.fillRect(x - 7, y - 6, 14, 2);
    } else if (this.kind === 'tape') {
      c.fillStyle = OUT; c.fillRect(x - 9, y - 6, 18, 12); c.fillStyle = '#ff2fd0'; c.fillRect(x - 8, y - 5, 16, 10); c.fillStyle = '#fff'; c.fillRect(x - 6, y - 3, 12, 4);
      c.fillStyle = '#1a0b2e'; c.beginPath(); c.arc(x - 3, y - 1, 1.8, 0, 6.3); c.arc(x + 3, y - 1, 1.8, 0, 6.3); c.fill();
    } else {
      c.fillStyle = OUT; c.fillRect(x - 8, y - 8, 16, 16); c.fillStyle = '#3dffa0'; c.fillRect(x - 7, y - 7, 14, 14);
      drawText(c, '1UP', x, y + 3, { size: 8, color: '#12081e', align: 'center' });
    }
  }
}

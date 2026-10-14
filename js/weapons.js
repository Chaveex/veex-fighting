'use strict';
// Pick-up weapons, armed enemies and lobbed objects (barrels, grenades...).
//   - the hero walks over a weapon item to take it: PUNCH then swings / throws the weapon (limited uses, it breaks)
//   - one weapon is common to every stage (BARRE A MINE), each stage adds its own variant (WEAPON_BY_LEVEL)
//   - some enemies carry a weapon (drawn in their hand, used against the hero, dropped when they are K.O.)
//   - the BRUTE (big enemy) lifts a heavy object over his head and lobs it in an arc (class Lob, also used for grenades)
// Art: assets/props/weapons.aseprite (tools/ase/weapons.lua -> PropSprites.weapons, grip / object centre on the anchor); procedural canvas shapes are the fallback.

const WEAPONS = {
  bar:      { name: 'BARRE A MINE', uses: 6,  col: '#b7c0d4' },
  knife:    { name: 'COUTEAU',      uses: 6,  col: '#e8f0ff' },
  nunchaku: { name: 'NUNCHAKU',     uses: 7,  col: '#e0902a' },
  grenade:  { name: 'GRENADE',      uses: 2,  col: '#6ad04a', thrown: true },
  taser:    { name: 'MATRAQUE',     uses: 6,  col: '#27f0ff' }
};
const WEAPON_BY_LEVEL = ['knife', 'nunchaku', 'grenade', 'taser'];   // stage variant (the BARRE A MINE is everywhere)
const LOB_OBJ = ['barrel', 'crate', 'tire', 'unit'];                  // what the BRUTE of each stage throws

// ---- hero swings (scaled like the other moves, see fighter.js scaleMoves) ----
const WEAPON_MV = {
  bar:      { name: 'BARRE', st: 9, ac: 4, rc: 20, dmg: 38, x0: 0, x1: 54, z0: 14, z1: 82, kb: 8, lift: 4.5, hs: 8, shake: 6, w: 3, lunge: 2.4, pw: 'wchop', tip: 'hF', sfx: 1.3 },
  knife:    { name: 'COUTEAU', st: 3, ac: 3, rc: 8, dmg: 32, x0: 0, x1: 40, z0: 22, z1: 70, kb: 2.2, stun: 15, hs: 3, shake: 1.5, w: 1, lunge: 1.8, pw: 'wstab', tip: 'hF', sfx: 0.9 },
  nunchaku: { name: 'NUNCHAKU', st: 5, ac: 6, rc: 14, dmg: 24, both: true, x0: 0, x1: 48, z0: 4, z1: 78, kb: 4.5, lift: 2, hs: 5, shake: 3.5, w: 2, lane: 24, pw: 'wspin', tip: 'hB', sfx: 1.0 },
  taser:    { name: 'TASER', st: 6, ac: 3, rc: 16, dmg: 20, x0: 0, x1: 44, z0: 22, z1: 72, kb: 1.5, stun: 46, hs: 6, shake: 3, w: 2, lunge: 1.5, pw: 'wbaton', tip: 'hF', sfx: 1.0, shock: true },
  grenade:  { name: 'GRENADE', st: 8, ac: 2, rc: 16, dmg: 0, x0: 0, x1: 0, z0: 999, z1: 1000, kb: 0, w: 1, pw: 'whurl', tip: 'hF', sfx: 0.8, toss: true }
};
(function scaleWeaponMoves() {
  for (const k in WEAPON_MV) {
    const m = WEAPON_MV[k]; m.weapon = k;
    if (!m.toss) { m.x0 *= PU; m.x1 *= PU; m.z0 *= PU; m.z1 *= PU; }
    m.lane = (m.lane || 18) * Math.sqrt(PU);
    if (m.lunge) m.lunge *= 1.12;
  }
})();

// throwing the held weapon away (PICKUP key with nothing to pick up): wind-up, then ThrownWeapon / Lob leaves the hand
const HURL_MV = { name: 'LANCER', weapon: false, hurl: true, toss: true, st: 7, ac: 2, rc: 14, dmg: 0, x0: 0, x1: 0, z0: 999, z1: 1000, kb: 0, w: 1, pw: 'whurl', tip: 'hF', sfx: 0.9 };
const THROW_DMG = { bar: 40, knife: 36, nunchaku: 26, taser: 22 };

// ---- enemy swings (already in screen units, EU applied here) ----
const ENEMY_WEAPON_ATK = {
  bar:      { id: 'w_bar', wt: 7, range: 54, st: 26, ac: 5, rc: 30, dmg: 15, x0: 0, x1: 66, z0: 14, z1: 78, kb: 7, lift: 4, hs: 6, shake: 5, pw: 'hay', lunge: 2.2, warn: true },
  knife:    { id: 'w_knife', wt: 7, range: 36, st: 12, ac: 3, rc: 18, dmg: 9, x0: 0, x1: 44, z0: 30, z1: 66, kb: 2.5, hs: 3, shake: 2, pw: 'jab', lunge: 2.6 },
  nunchaku: { id: 'w_nun', wt: 6, range: 46, st: 16, ac: 10, rc: 28, dmg: 7, both: true, x1: 56, z0: 6, z1: 70, lane: 22, kb: 5, lift: 2.6, hs: 4, shake: 3, pw: 'spin', spin: 1, rehit: 5, warn: true },
  taser:    { id: 'w_taser', wt: 6, range: 44, st: 20, ac: 4, rc: 24, dmg: 8, x0: 0, x1: 50, z0: 30, z1: 68, kb: 2, hs: 5, shake: 3, pw: 'jab', lunge: 1.4, shock: true, warn: true },
  grenade:  { id: 'w_gren', wt: 8, type: 'lob', minR: 130, range: 360, st: 34, ac: 2, rc: 36, pw: 'arms_up', warn: true, obj: 'grenade', dmg: 18, flight: 44, blast: 48 }
};
(function scaleEnemyAtk() {
  for (const k in ENEMY_WEAPON_ATK) {
    const a = ENEMY_WEAPON_ATK[k];
    for (const f of ['x0', 'x1', 'z0', 'z1']) if (a[f] !== undefined) a[f] *= EU;
    if (a.lane) a.lane *= Math.sqrt(EU);
    if (!a.type) a.range *= EU;
    if (a.lunge) a.lunge *= 1.1;
  }
})();

// ============ procedural art ============
// origin = the grip, +x = away from the hand
const WSPR_FRAMES = { bar: 1, knife: 1, nunchaku: 4, taser: 4, grenade: 1, barrel: 1, crate: 1, tire: 1, unit: 2 };
function weaponSprite(c, id, t, rate) {   // Aseprite art at the current transform; false if the sheet is not loaded
  const S = typeof PropSprites !== 'undefined' ? PropSprites.weapons : null, n = WSPR_FRAMES[id];
  if (!S || !S.ready || !n) return false;
  S.draw(c, id + '_' + (n > 1 ? Math.floor(t / (rate || 4)) % n : 0), 0, 0, 1);
  return true;
}
function drawWeaponShape(c, id, t) {
  if (weaponSprite(c, id, t, id === 'nunchaku' ? 5 : 3)) return;
  c.lineCap = 'round'; c.lineJoin = 'round';
  const bar = (x0, y0, x1, y1, w, col) => { c.strokeStyle = OUT; c.lineWidth = w + 2.4; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };
  switch (id) {
    case 'bar':
      c.strokeStyle = OUT; c.lineWidth = 6; c.beginPath(); c.moveTo(-6, 0); c.lineTo(34, 0); c.lineTo(39, -8); c.stroke();
      c.strokeStyle = '#b7c0d4'; c.lineWidth = 3.4; c.beginPath(); c.moveTo(-6, 0); c.lineTo(34, 0); c.lineTo(39, -8); c.stroke();
      c.strokeStyle = '#ff2a4d'; c.lineWidth = 3.4; c.beginPath(); c.moveTo(-5, 0); c.lineTo(5, 0); c.stroke();
      break;
    case 'knife':
      bar(-6, 0, 4, 0, 3.6, '#3a2a1a');
      c.fillStyle = OUT; c.beginPath(); c.moveTo(3, -4.6); c.lineTo(25, -0.5); c.lineTo(3, 4.6); c.closePath(); c.fill();
      c.fillStyle = '#e8f0ff'; c.beginPath(); c.moveTo(4, -3); c.lineTo(22, -0.3); c.lineTo(4, 3); c.closePath(); c.fill();
      c.fillStyle = '#fff'; c.fillRect(6, -2.2, 10, 1);
      break;
    case 'nunchaku': {
      bar(-4, 0, 14, 0, 3.6, '#c9822a');
      const a = Math.sin(t * 0.35) * 0.7, cx = 14 + 8 * Math.cos(a), cy = 8 * Math.sin(a), a2 = a + 0.55;
      c.strokeStyle = '#cfd6e6'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(14, 0); c.lineTo(cx, cy); c.stroke();
      bar(cx, cy, cx + 15 * Math.cos(a2), cy + 15 * Math.sin(a2), 3.6, '#c9822a');
      break;
    }
    case 'taser':
      bar(-6, 0, 12, 0, 4.2, '#262634');
      bar(12, 0, 22, 0, 5, '#4a4a5e');
      c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#27f0ff'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(22, 0);
      for (let i = 1; i <= 4; i++) c.lineTo(22 + i * 3.2, ((Math.floor(t / 2) + i) % 2 ? -1 : 1) * (2 + (i % 3)));
      c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 0.8; c.stroke(); c.globalCompositeOperation = 'source-over';
      break;
    case 'grenade':
      c.fillStyle = OUT; c.beginPath(); c.ellipse(6, 0, 8, 9.5, 0, 0, 6.3); c.fill();
      c.fillStyle = '#4a8a30'; c.beginPath(); c.ellipse(6, 0, 6, 7.5, 0, 0, 6.3); c.fill();
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(4, -2.5, 2, 3, 0, 0, 6.3); c.fill();
      c.fillStyle = '#9a9aa8'; c.fillRect(2, -11, 8, 4);
      c.strokeStyle = '#ffe44d'; c.lineWidth = 1.4; c.beginPath(); c.arc(12, -9, 2.6, 0, 6.3); c.stroke();
      break;
  }
}

// heavy objects of the BRUTE: centred on (0,0), about 24 px
function drawLobObj(c, obj, t) {
  if (obj === 'grenade') { c.save(); c.translate(-6, 0); drawWeaponShape(c, 'grenade', t); c.restore(); return; }
  if (weaponSprite(c, obj, t, 8)) return;
  switch (obj) {
    case 'barrel':
      c.fillStyle = OUT; c.fillRect(-11, -14, 22, 28);
      c.fillStyle = '#b4532a'; c.fillRect(-10, -13, 20, 26);
      c.fillStyle = '#d2703a'; c.fillRect(-10, -13, 6, 26);
      c.fillStyle = '#3a2a2a'; c.fillRect(-10, -8, 20, 3); c.fillRect(-10, 5, 20, 3);
      c.fillStyle = '#ffe44d'; c.fillRect(-4, -2, 8, 4);
      break;
    case 'crate':
      c.fillStyle = OUT; c.fillRect(-13, -13, 26, 26);
      c.fillStyle = '#8a5a2a'; c.fillRect(-12, -12, 24, 24);
      c.strokeStyle = '#4a2e14'; c.lineWidth = 2; c.strokeRect(-9.5, -9.5, 19, 19);
      c.beginPath(); c.moveTo(-9, -9); c.lineTo(9, 9); c.moveTo(9, -9); c.lineTo(-9, 9); c.stroke();
      break;
    case 'tire':
      c.fillStyle = OUT; c.beginPath(); c.arc(0, 0, 14, 0, 6.3); c.fill();
      c.fillStyle = '#2a2a34'; c.beginPath(); c.arc(0, 0, 12, 0, 6.3); c.fill();
      c.fillStyle = '#8a8a9a'; c.beginPath(); c.arc(0, 0, 5.5, 0, 6.3); c.fill();
      c.fillStyle = '#12121a'; c.beginPath(); c.arc(0, 0, 2.2, 0, 6.3); c.fill();
      break;
    case 'unit':   // server unit / battery pack
      c.fillStyle = OUT; c.fillRect(-14, -12, 28, 24);
      c.fillStyle = '#5a6478'; c.fillRect(-13, -11, 26, 22);
      c.fillStyle = '#3a4458'; c.fillRect(-13, -11, 26, 5);
      c.fillStyle = (Math.floor(t / 6) % 2) ? '#3dffa0' : '#ff2a4d'; c.fillRect(-10, 0, 4, 4);
      c.fillStyle = '#27f0ff'; c.fillRect(-3, 1, 12, 2);
      break;
    case 'grenade':
      c.save(); c.translate(-6, 0); drawWeaponShape(c, 'grenade', t); c.restore();
      break;
  }
}

// weapon in a hand (screen coords). ang: 0 = straight forward, < 0 = raised, > 0 = swung down
function drawHeldWeapon(c, id, x, y, dir, ang, t, s) {
  c.save(); c.translate(x, y); c.scale(dir * s, s); c.rotate(ang);
  drawWeaponShape(c, id, t);
  c.restore();
}
// swing angle of a fighter holding a weapon: windup raises it behind the head, the strike sweeps it down
function swingAngle(state, k) {   // k = progress in the current phase 0..1
  if (state === 'windup') return -1.15 - 1.2 * easeOut(k);
  if (state === 'strike') return -2.35 + 3.3 * easeOut(k);
  if (state === 'recover') return 0.95 - 2.1 * easeInOut(k);
  return -1.15;
}

// per-weapon angle of the hero's weapon (matches the sheet anims wchop / wstab / wspin / wbaton / whurl)
function heroWeaponAngle(id, hurl, ph, k, t) {
  if (hurl) return ph === 'windup' ? -1.5 - 0.9 * easeOut(k) : ph === 'strike' ? -2.4 + 2.5 * easeOut(k) : 0.1 - 0.3 * k;
  switch (id) {
    case 'bar':   return ph === 'windup' ? -1.2 - 1.4 * easeOut(k) : ph === 'strike' ? -2.6 + 3.5 * easeOut(k) : 0.9 - 1.0 * easeInOut(k);   // overhead chop
    case 'knife': return ph === 'windup' ? 0.35 - 0.25 * k : ph === 'strike' ? 0.1 - 0.15 * k : -0.05 + 0.1 * k;                              // straight stab
    case 'nunchaku': return ph === 'windup' ? -0.6 - t * 1.1 : ph === 'strike' ? 0.4 + 2.2 * (1 - easeOut(k)) - 2.2 : 1.2 - 1.3 * easeInOut(k);   // whirl overhead, then sweep
    case 'taser': return ph === 'windup' ? -1.5 - 0.3 * k : ph === 'strike' ? -1.8 + 2.3 * easeOut(k) : 0.5 - 0.6 * easeInOut(k);
    case 'grenade': return ph === 'windup' ? -1.5 - 0.9 * easeOut(k) : ph === 'strike' ? -2.4 + 2.5 * easeOut(k) : 0.1;
  }
  return swingAngle(ph, k);
}

// ============ world item ============
class WeaponItem {
  constructor(id, x, y, uses, o) {
    this.weapon = id; this.kind = id; this.x = x; this.y = y; this.z = o && o.z !== undefined ? o.z : 40; this.vz = o && o.z === 0 ? 0 : 3; this.t = (o && o.t) || 0;
    this.uses = uses || WEAPONS[id].uses; this.life = 1500; this.dead = false;
  }
  update() {
    this.t++;
    this.vz -= GRAV * 0.8; this.z += this.vz;
    if (this.z < 0) { this.z = 0; this.vz = this.vz < -2.5 ? -this.vz * 0.4 : 0; }
    if (--this.life <= 0) { this.dead = true; return; }
    this.near = Weapons.nearest(G.player) === this;
  }
  draw(c, camX) {
    const x = this.x - camX, bob = this.z > 0.5 ? 0 : Math.sin(this.t * 0.1) * 1.5, y = this.y - this.z - 6 - bob, d = WEAPONS[this.weapon];
    c.fillStyle = 'rgba(6,0,20,.4)'; c.beginPath(); c.ellipse(x, this.y + 1, 14, 3, 0, 0, 6.3); c.fill();
    if (this.life < 240 && this.t % 6 < 3) return;
    const gl = c.createRadialGradient(x, y, 2, x, y, 24); gl.addColorStop(0, d.col); gl.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.3 + 0.15 * Math.sin(this.t * 0.15); c.fillStyle = gl; c.fillRect(x - 24, y - 24, 48, 48);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    drawHeldWeapon(c, this.weapon, x - 8, y + 2, 1, -0.35, this.t, 1);
    if (this.near) {   // the one the PICKUP key would take
      drawText(c, d.name + '  ' + this.uses + '/' + d.uses, x, y - 26, { size: 8, color: d.col, outline: OUT, align: 'center' });
      drawText(c, K('V : PRENDRE', 'LT : PRENDRE'), x, y - 16, { size: 7, color: '#fff', outline: OUT, align: 'center', alpha: 0.75 + 0.25 * Math.sin(this.t * 0.2) });
    }
  }
}

// ============ lobbed object / grenade ============
// flies in an arc from (x, y, z) and lands on (tx, ty) after T frames; the landing is the attack (marker on the floor = warning)
class Lob {
  constructor(o) {
    Object.assign(this, { team: 'enemy', t: 0, dead: false, rot: 0, deflectable: false, kind: 'lob', blast: 34, dmg: 14, obj: 'barrel', flight: 50 }, o);
    const T = this.flight;
    this.vx = (this.tx - this.x) / T; this.vy = (this.ty - this.y) / T;
    this.vz = (GRAV * T * (T + 1) / 2 - this.z) / T;   // physics: vz -= GRAV; z += vz  ->  z is back to 0 after T frames
    this.spinV = (this.vx >= 0 ? 1 : -1) * (0.13 + Math.random() * 0.06);
  }
  update() {
    this.t++;
    this.vz -= GRAV; this.z += this.vz; this.x += this.vx; this.y += this.vy; this.rot += this.spinV;
    if (this.t % 3 === 0 && this.obj === 'grenade') FX.sparks(this.x, this.y - this.z, -Math.PI / 2, 1, 1, 2, '#ffe44d', 8, 1);
    if (this.z <= 0 && this.t > 3) this.land();
    else if (this.t > this.flight + 40) this.dead = true;
  }
  land() {
    this.dead = true; this.z = 0;
    const boom = this.obj === 'grenade', R = this.blast, p = G.player;
    FX.dust(this.x, this.y, boom ? 14 : 12); FX.ring(this.x, this.y, 4, R / 6, 18, boom ? '#ffb02f' : '#ffe44d', 3);
    if (boom) { FX.explosion(this.x, this.y - 12, 1.1); FX.flashScreen(0.3, '#ffd080'); FX.addShake(10); Snd.sfx.boom(); }
    else { FX.addShake(7); FX.sparks(this.x, this.y - 6, -Math.PI / 2, 3, 14, 7, '#c98a2a', 22); Snd.sfx.land(); Snd.sfx.slam(); }
    FX.freeze(3);
    if (this.team === 'enemy') {
      if (p && !p.dead && Math.abs(p.x - this.x) < R + p.hw && Math.abs(p.y - this.y) < R * 0.55 + 8 && p.z < 46) {
        if (p.iframes > 0) { G.onPerfectDodge(p, this); }
        else if (p.canBeHit()) {
          const dir = sgn(p.x - this.x) || 1;
          if (p.hurtBy(this.dmg, dir, 6.5, 4.5, this)) G.onPlayerHit(this, { dmg: this.dmg, hs: 7, shake: 6 }, dir);
        }
      }
      if (boom) for (const e of G.enemies) {   // friendly fire: the explosion hurts the other thugs too (and the hero gets the credit)
        if (e === this.owner || !e.hittable() || Math.abs(e.x - this.x) > R + e.hw || Math.abs(e.y - this.y) > R * 0.55 + 8) continue;
        G.registerHit(p, e, { dir: sgn(e.x - this.x) || 1, kb: 6, lift: 5, hs: 6, shake: 5, w: 2, name: 'FRIENDLY FIRE', fin: true }, Math.round(this.dmg * 0.8), false, false);
      }
    } else {
      const mv = { kb: 8.5, lift: 6.5, hs: 9, shake: 8, w: 3, name: 'BOOM', fin: true, x1: R };
      for (const e of G.enemies) {
        if (!e.hittable() || Math.abs(e.x - this.x) > R + e.hw || Math.abs(e.y - this.y) > R * 0.55 + 10) continue;
        G.registerHit(p, e, Object.assign({ dir: sgn(e.x - this.x) || 1 }, mv), Math.round(this.dmg * (e.boss ? 0.6 : 1)), true, false);
      }
      for (const pr of G.props) {
        if (!pr.breakable() || Math.abs(pr.x - this.x) > R + 10 || Math.abs(pr.y - this.y) > R * 0.55 + 14) continue;
        pr.onHit(p, mv, sgn(pr.x - this.x) || 1, 2);
      }
    }
  }
  shadow() {}
  draw(c, camX) {
    const x = this.x - camX, y = this.y - this.z;
    if (this.team === 'enemy') {   // landing marker (the telegraph)
      const tx = this.tx - camX, k = Math.min(1, this.t / this.flight), R = this.blast;
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.25 + 0.3 * k + 0.12 * Math.sin(this.t * 0.7);
      c.strokeStyle = '#ff2a4d'; c.fillStyle = 'rgba(255,42,77,.25)'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(tx, this.ty + 1, R * (0.55 + 0.45 * k), R * 0.28 * (0.55 + 0.45 * k), 0, 0, 6.3); c.fill(); c.stroke();
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    }
    const sh = clamp(1 - this.z / 200, 0.4, 1);
    c.fillStyle = 'rgba(6,0,20,' + (0.4 * sh) + ')'; c.beginPath(); c.ellipse(x, this.y + 1, 12 * sh, 3.4 * sh, 0, 0, 6.3); c.fill();
    c.save(); c.translate(x, y); c.rotate(this.rot); drawLobObj(c, this.obj, this.t); c.restore();
  }
}

// ============ weapon thrown by the hero ============
// flies flat and spinning; hits the first enemy / prop on its way, then lands on the floor as a pick-up (one use less)
class ThrownWeapon {
  constructor(o) {
    Object.assign(this, { team: 'player', t: 0, dead: false, rot: 0, deflectable: false, kind: 'thrown', vz: 1.4 }, o);
    this.vx = this.dir * 9; this.spinV = this.dir * 0.5;
  }
  update() {
    this.t++;
    this.x += this.vx; this.z += this.vz; this.vz -= GRAV * 0.3; this.rot += this.spinV;
    if (this.t % 2 === 0) FX.sparks(this.x, this.y - this.z, Math.PI, 0.3, 1, 2, '#ffffff', 6, 1);
    const p = G.player, dmg = THROW_DMG[this.id] || 12, mv = { dir: this.dir, kb: 5.5, lift: 2.5, hs: 6, shake: 4, w: 2, name: 'LANCER', z0: 20, z1: 60, stun: this.id === 'taser' ? 40 : 0 };
    for (const e of G.enemies) {
      if (!e.hittable() || Math.abs(e.x - this.x) > e.hw + 12 || Math.abs(e.y - this.y) > 18 || this.z > e.z + e.hh || this.z < e.z - 10) continue;
      G.registerHit(p, e, mv, dmg, false, false);
      if (this.id === 'taser') Weapons.shockFx(e);
      return this.land(e.x, e.y, true);
    }
    for (const pr of G.props) {
      if (!pr.breakable() || Math.abs(pr.x - this.x) > 20 || Math.abs(pr.y - this.y) > 18) continue;
      pr.onHit(p, mv, this.dir, 1);
      return this.land(this.x, this.y, true);
    }
    if (this.z <= 0 || this.x < G.bounds.minX - 10 || this.x > G.bounds.maxX + 10) this.land(clamp(this.x, G.bounds.minX + 10, G.bounds.maxX - 10), this.y, false);
  }
  land(x, y, hit) {
    this.dead = true;
    const uses = this.uses - 1;
    if (uses > 0) { const it = new WeaponItem(this.id, x - this.dir * (hit ? 8 : 0), clamp(y, LANE_MIN, LANE_MAX), uses, { z: hit ? 14 : 0, t: -20 }); it.vz = hit ? 2.5 : 0; G.pickups.push(it); }
    else FX.sparks(x, y - 20, -Math.PI / 2, 3, 8, 5, WEAPONS[this.id].col, 14);
    if (!hit) FX.dust(x, y, 3);
    Snd.sfx.clang && Snd.sfx.clang();
  }
  shadow() {}
  draw(c, camX) {
    const x = this.x - camX, y = this.y - this.z - 4, sh = clamp(1 - this.z / 120, 0.4, 1);
    c.fillStyle = 'rgba(6,0,20,' + (0.4 * sh) + ')'; c.beginPath(); c.ellipse(x, this.y + 1, 9 * sh, 2.6 * sh, 0, 0, 6.3); c.fill();
    c.save(); c.translate(x, y); c.rotate(this.rot); c.translate(-10 * this.dir, 0); c.scale(this.dir, 1); drawWeaponShape(c, this.id, this.t); c.restore();
  }
}

// ============ manager ============
const Weapons = {
  rnd() { return G.daily && G.daily.wrng ? G.daily.wrng() : Math.random(); },   // separate stream: the daily run keeps the same waves
  items() { let n = 0; for (const k of G.pickups) if (k.weapon) n++; return n; },
  enemyKinds: ['grunt', 'fast', 'rusher', 'heavy'],

  // ----- hero -----
  moveFor(id, bal) {
    const key = '_wm_' + id;
    if (!bal[key]) {
      const o = Object.assign({}, WEAPON_MV[id]), m = bal.mv;
      o.dmg = Math.max(1, Math.round(o.dmg * (0.9 + 0.1 * m.dmg)));
      o.st = Math.max(2, Math.round(o.st * (0.5 + 0.5 * m.st))); o.rc = Math.max(5, Math.round(o.rc * (0.5 + 0.5 * m.rc)));
      bal[key] = o;
    }
    return bal[key];
  },
  give(p, item) {
    const cur = p.weapon;
    if (cur && cur.id === item.weapon) { cur.uses = Math.min(WEAPONS[cur.id].uses, cur.uses + item.uses); }
    else {
      if (cur) G.pickups.push(new WeaponItem(cur.id, p.x - p.facing * 26, p.y, cur.uses, { t: -50, z: 20 }));   // swap: the old one drops (with its uses left)
      p.weapon = { id: item.weapon, uses: item.uses };
    }
    const d = WEAPONS[item.weapon];
    item.dead = true; G.addScore(50);
    FX.text(d.name + ' !', p.x, p.y - p.hh - 14, { color: d.col, size: 11, glow: d.col, life: 56 });
    FX.ring(item.x, item.y - 8, 3, 3.5, 16, d.col, 2); Snd.sfx.pickup();
    if (!G.weaponHint) { G.weaponHint = true; G.hint = { t: 0, text: K('V : RAMASSER / LANCER   -   POING : FRAPPER AVEC L\'ARME', 'LT : RAMASSER / LANCER   -   X : FRAPPER AVEC L\'ARME') }; }
  },
  // the item the PICKUP key would take (closest within reach), or null
  nearest(p) {
    if (!p || p.dead || p.z > 30 || !['idle', 'walk', 'crouch'].includes(p.state)) return null;
    let best = null, bd = 1e9;
    for (const it of G.pickups) {
      if (!it.weapon || it.dead || it.t < 12 || it.z > 24) continue;
      const dx = Math.abs(p.x - it.x), dy = Math.abs(p.y - it.y);
      if (dx > 44 || dy > 22) continue;
      const d = dx + dy * 1.5; if (d < bd) { bd = d; best = it; }
    }
    return best;
  },
  // PICKUP key: take the item at your feet (swaps with the held one), else throw the held weapon. true = consumed
  grabKey(p) {
    if (p.z > 2) return false;
    const it = this.nearest(p);
    if (it) { this.give(p, it); p.landLag = Math.max(p.landLag, 5); return true; }
    if (!p.weapon) return false;
    p.facingAssist(Input.ax());
    p.chainStep = 0; p.chainTimer = 0; p.dashWin = 0;
    p.state = 'attack'; p.move = HURL_MV; p.moveT = 0; p.moveHit = false; p.hitSet.clear(); p.trail.length = 0;
    Snd.sfx.swing(0.9);
    return true;
  },
  start(p, ax) {   // punch button while armed: swing (or toss) instead of the jab chain
    const mv = this.moveFor(p.weapon.id, p.bal);
    p.facingAssist(ax);
    p.chainStep = 0; p.chainTimer = 0; p.dashWin = 0;
    p.state = 'attack'; p.move = mv; p.moveT = 0; p.moveHit = false; p.hitSet.clear(); p.trail.length = 0;
    Snd.sfx.swing(mv.sfx);
  },
  toss(p) {   // grenade leaves the hand (PUNCH), or the held weapon is thrown away (PICKUP key)
    const w = p.weapon; if (!w) return;
    if (p.move && p.move.hurl && w.id !== 'grenade') {
      G.projs.push(new ThrownWeapon({ id: w.id, uses: w.uses, dir: p.facing, x: p.x + p.facing * 16, y: p.y, z: p.hh * 0.62, owner: p }));
      p.weapon = null; Snd.sfx.throw_(); FX.addShake(1.5);
      return;
    }
    const T = 40, tx = clamp(p.x + p.facing * 150, G.bounds.minX + 20, G.bounds.maxX - 20);
    G.projs.push(new Lob({ team: 'player', obj: 'grenade', x: p.x + p.facing * 14, y: p.y, z: p.hh * 0.7, tx, ty: p.y, flight: T, dmg: 34, blast: 54, owner: p }));
    Snd.sfx.throw_(); this.useUp(p);
  },
  useUp(p) {
    const w = p.weapon; if (!w) return;
    if (--w.uses > 0) return;
    const d = WEAPONS[w.id]; p.weapon = null;
    FX.text(w.id === 'grenade' ? 'PLUS DE GRENADE' : d.name + ' CASSEE !', p.x, p.y - p.hh - 12, { color: '#ff9ae9', size: 10, life: 50 });
    if (w.id !== 'grenade') { FX.sparks(p.x + p.facing * 24, p.y - 40, -Math.PI / 2, 3, 10, 6, d.col, 20); Snd.sfx.clang(); }
  },
  shockFx(e) {
    FX.ring(e.x, e.y - e.z - 34, 3, 4, 14, '#27f0ff', 2); FX.sparks(e.x, e.y - e.z - 34, 0, 6.3, 10, 6, '#27f0ff', 16, 1); Snd.sfx.zap(0.5);
  },
  drawHeld(c, camX, f) {   // hero and armed enemies: the weapon in the front hand
    const id = f.weapon && (f.weapon.id || f.weapon); if (!id || !f.lastJ || f.dead) return;
    const hF = f.worldTip(f.lastJ, 'hF');
    let ang = -1.15, t = f.t;
    if (f.move && f.state === 'attack') {   // hero
      const mv = f.move, mt = f.moveT, rs = mv.st + mv.ac;
      const ph = mt < mv.st ? 'windup' : mt < rs ? 'strike' : 'recover', k = ph === 'windup' ? mt / mv.st : ph === 'strike' ? (mt - mv.st) / mv.ac : Math.min(1, (mt - rs) / mv.rc);
      ang = heroWeaponAngle(f.weapon && f.weapon.id, mv.hurl, ph, clamp(k, 0, 1), mt);
    } else if (f.atk && f.state !== 'move') {   // enemy
      const a = f.atk;
      if (f.state === 'windup') ang = swingAngle('windup', f.stT / a.st);
      else if (f.state === 'attack') ang = swingAngle('strike', Math.min(1, f.stT / Math.max(1, a.ac)));
      else if (f.state === 'recover') ang = swingAngle('recover', Math.min(1, f.stT / a.rc));
    }
    if (f.state === 'launched' || f.state === 'down' || f.state === 'dead' || f.state === 'getup') ang = 0.9;
    drawHeldWeapon(c, id, hF[0] - camX, hF[1], f.facing, ang, t, ((f.style && f.style.scale) || EU) / EU);
  },
  drawHud(c, p) {
    const w = p.weapon; if (!w) return;
    const d = WEAPONS[w.id], x = 214, y = 20;
    c.fillStyle = 'rgba(10,0,30,.75)'; c.fillRect(x - 4, y - 3, 58, 26);
    c.strokeStyle = d.col; c.lineWidth = 1; c.strokeRect(x - 3.5, y - 2.5, 57, 25);
    drawHeldWeapon(c, w.id, x + 6, y + 12, 1, -0.5, G.frame, 0.62);
    const max = d.uses;
    for (let i = 0; i < Math.min(max, 14); i++) {
      const on = i < w.uses, px = x + 24 + (i % 7) * 4, py = y + 6 + Math.floor(i / 7) * 5, low = w.uses <= 2 && w.id !== 'grenade';
      c.fillStyle = on ? (low && G.frame % 20 < 10 ? '#ff2a4d' : low ? '#ff9ae9' : d.col) : '#2a1a4a'; c.fillRect(px, py, 3, 3);
    }
    drawText(c, d.name, x + 28, y + 21, { size: 6, color: '#fff', outline: OUT, align: 'center' });
  },

  // ----- level / waves -----
  levelWeapon(level) { return WEAPON_BY_LEVEL[level % WEAPON_BY_LEVEL.length]; },
  spawnOnFloor(id) {
    if (this.items() >= 2) return null;
    const kind = id || (this.rnd() < 0.4 ? 'bar' : this.levelWeapon(G.level));
    const x = G.camX + 90 + this.rnd() * (W - 180), y = LANE_MIN + 8 + this.rnd() * (LANE_MAX - LANE_MIN - 16);
    const it = new WeaponItem(kind, x, y, 0, { z: 170 });
    G.pickups.push(it);
    FX.text('ARME !', x, y - 90, { color: WEAPONS[kind].col, size: 10, glow: WEAPONS[kind].col, life: 50 });
    return it;
  },
  // arcade stop reached (or a new endless wave): a weapon falls into the arena
  onArena(chance) { if (this.rnd() < chance) this.spawnOnFloor(); },

  // ----- enemies -----
  rollEnemy(kind) {
    if (!this.enemyKinds.includes(kind)) return null;
    const n = G.mode === 'endless' && G.endless ? G.endless.wave : 0;
    const base = G.mode === 'endless' ? Math.min(0.2, 0.03 + 0.012 * n) : [0.04, 0.06, 0.09, 0.12][Math.min(3, G.level)];   // rare
    if (this.rnd() >= base) return null;
    return this.rnd() < 0.55 ? this.levelWeapon(G.level) : 'bar';
  },
  enemyAtk(id) { return ENEMY_WEAPON_ATK[id]; },
  // an enemy lobs something at the hero (BRUTE barrels, grenadier thugs)
  enemyLob(e, a) {
    const p = G.player; if (!p) return;
    const dist = Math.abs(p.x - e.x), T = a.flight || clamp(Math.round(34 + dist * 0.18), 40, 64);
    const lead = Math.min(T, 40) * 0.5;
    const tx = clamp(p.x + p.vx * lead, G.bounds.minX + 24, G.bounds.maxX - 24), ty = clamp(p.y + p.vy * lead, LANE_MIN + 2, LANE_MAX - 2);
    const obj = a.obj === 'object' ? LOB_OBJ[G.level % LOB_OBJ.length] : a.obj;
    G.projs.push(new Lob({ team: 'enemy', obj, x: e.x + e.facing * 10, y: e.y, z: e.hh * 1.05, tx, ty, flight: T, dmg: a.dmg, blast: a.blast || 38, owner: e }));
    Snd.sfx.throw_(); FX.addShake(2);
  }
};

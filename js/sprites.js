'use strict';
// Pixel-art sprite-sheet renderer (sheets made by tools/make_hero_sprites.py and tools/make_enemy_sprites.py).
// Everything falls back to the procedural rig when a sheet is missing.
class SpriteSheet {
  constructor(data) { this.data = data; this.ready = false; this.sheet = null; this.tinted = {}; this.frames = null; this.ax = 48; this.ay = 88; this.scale = 1; }
  load(cb) {
    if (!this.data) { cb && cb(); return; }
    const img = new Image();
    img.onload = () => {
      this.sheet = img; this.frames = this.data.json.frames;
      const m = this.data.json.meta; if (m.anchor) { this.ax = m.anchor.x; this.ay = m.anchor.y; } if (m.scale) this.scale = m.scale;
      // flat-colour silhouettes for hit flash and dash afterimages
      const cols = { white: '#ffffff', cyan: '#27f0ff', pink: '#ff2fd0' };
      for (const k in cols) {
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const x = c.getContext('2d'); x.drawImage(img, 0, 0);
        x.globalCompositeOperation = 'source-in'; x.fillStyle = cols[k]; x.fillRect(0, 0, c.width, c.height);
        this.tinted[k] = c;
      }
      this.ready = true; cb && cb();
    };
    img.onerror = () => { cb && cb(); };
    img.src = this.data.img;
  }
  has(n) { return !!(this.frames && this.frames[n]); }
  first(...names) { for (const n of names) if (this.has(n)) return n; return null; }
  // o: {sx, sqx, sqy, rot}; tint: undefined | 'white' | 'cyan' | 'pink'
  draw(c, name, x, y, facing, o, tint) {
    const f = this.frames[name]; if (!f) { (SpriteSheet.missing = SpriteSheet.missing || {})[name] = 1; return; }
    const r = f.frame, src = tint ? this.tinted[tint] : this.sheet;
    o = o || {};
    c.save();
    c.translate(Math.round(x), Math.round(y));
    c.scale(facing * (o.sx === undefined ? 1 : o.sx) * (o.sqx || 1), o.sqy || 1);
    if (o.rot) { const pv = 25 * this.scale; c.translate(0, -pv); c.rotate(o.rot); c.translate(0, pv); }
    c.imageSmoothingEnabled = false;
    c.drawImage(src, r.x, r.y, r.w, r.h, -this.ax, -this.ay, r.w, r.h);
    c.restore();
  }
}

class HeroSheet extends SpriteSheet {}
// Hero animation v7: the sheet carries its animation table (meta.anims, from tools/hero_anim.py):
//   {anim: {f: [frame names], w: [weights], ph: 'phase letter per frame'}}
// phase 'l' = loop frame (weight = ticks), 'w' / 's' / 'r' = startup / active / recovery (weight = share of that phase).
HeroSheet.prototype.anim = function (name) {
  const A = this.data && this.data.json.meta.anims; return A && A[name];
};
// frame of phase `ph` of animation `name` at progress q (0..1) through that phase
HeroSheet.prototype.at = function (name, ph, q) {
  const a = this.anim(name); if (!a) return null;
  let tot = 0; for (let i = 0; i < a.f.length; i++) if (a.ph[i] === ph) tot += a.w[i];
  let acc = 0, last = null; const tq = clamp(q, 0, 0.9999) * tot;
  for (let i = 0; i < a.f.length; i++) {
    if (a.ph[i] !== ph) continue; last = a.f[i]; acc += a.w[i];
    if (tq < acc) return a.f[i];
  }
  return last;
};
// looping animation driven by a tick counter
HeroSheet.prototype.loop = function (name, t) {
  const a = this.anim(name); if (!a) return null;
  let tot = 0; for (const w of a.w) tot += w;
  let m = ((t % tot) + tot) % tot;
  for (let i = 0; i < a.f.length; i++) { m -= a.w[i]; if (m < 0) return a.f[i]; }
  return a.f[0];
};
HeroSheet.prototype.frameFor = function (p) {
  // state clock + landing detection (kept on the fighter, no game-logic change needed)
  const air = p.state === 'air' || (p.state === 'attack' && p.move && p.move.air);
  if (p._as !== p.state) {
    if (p._wasAir && (p.state === 'idle' || p.state === 'walk')) p._landT0 = p.t;
    p._as = p.state; p._st0 = p.t;
  }
  p._wasAir = air;
  const st = p.t - p._st0, sinceLand = p._landT0 === undefined ? 99 : p.t - p._landT0;
  const CROUCHED = { low: 1, upper: 1, rknee: 1 };
  switch (p.state) {
    case 'idle': case 'walk':
      if (sinceLand < 8) return this.at('land', 'w', sinceLand / 8);
      if (p.state === 'idle') return this.loop('idle', p.t);
      return this.anim('walk').f[Math.floor(((p.walkPhase % (Math.PI * 2)) / (Math.PI * 2)) * 8) % 8];
    case 'crouch': return st < 4 ? 'crouch_in' : this.loop('crouch', st);
    case 'air': return p.vz > 4 ? 'jump_up0' : p.vz > 1.5 ? 'jump_up1' : p.vz > -1.5 ? 'jump_top' : p.vz > -4.5 ? 'jump_fall0' : 'jump_fall1';
    case 'dash': return this.at(p.airDash ? 'airdash' : 'dash', 'w', p.dashT / DASH_LEN);
    case 'attack': {
      const mv = p.move, pt = p.moveT, rs = mv.st + mv.ac;
      if (pt < mv.st) return this.at(mv.pw, 'w', pt / mv.st);
      if (pt < rs) return this.at(mv.pw, 's', (pt - mv.st) / mv.ac);
      if (pt < rs + mv.rc) return this.at(mv.pw, 'r', (pt - rs) / mv.rc);
      return mv.air ? 'jump_fall0' : CROUCHED[mv.pw] ? 'crouch_0' : 'idle_0';
    }
    case 'special': {
      const t = p.specialT;
      if (t < 20) return this.at('fury', 'w', t / 20);
      if (t < 76) return this.loop('spin', t - 20);
      return this.at('fury_end', 'r', (t - 76) / 20);
    }
    case 'clinch': return this.anim('clinch') ? this.loop('clinch', p.clinchT) : 'knee_w0';
    case 'throw': {
      const T = CLINCH.throwT, t = p.throwT;
      if (!this.anim('throw')) return t < T.w ? 'knee_w0' : 'cross_s0';
      if (t < T.w) return this.at('throw', 'w', t / T.w);
      if (t < T.w + T.s) return this.at('throw', 's', (t - T.w) / T.s);
      return this.at('throw', 'r', (t - T.w - T.s) / T.r);
    }
    case 'hurt': return this.at('hurt', 'w', 1 - p.stunT / 16);
    case 'launched': return p.vz > 1.5 ? 'tumble_0' : 'tumble_1';
    case 'down': return p.stunT > 36 ? 'down_0' : 'down_1';
    case 'getup': return this.at('getup', 'w', 1 - p.stunT / 18);
    case 'dead': return 'down_1';
  }
  return 'idle_0';
};

// playable heroes: same moveset, own sheet / portrait / texts (tools/make_hero_sprites.py [veex|roxy])
const HERO_LOOKS = {
  veex: { name: 'VEEX', tag: 'VEEX  -  LE MULLET', outro: 'VEEX REMONTE SUR SA MOTO, LE MULLET AU VENT...',
          sheet: new HeroSheet(typeof HERO_SHEET !== 'undefined' ? HERO_SHEET : null), portrait: null },
  roxy: { name: 'ROXY', tag: 'ROXY  -  LA TORNADE', outro: 'ROXY REMONTE SUR SES ROLLERS, LA QUEUE DE CHEVAL AU VENT...',
          sheet: new HeroSheet(typeof HERO_SHEET_ROXY !== 'undefined' ? HERO_SHEET_ROXY : null), portrait: null }
};
const HERO_ORDER = Object.keys(HERO_LOOKS).filter(k => HERO_LOOKS[k].sheet.data);
let HeroSprites = HERO_LOOKS.veex.sheet;
function selectHero(k) { if (!HERO_LOOKS[k]) k = 'veex'; G.hero = k; HeroSprites = HERO_LOOKS[k].sheet; }
function heroLook() { return HERO_LOOKS[G.hero] || HERO_LOOKS.veex; }
function loadHeroSprites() {
  for (const k in HERO_LOOKS) {
    const L = HERO_LOOKS[k]; L.sheet.load();
    const src = k === 'veex' ? (typeof ASSETS !== 'undefined' && ASSETS.portrait) : L.sheet.data && L.sheet.data.portrait;
    if (src) { const im = new Image(); im.onload = () => { L.portrait = im; }; im.src = src; }
    const photo = k !== 'veex' && typeof ASSETS !== 'undefined' && ASSETS['portrait_' + k];   // real title photo (public/<hero>.png); the pixel portrait stays for the HUD
    if (photo) { const im = new Image(); im.onload = () => { L.photo = im; }; im.src = photo; }
  }
}

// one sheet per enemy look (key = l<level>_<kind>)
const EnemySprites = {};
if (typeof ENEMY_SHEETS !== 'undefined') for (const k in ENEMY_SHEETS) EnemySprites[k] = new SpriteSheet(ENEMY_SHEETS[k]);
function loadEnemySprites() { for (const k in EnemySprites) EnemySprites[k].load(); }

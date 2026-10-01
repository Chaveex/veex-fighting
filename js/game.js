'use strict';
// ============ global game state ============
const G = {
  state: 'title', frame: 0, hero: 'veex', camX: 0, bounds: { minX: 0, maxX: W }, player: null,
  enemies: [], projs: [], beams: [], pickups: [], vents: [], props: [], seenProps: {}, spawnQ: [], tokens: 0, maxTok: 2,
  level: 0, stopIdx: 0, locked: false, waveIdx: 0, lives: 3, score: 0, hpMul: 1,
  combo: { count: 0, timer: 0, max: 0, cancels: 0, dodges: 0 }, sty: { v: 0, idle: 0 },
  target: null, targetT: 0, boss: null, banner: null, goT: 0, clearT: 0, deathT: 0,
  hint: null, stats: {}, menuT: 0, best: 0, muted: false, bot: false, god: false, levelStartScore: 0, pauseIdx: 0
};
const RANKS = [
  { n: '', t: 0 }, { n: 'D', w: 'DOPE', t: 14 }, { n: 'C', w: 'COOL', t: 34 }, { n: 'B', w: 'RAD', t: 60 }, { n: 'A', w: 'GNARLY', t: 92 },
  { n: 'S', w: 'TUBULAR', t: 130 }, { n: 'SS', w: 'MAXIMUM!', t: 180 }, { n: 'SSS', w: 'LEGENDARY!!', t: 250 }
];
G.rank = () => { let r = 0; for (let i = 1; i < RANKS.length; i++) if (G.sty.v >= RANKS[i].t) r = i; return r; };
G.addStyle = n => { if (!n) return; G.sty.v = Math.min(300, G.sty.v + n); G.sty.idle = 0; };
G.styleHurt = () => { G.sty.v *= 0.35; };
G.addScore = n => { G.score += Math.round(n * (1 + G.rank() * 0.25)); };
G.tokenFree = () => G.tokens < G.maxTok;

const cv = document.getElementById('game'), sctx = cv.getContext('2d');
const buf = document.createElement('canvas'); buf.width = W; buf.height = H;
const bc = buf.getContext('2d');
const bloomC = document.createElement('canvas'); bloomC.width = 160; bloomC.height = 90; const bloomX = bloomC.getContext('2d');
const tintC = document.createElement('canvas'); tintC.width = W; tintC.height = H; const tintX = tintC.getContext('2d');
const vig = document.createElement('canvas'); vig.width = W; vig.height = H;
(() => {
  const v = vig.getContext('2d'), g = v.createRadialGradient(W / 2, H / 2, H * 0.38, W / 2, H / 2, H * 0.95);
  g.addColorStop(0, 'rgba(10,0,30,0)'); g.addColorStop(1, 'rgba(10,0,30,.62)'); v.fillStyle = g; v.fillRect(0, 0, W, H);
})();
let portraitImg = null;

// ============ persistence ============
function loadSave() {
  try { G.best = parseInt(localStorage.getItem('veexBest') || '0', 10) || 0; } catch (e) { G.best = 0; }
  try { selectHero(localStorage.getItem('veexHero') || 'veex'); } catch (e) { selectHero('veex'); }
}
function saveHero() { try { localStorage.setItem('veexHero', G.hero); } catch (e) { /* ignore */ } }
function saveBest() { try { if (G.score > G.best) { G.best = G.score; localStorage.setItem('veexBest', String(G.best)); } } catch (e) { /* ignore */ } }

// ============ level flow ============
// ---------- title-screen code entry: C opens a field, ENTER validates, ESC closes ----------
// NEON / INSERTCOIN / VICE / CYBER = start stage 1..4 | BOSS = toggle "start at the boss" | INVINCIBLE = god mode on/off
const CHEATS = { NEON: 0, INSERTCOIN: 1, VICE: 2, CYBER: 3, BOSS: 'boss', INVINCIBLE: 'god' };
function codeKey(e) {
  const ce = G.codeEntry;
  if (!ce) { if (e.code === 'KeyC' && !e.repeat && !G.cheatGo) { G.codeEntry = { text: '', msg: '', col: '#fff', t: 0, shake: 0 }; Snd.sfx.ui(); Input.clear(); e.preventDefault(); } return; }
  e.preventDefault();
  if (e.key === 'Escape') { G.codeEntry = null; Snd.sfx.ui(); Input.clear(); return; }
  if (e.key === 'Backspace') { ce.text = ce.text.slice(0, -1); return; }
  if (e.key === 'Enter') { submitCode(ce); return; }
  if (e.key.length === 1 && /[a-z0-9]/i.test(e.key) && ce.text.length < 12) ce.text += e.key.toUpperCase();
}
function submitCode(ce) {
  const v = CHEATS[ce.text];
  if (v === undefined) { ce.msg = 'CODE INVALIDE'; ce.col = '#ff2a4d'; ce.shake = 12; ce.text = ''; Snd.sfx.hurt && Snd.sfx.hurt(); return; }
  Snd.sfx.select(); ce.text = '';
  if (v === 'boss') { G.cheatBoss = !G.cheatBoss; ce.msg = G.cheatBoss ? 'DEPART AU BOSS : ON' : 'DEPART AU BOSS : OFF'; ce.col = '#3dffa0'; return; }
  if (v === 'god') { G.god = !G.god; ce.msg = G.god ? 'INVINCIBLE : ON' : 'INVINCIBLE : OFF'; ce.col = '#3dffa0'; return; }
  ce.msg = 'STAGE ' + (v + 1) + ' - ' + LEVELS[v].name + (G.cheatBoss ? ' (BOSS)' : ''); ce.col = '#3dffa0';
  G.cheatGo = { li: v, t: 45 };
}
function jumpToStop(k) {
  k = clamp(k | 0, 0, LEVELS[G.level].stops.length - 1);
  G.stopIdx = k; G.camX = Math.max(0, LEVELS[G.level].stops[k].x - 160); G.player.x = G.camX + 120; G.banner = null;
}
function drawCodeEntry(c) {
  const ce = G.codeEntry; if (!ce) return; ce.t++;
  c.fillStyle = 'rgba(5,1,15,.78)'; c.fillRect(0, 0, W, H);
  const w = 300, h = 120, x = (W - w) / 2, y = (H - h) / 2, sx = ce.shake > 0 ? Math.sin(ce.shake-- * 2) * 4 : 0;
  c.fillStyle = 'rgba(16,6,40,.95)'; c.fillRect(x, y, w, h);
  c.strokeStyle = '#ff2fd0'; c.lineWidth = 2; c.strokeRect(x - 1, y - 1, w + 2, h + 2); c.strokeStyle = '#27f0ff'; c.lineWidth = 1; c.strokeRect(x - 5.5, y - 5.5, w + 11, h + 11);
  drawText(c, 'ENTRER UN CODE', W / 2, y + 24, { size: 14, color: '#ffe44d', outline: OUT, align: 'center', italic: true, glow: '#ff2fd0' });
  c.fillStyle = '#05010f'; c.fillRect(x + 40 + sx, y + 38, w - 80, 26); c.strokeStyle = '#8b5cff'; c.strokeRect(x + 40.5 + sx, y + 38.5, w - 81, 25);
  const cur = ce.t % 40 < 22 ? '_' : ' ';
  drawText(c, ce.text + cur, W / 2 + sx, y + 57, { size: 14, color: '#fff', outline: OUT, align: 'center' });
  if (ce.msg) drawText(c, ce.msg, W / 2, y + 82, { size: 10, color: ce.col, outline: OUT, align: 'center', glow: ce.col });
  drawText(c, 'ENTREE : VALIDER   -   ECHAP : RETOUR', W / 2, y + h - 10, { size: 9, color: '#27f0ff', outline: OUT, align: 'center' });
}

function startGame(li) {
  G.lives = 3; G.score = 0; G.level = li; G.player = null; G.sty.v = 0; G.seenProps = {};
  startLevel(li);
}
function startLevel(li) {
  G.level = li; const L = LEVELS[li];
  G.enemies = []; G.projs = []; G.beams = []; G.pickups = []; G.spawnQ = []; G.tokens = 0;
  G.props = (L.props || []).map(p => makeProp(p[0], p[1], p[2], p[3]));
  G.vents = L.vents.map(v => new SteamVent(v[0], v[1], Object.assign({ delay: v[2] || 0 }, L.ventTiming))); G.maxTok = li < 2 ? 2 : 3;
  G.hpMul = 1 + li * 0.1; G.dmgMul = 1 + li * 0.12;
  FX.reset(); BG.init(li);
  G.camX = 0; G.stopIdx = 0; G.locked = false; G.waveIdx = 0; G.frame = 0; G.boss = null; G.clearT = 0; G.deathT = 0; G.goT = 0;
  G.bounds = { minX: 0, maxX: W };
  const old = G.player;
  G.player = new Player(60, 306);
  if (old && !old.dead) { G.player.hp = Math.max(old.hp, 70); G.player.meter = old.meter; }
  G.combo = { count: 0, timer: 0, max: 0, cancels: 0, dodges: 0 };
  G.stats = { kills: 0, hits: 0, t0: 0, dmgTaken: 0 };
  G.levelStartScore = G.score; G.target = null;
  G.banner = { t: 0, title: L.name, sub: L.sub, kind: 'level' };
  G.hint = { t: 0, text: L.hint };
  G.state = 'play'; Input.clear();
  Snd.playMusic(L.music, false);
}

function spawnEnemy(kind, x, y, opts) {
  const looks = LOOKS[G.level];
  const look = looks[kind] || LOOKS[0][kind];
  const e = new Enemy(kind, look, x, y);
  if (opts && opts.flash) { e.entered = true; e.invulT = 24; FX.ring(x, y - 30, 4, 4, 16, '#ff2fd0', 2); FX.glow(x, y - 30, 30, 8, '#fff'); }
  G.enemies.push(e);
  if (e.boss) G.boss = e;
  return e;
}
G.spawnEnemy = spawnEnemy;

function lockStop() {
  const L = LEVELS[G.level], stop = L.stops[G.stopIdx];
  G.locked = true; G.waveIdx = 0;
  G.bounds = { minX: G.camX, maxX: G.camX + W };
  if (stop.boss) {
    const look = LOOKS[G.level][stop.boss];
    G.banner = { t: 0, title: 'WARNING', sub: look.name, kind: 'boss' };
    Snd.sfx.warn(); Snd.playMusic(L.music, true); FX.flashScreen(0.4, '#ff2a4d');
    const e = spawnEnemy(stop.boss, G.camX + W + 40, 300);
    e.facing = -1;
  } else nextWave();
}
function nextWave() {
  const stop = LEVELS[G.level].stops[G.stopIdx];
  const kinds = stop.waves[G.waveIdx++];
  let side = Math.random() < 0.5 ? -1 : 1, i = 0;
  for (const k of kinds) { G.spawnQ.push({ kind: k, t: i * 26 + 4, side }); side = -side; i++; }
}
function liveEnemies() { let n = 0; for (const e of G.enemies) if (!e.dead) n++; return n; }

function stageLogic() {
  const L = LEVELS[G.level], stop = L.stops[G.stopIdx];
  // spawn queue
  for (let i = G.spawnQ.length - 1; i >= 0; i--) {
    const q = G.spawnQ[i];
    if (--q.t <= 0) {
      G.spawnQ.splice(i, 1);
      const x = q.side < 0 ? G.camX - 26 : G.camX + W + 26;
      spawnEnemy(q.kind, x, rand(LANE_MIN + 4, LANE_MAX - 4));
    }
  }
  if (G.clearT > 0) { if (--G.clearT === 0) finishLevel(); return; }
  // camera
  const p = G.player;
  if (!stop) return;
  if (!G.locked) {
    const target = clamp(p.x - W * 0.42, G.camX, stop.x);
    G.camX += (target - G.camX) * 0.14;
    if (Math.abs(stop.x - G.camX) < 1.2 && G.camX >= stop.x - 1.2) { G.camX = stop.x; lockStop(); }
    G.bounds = { minX: G.camX, maxX: G.camX + W };
    if (G.goT > 0) G.goT--;
  } else {
    G.bounds = { minX: G.camX, maxX: G.camX + W };
    if (stop.boss) {
      if (G.boss && G.boss.dead && G.clearT === 0 && !G.bossDeadHandled) {
        G.bossDeadHandled = true; G.clearT = 190; G.spawnQ.length = 0;
        FX.slow(70, 0.22); FX.flashScreen(0.9, '#fff'); FX.addShake(16); FX.explosion(G.boss.x, G.boss.y - 40, 2.2); Snd.sfx.boom();
        FX.text('K.O.!!', G.boss.x, G.boss.y - 100, { color: '#ffe44d', size: 26, glow: '#ff2fd0', life: 90 });
        Snd.stopMusic();
      }
    } else if (G.spawnQ.length === 0) {
      const alive = liveEnemies();
      if (G.waveIdx < stop.waves.length && alive <= 1) nextWave();
      else if (G.waveIdx >= stop.waves.length && alive === 0) {
        G.locked = false; G.stopIdx++; G.goT = 300; Snd.sfx.go();
        FX.text('GO!', p.x, p.y - 100, { color: '#3dffa0', size: 20, glow: '#3dffa0', life: 50 });
      }
    }
  }
}

function finishLevel() {
  G.state = 'clear'; G.menuT = 0; G.bossDeadHandled = false;
  const p = G.player;
  const bonus = Math.round(p.hp * 20) + G.stats.kills * 10 + G.combo.max * 25 + G.combo.dodges * 100 + G.combo.cancels * 30;
  G.clearBonus = bonus; G.score += bonus; saveBest();
  Snd.sfx.fanfare(); Input.clear();
}

// ============ combat hooks (juice lives here) ============
G.registerHit = function (att, e, mv, dmg, crit, counter) {
  const dir = mv.dir !== undefined ? mv.dir : att.facing;
  const w = mv.w || 1;
  const wasLaunched = e.state === 'launched' || e.z > 1;
  e.takeHit(dir, mv, dmg, crit, counter);
  const killed = e.hp <= 0;
  const hx = e.x - dir * e.hw * 0.4;
  const hy = e.y - e.z - clamp(((att.z || 0) + ((mv.z0 !== undefined ? mv.z0 : 20) + (mv.z1 !== undefined ? mv.z1 : 60)) / 2) - e.z, 14, e.hh * 0.85);
  const power = Math.min(3, (w >= 3 ? 3 : w === 2 ? 2 : 1) + (crit && w < 3 ? 1 : 0));
  FX.impact(hx, hy, dir, power, crit);
  Snd.sfx.hit(power); if (crit) Snd.sfx.crit();
  let hs = (mv.hs || 3) + (crit ? 4 : 0);
  if (killed) hs = Math.max(hs, 13);
  FX.freeze(hs);
  FX.addShake((mv.shake || 2) * (crit ? 1.35 : 1) + (killed ? 6 : 0));
  if (crit) { FX.punch(0.045, hx - G.camX, hy); FX.aberr = Math.max(FX.aberr, 6); FX.slow(11, 0.3); FX.flashScreen(0.16, '#fff'); }
  else if (w >= 2) FX.punch(0.018, hx - G.camX, hy);
  Input.rumble(0.25 * power, 0.35 * power, 60 + power * 30);
  // combo + style + meter
  G.combo.count++; G.combo.timer = 110; G.combo.max = Math.max(G.combo.max, G.combo.count); G.stats.hits++;
  let st = 5 + (crit ? 6 : 0) + (wasLaunched ? 4 : 0) + Math.min(6, G.combo.count * 0.4);
  G.addStyle(st);
  if (att === G.player) {
    att.meter = Math.min(100, att.meter + dmg * 0.55);
    att.dashCharges = Math.min(3, att.dashCharges + 0.22);
  }
  G.addScore(dmg * 4);
  // labels
  const col = crit ? '#ffe44d' : '#fff';
  FX.text(String(dmg), hx + rand(-6, 6), hy - 12, { size: crit ? 15 : 10, color: col, life: 40, glow: crit ? '#ff2fd0' : null });
  if (counter) FX.text('COUNTER!', hx, hy - 30, { size: 11, color: '#ff2fd0', glow: '#ff2fd0', life: 44 });
  else if (mv.fin && mv.name) FX.text(mv.name, hx, hy - 30, { size: 10, color: '#27f0ff', glow: '#27f0ff', life: 40 });
  else if (w >= 2 && Math.random() < 0.5) FX.text(pick(HIT_WORDS), hx + dir * 10, hy - 26, { size: 9, color: '#ffb0f0', life: 24, vy: -0.6 });
  G.target = e; G.targetT = 200;
  if (e.boss) checkBossPhase(e);
  if (killed) onKill(e, dir, hx, hy);
};

function checkBossPhase(e) {
  const th = e.def.phases;
  if (!th || e.phase >= th.length || e.hp <= 0) return;
  if (e.hp / e.maxHp <= th[e.phase]) {
    e.phase++;
    e.invulT = 46; e.poise = 0;
    FX.text('ENRAGED!', e.x, e.y - e.hh - 16, { color: '#ff2a4d', size: 18, glow: '#ff2a4d', life: 80 });
    FX.flashScreen(0.55, '#ff2a4d'); FX.addShake(12); FX.freeze(16); FX.ring(e.x, e.y - 30, 6, 8, 30, '#ff2a4d', 4); FX.explosion(e.x, e.y - 40, 0.8);
    Snd.sfx.boom();
    e.setState('recover'); e.atk = { rc: 40, pw: 'arms_up' }; e.acd = {}; e.cool = 30;
  }
}
G.bossStagger = function (e) {
  FX.text('STAGGER!', e.x, e.y - e.hh - 10, { color: '#ffe44d', size: 13, glow: '#ffe44d', life: 50 });
  FX.slow(14, 0.35); FX.ring(e.x, e.y - 40, 6, 6, 20, '#ffe44d', 3);
};

function onKill(e, dir, hx, hy) {
  G.stats.kills++;
  G.addScore(e.score); G.addStyle(14);
  FX.explosion(hx, hy, e.boss ? 1.6 : 0.8);
  FX.slow(e.boss ? 40 : 26, 0.28); FX.punch(0.08, hx - G.camX, hy); FX.aberr = Math.max(FX.aberr, 14);
  FX.flashScreen(e.boss ? 0.7 : 0.35, '#fff'); FX.addShake(e.boss ? 14 : 9);
  Snd.sfx.ko();
  FX.text('K.O.', e.x, e.y - e.hh - 6, { color: '#ff2fd0', size: e.boss ? 20 : 13, glow: '#ff2fd0', life: 50 });
  Input.rumble(1, 0.8, 200);
  if (!e.boss) {
    const d = e.def.drop || 0.1;
    let kind = null;
    if (Math.random() < d) kind = pick(['soda', 'soda', 'pizza', 'tape']);
    if (G.player.hp < 35 && Math.random() < 0.25) kind = 'pizza';
    if (kind) G.pickups.push(new Pickup(kind, e.x, e.y));
  } else {
    G.pickups.push(new Pickup('pizza', e.x - 20, e.y), new Pickup('tape', e.x + 20, e.y));
  }
}
G.floatDmg = function (e, dmg, crit) { FX.text(String(dmg), e.x, e.y - e.z - 50, { size: 9, color: '#ffe44d', life: 30 }); };

G.onPlayerHit = function (src, a, dir) {
  const p = G.player;
  G.stats.dmgTaken += a.dmg;
  FX.freeze(Math.max(4, a.hs || 5)); FX.addShake((a.shake || 4) + 2); FX.flashScreen(0.4, '#ff1040'); FX.aberr = Math.max(FX.aberr, 8);
  FX.impact(p.x, p.y - p.z - 34, -dir, 2, false);
  FX.text(String(Math.round(a.dmg)), p.x, p.y - p.z - 76, { size: 12, color: '#ff4060', life: 36 });
  Snd.sfx.hurt(); Input.rumble(0.9, 0.6, 180);
  p.shakeT = 6;
};
G.onPerfectDodge = function (p, src) {
  FX.slow(46, 0.3); FX.punch(0.05, p.x - G.camX, p.y - 40); FX.flashScreen(0.18, '#27f0ff');
  FX.text('PERFECT DODGE!', p.x, p.y - p.z - 90, { size: 13, color: '#27f0ff', glow: '#27f0ff', life: 60 });
  FX.ring(p.x, p.y - p.z - 30, 4, 5, 20, '#27f0ff', 3); FX.ring(p.x, p.y - p.z - 30, 2, 8, 24, '#fff', 1.5);
  Snd.sfx.dodge();
  p.meter = Math.min(100, p.meter + 14); p.dashCharges = 3; p.iframes = Math.max(p.iframes, 8);
  G.combo.dodges++; G.addStyle(12); G.addScore(120);
  Input.rumble(0.2, 0.5, 80);
};

// ============ update ============
function worldTick() {
  G.frame++;
  const p = G.player;
  if (G.god && p) { p.hp = p.maxHp; }
  p.update();
  for (const e of G.enemies) e.update();
  for (const pr of G.projs) pr.update();
  for (const b of G.beams) b.update();
  for (const k of G.pickups) k.update();
  for (const v of G.vents) v.update();
  for (const pr of G.props) pr.update();
  G.props = G.props.filter(pr => !pr.remove);
  G.enemies = G.enemies.filter(e => !e.remove);
  G.projs = G.projs.filter(x => !x.dead);
  G.beams = G.beams.filter(x => !x.dead);
  G.pickups = G.pickups.filter(x => !x.dead);
  FX.updateWorld();
  stageLogic();
  // combo / style timers
  if (G.combo.timer > 0 && --G.combo.timer === 0) G.combo.count = 0;
  G.sty.idle++;
  if (G.sty.idle > 50 && G.sty.v > 0) G.sty.v = Math.max(0, G.sty.v - 0.3 - G.sty.v * 0.004);
  if (G.targetT > 0) G.targetT--;
  if (G.banner && ++G.banner.t > (G.banner.kind === 'boss' ? 150 : 170)) G.banner = null;
  if (G.hint && ++G.hint.t > 420) G.hint = null;
  // death handling
  if (p.state === 'dead') {
    if (++G.deathT > 110) {
      if (G.lives > 0) respawn(); else { G.state = 'gameover'; G.menuT = 0; saveBest(); Snd.stopMusic(); Snd.sfx.over(); Input.clear(); }
    }
  }
}
function respawn() {
  G.lives--; G.deathT = 0;
  const old = G.player;
  const p = new Player(clamp(old.x, G.camX + 60, G.camX + W - 60), old.y);
  p.z = 150; p.vz = 0; p.state = 'air'; p.invul = 150; p.meter = old.meter * 0.5;
  G.player = p; G.combo.count = 0; G.sty.v = 0; G.tokens = 0;
  for (const e of G.enemies) { if (e.attacker) e.attacker = false; }
  FX.ring(p.x, p.y - 100, 5, 5, 20, '#27f0ff', 3);
  Input.clear();
}

function step() {
  FX.updateReal();
  G.menuT++;
  switch (G.state) {
    case 'title':
      if (HERO_ORDER.length > 1 && (Input.eat('left') || Input.eat('right'))) {
        const i = HERO_ORDER.indexOf(G.hero), d = Input.held.left ? -1 : 1;
        selectHero(HERO_ORDER[(i + d + HERO_ORDER.length) % HERO_ORDER.length]); saveHero(); Snd.resume(); Snd.sfx.ui(); G.heroSwapT = 0;
      }
      G.heroSwapT = (G.heroSwapT || 0) + 1;
      if (G.cheatGo) { if (--G.cheatGo.t <= 0) { const go = G.cheatGo; G.cheatGo = null; G.codeEntry = null; startGame(go.li); if (G.cheatBoss) jumpToStop(LEVELS[go.li].stops.length - 1); } break; }
      if (G.codeEntry) { Input.clear(); break; }
      if (Input.eat('confirm')) { Snd.resume(); Snd.sfx.select(); startGame(0); }
      break;
    case 'play':
      if (Input.eat('pause')) { G.state = 'pause'; G.pauseIdx = 0; Snd.sfx.ui(); return; }
      if (FX.hitstop > 0) { FX.hitstop--; return; }
      if (FX.slowT > 0) { FX.slowT--; FX.slowAcc += FX.slowScale; if (FX.slowAcc < 1) return; FX.slowAcc -= 1; }
      worldTick();
      break;
    case 'pause':
      if (Input.eat('pause') || Input.eat('confirm')) { G.state = 'play'; Input.clear(); Snd.sfx.ui(); }
      if (Input.codeDown['KeyT']) { G.state = 'title'; Snd.stopMusic(); Input.clear(); }
      break;
    case 'clear':
      FX.updateWorld();
      if (G.menuT > 60 && Input.eat('confirm')) {
        Snd.sfx.select();
        if (G.level + 1 < LEVELS.length) startLevel(G.level + 1);
        else { G.state = 'victory'; G.menuT = 0; Snd.playMusic(2, false); Input.clear(); }
      }
      break;
    case 'gameover':
      FX.updateWorld();
      if (G.menuT > 40 && Input.eat('confirm')) { G.score = G.levelStartScore; G.lives = 3; G.player = null; startLevel(G.level); }
      if (G.menuT > 40 && Input.codeDown['KeyT']) { G.state = 'title'; Input.clear(); }
      break;
    case 'victory':
      FX.updateWorld();
      if (G.menuT > 120 && Input.eat('confirm')) { G.state = 'title'; Snd.stopMusic(); Input.clear(); }
      break;
  }
}

// ============ bot (debug / soak tests): ?bot=1 ============
function botControl() {
  const H_ = Input.held;
  if (G.state !== 'play') { if (G.menuT % 30 === 0) Input.buf.confirm = 5; return; }
  const p = G.player; if (!p) return;
  for (const a of ['left', 'right', 'up', 'down', 'crouch']) H_[a] = false;
  let tgt = null, bd = 1e9;
  for (const e of G.enemies) if (!e.dead) { const d = Math.abs(e.x - p.x) + Math.abs(e.y - p.y) * 2; if (d < bd) { bd = d; tgt = e; } }
  const t = G.frame;
  if (!tgt) {   // nothing to fight: walk right, and sidestep whatever blocks the way (bumper posts...)
    H_.right = true;
    if (G.botLastX !== undefined && Math.abs(p.x - G.botLastX) < 0.4) G.botStuck = (G.botStuck || 0) + 1; else G.botStuck = 0;
    G.botLastX = p.x;
    if (G.botStuck > 25) H_[Math.floor(G.frame / 70) % 2 ? 'up' : 'down'] = true;
    return;
  }
  const dx = tgt.x - p.x, dy = tgt.y - p.y;
  if (Math.abs(dx) > 36) { H_[dx > 0 ? 'right' : 'left'] = true; }
  if (Math.abs(dy) > 8) { H_[dy > 0 ? 'down' : 'up'] = true; }
  if (t % 7 === 0 && Math.abs(dx) < 60 && Math.abs(dy) < 20) Input.buf[pick(['punch', 'punch', 'kick', 'knee'])] = Input.BUF;
  if (t % 53 === 0) Input.buf.jump = Input.BUF;
  if (t % 41 === 0) Input.buf.dash = Input.BUF;
  if (t % 97 === 0) H_.crouch = true;
  if (t % 300 === 0) Input.buf.special = Input.BUF;
  if (t % 150 < 8) H_.crouch = true;
}

// ============ rendering ============
function renderWorld(c) {
  c.imageSmoothingEnabled = false;
  const camX = Math.round(G.camX);
  BG.draw(c, camX, G.frame);
  for (const b of G.beams) b.draw(c, camX);
  for (const pr of G.props) if (pr.drawBase && pr.onScreen()) pr.drawBase(c, camX);
  for (const v of G.vents) if (v.x > camX - 60 && v.x < camX + W + 60) v.drawBase(c, camX);
  const list = [];
  const p = G.player;
  if (p) list.push(p);
  for (const e of G.enemies) list.push(e);
  for (const k of G.pickups) list.push(k);
  for (const pr of G.projs) list.push(pr);
  for (const v of G.vents) list.push(v);
  for (const pr of G.props) if (pr.onScreen()) list.push(pr);
  list.sort((a, b) => a.y - b.y);
  for (const o of list) if (o.shadow) o.shadow(c, camX);
  for (const o of list) o.draw(c, camX);
  FX.draw(c, camX);
  BG.drawFront(c, camX, G.frame);
  // slow-mo / dodge tint
  if (FX.slowT > 0 && FX.slowScale < 0.5) { c.fillStyle = 'rgba(60,30,120,.16)'; c.fillRect(0, 0, W, H); }
  c.drawImage(vig, 0, 0);
  // danger vignette when low hp
  if (p && p.hp > 0 && p.hp < 30) { c.fillStyle = `rgba(255,20,60,${0.06 + 0.05 * Math.sin(G.frame * 0.2)})`; c.fillRect(0, 0, W, H); }
}

function neonBar(c, x, y, w, h, k, colA, colB, segs) {
  c.fillStyle = OUT; c.fillRect(x - 2, y - 2, w + 4, h + 4);
  c.fillStyle = '#2a1650'; c.fillRect(x, y, w, h);
  const g = c.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, colA); g.addColorStop(1, colB);
  c.fillStyle = g; c.fillRect(x, y, Math.max(0, w * k), h);
  c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x, y, Math.max(0, w * k), 1);
  if (segs) { c.fillStyle = OUT; for (let i = 1; i < segs; i++) c.fillRect(x + Math.round(w / segs * i), y, 1, h); }
}

function drawHUD(c) {
  const p = G.player; if (!p) return;
  // portrait
  c.fillStyle = OUT; c.fillRect(6, 6, 42, 46);
  c.strokeStyle = '#ff2fd0'; c.lineWidth = 2; c.strokeRect(7, 7, 40, 44);
  c.strokeStyle = '#27f0ff'; c.lineWidth = 1; c.strokeRect(9.5, 9.5, 35, 39);
  c.save(); c.beginPath(); c.rect(10, 10, 34, 38); c.clip();
  const look = heroLook();
  if (G.hero !== 'veex' && look.portrait) { c.imageSmoothingEnabled = false; c.drawImage(look.portrait, 8, 6, 38, 46); }
  else if (Rig.headImg) { c.imageSmoothingEnabled = false; c.drawImage(Rig.headImg, 8, 8, 38, 43); }
  if (p.flash > 0) { c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(10, 10, 34, 38); }
  c.restore();
  drawText(c, look.name, 54, 16, { size: 11, color: '#ffe44d', outline: OUT, glow: '#ff2fd0', italic: true });
  neonBar(c, 54, 20, 128, 9, p.hp / p.maxHp, '#ff2f6a', '#ffb02f', 10);
  const full = p.meter >= 100;
  neonBar(c, 54, 33, 96, 5, p.meter / 100, full ? '#fff' : '#8b5cff', full ? '#ffe44d' : '#ff2fd0');
  if (full && G.frame % 20 < 12) drawText(c, 'FURY! [R]', 156, 39, { size: 9, color: '#ffe44d', outline: OUT });
  // dash pips
  for (let i = 0; i < 3; i++) {
    const fill = clamp(p.dashCharges - i, 0, 1), x = 58 + i * 14, y = 46;
    c.save(); c.translate(x, y); c.rotate(Math.PI / 4);
    c.fillStyle = OUT; c.fillRect(-5, -5, 10, 10);
    c.fillStyle = '#12304a'; c.fillRect(-4, -4, 8, 8);
    c.fillStyle = fill >= 1 ? '#27f0ff' : '#1a7a99'; c.fillRect(-4, 4 - 8 * fill, 8, 8 * fill);
    c.restore();
  }
  drawText(c, 'x' + G.lives, 104, 53, { size: 10, color: '#fff', outline: OUT });
  drawText(c, '1UP', 118, 53, { size: 9, color: '#3dffa0', outline: OUT });
  // score
  drawText(c, String(G.score).padStart(8, '0'), W / 2, 16, { size: 14, color: '#fff', outline: OUT, align: 'center', glow: '#27f0ff', italic: true });
  drawText(c, 'HI ' + String(Math.max(G.best, G.score)).padStart(8, '0'), W / 2, 27, { size: 9, color: '#ff9ae9', outline: OUT, align: 'center' });
  // target bar
  const e = G.target;
  if (e && G.targetT > 0 && !e.boss) {
    const a = clamp(G.targetT / 30, 0, 1);
    c.globalAlpha = a;
    drawText(c, e.name, W - 8, 16, { size: 10, color: '#fff', outline: OUT, align: 'right', italic: true });
    neonBar(c, W - 8 - 110, 20, 110, 6, Math.max(0, e.hp) / e.maxHp, '#27f0ff', '#8b5cff');
    c.globalAlpha = 1;
  }
  // boss bar
  if (G.boss && !G.boss.remove && G.locked) {
    const b = G.boss, w = 320, x = (W - w) / 2, y = H - 24;
    drawText(c, b.name, x, y - 6, { size: 12, color: '#ffe44d', outline: OUT, italic: true, glow: '#ff2fd0' });
    neonBar(c, x, y, w, 9, Math.max(0, b.hp) / b.maxHp, '#ff2a4d', '#ffb02f', 20);
    if (b.def.phases) for (const th of b.def.phases) { c.fillStyle = '#fff'; c.fillRect(x + w * th, y - 1, 1, 11); }
    const pk = b.poise / b.def.poiseMax;
    c.fillStyle = '#ffe44d'; c.fillRect(x, y + 11, w * pk, 1);
  }
  // combo + style
  if (G.combo.count >= 2 || G.rank() > 0) {
    const r = G.rank(), rk = RANKS[r];
    if (G.combo.count >= 2) {
      const pop = G.combo.timer > 105 ? 1.25 : 1;
      drawText(c, String(G.combo.count), W - 12, 78, { size: 30, color: '#fff', outline: '#ff2fd0', align: 'right', italic: true, scale: pop, glow: '#ff2fd0' });
      drawText(c, 'HITS', W - 12, 90, { size: 10, color: '#ffe44d', outline: OUT, align: 'right', italic: true });
      c.fillStyle = '#ff2fd0'; c.fillRect(W - 12 - 46 * (G.combo.timer / 110), 93, 46 * (G.combo.timer / 110), 2);
    }
    if (r > 0) {
      const cols = ['', '#9ab', '#7ae8ff', '#3dffa0', '#ffe44d', '#ff9a3d', '#ff2fd0', '#ff2a4d'];
      drawText(c, rk.n, W - 12, 128, { size: 34, color: cols[r], outline: OUT, align: 'right', italic: true, glow: cols[r], glowBlur: 10 });
      drawText(c, rk.w, W - 12, 139, { size: 9, color: '#fff', outline: OUT, align: 'right', italic: true });
      const nxt = RANKS[Math.min(RANKS.length - 1, r + 1)].t, cur = rk.t;
      const k = r === RANKS.length - 1 ? 1 : (G.sty.v - cur) / (nxt - cur);
      c.fillStyle = OUT; c.fillRect(W - 12 - 50, 143, 50, 4); c.fillStyle = cols[r]; c.fillRect(W - 12 - 49, 144, 48 * clamp(k, 0, 1), 2);
    }
  }
  // GO arrow
  if (G.goT > 0 && !G.locked && G.frame % 40 < 26) {
    const x = W - 46 + Math.sin(G.frame * 0.3) * 4;
    drawText(c, 'GO', x, H / 2 - 14, { size: 20, color: '#3dffa0', outline: OUT, align: 'center', italic: true, glow: '#3dffa0', glowBlur: 12 });
    c.fillStyle = '#3dffa0'; c.beginPath(); c.moveTo(x - 14, H / 2 - 6); c.lineTo(x + 6, H / 2 - 6); c.lineTo(x + 6, H / 2 - 14 + 0); c.lineTo(x + 22, H / 2 + 2); c.lineTo(x + 6, H / 2 + 10); c.lineTo(x + 6, H / 2 + 2); c.lineTo(x - 14, H / 2 + 2); c.closePath(); c.fill();
  }
  // banner
  if (G.banner) drawBanner(c);
  if (G.hint && G.banner === null && G.hint.t < 360) {
    const a = clamp(Math.min(G.hint.t / 20, (360 - G.hint.t) / 30), 0, 1);
    drawText(c, G.hint.text, W / 2, H - 10, { size: 10, color: '#fff', outline: OUT, align: 'center', alpha: a, italic: true });
  }
  if (G.locked && G.deathT === 0 && G.state === 'play' && G.frame < 0) { /* reserved */ }
  if (p.state === 'dead') {
    c.fillStyle = `rgba(0,0,0,${clamp(G.deathT / 60, 0, 0.6)})`; c.fillRect(0, 0, W, H);
    if (G.deathT > 20) drawText(c, G.lives > 0 ? 'ON SE RELEVE...' : 'K.O.', W / 2, H / 2, { size: 26, color: '#ff2a4d', outline: OUT, align: 'center', italic: true, glow: '#ff2a4d' });
  }
}

function drawBanner(c) {
  const b = G.banner, t = b.t;
  if (b.kind === 'boss') {
    const a = clamp(Math.min(t / 10, (150 - t) / 20), 0, 1);
    c.globalAlpha = a; c.fillStyle = 'rgba(80,0,20,.55)'; c.fillRect(0, 118, W, 70);
    c.fillStyle = '#ff2a4d'; for (let x = -(t * 4) % 40; x < W; x += 40) c.fillRect(x, 118, 20, 4), c.fillRect(x + 20, 184, 20, 4);
    drawText(c, 'WARNING', W / 2, 150, { size: 34, color: G.frame % 10 < 6 ? '#ff2a4d' : '#fff', outline: OUT, align: 'center', italic: true, glow: '#ff2a4d', glowBlur: 12 });
    drawText(c, b.sub, W / 2, 174, { size: 18, color: '#ffe44d', outline: OUT, align: 'center', italic: true });
    c.globalAlpha = 1; return;
  }
  const inK = clamp(t / 18, 0, 1), outK = clamp((170 - t) / 20, 0, 1), a = Math.min(inK, outK);
  const off = (1 - easeOut(inK)) * -120;
  c.globalAlpha = a;
  c.fillStyle = 'rgba(10,0,30,.6)'; c.fillRect(0, 128, W, 64);
  c.fillStyle = '#ff2fd0'; c.fillRect(0, 128, W, 2); c.fillStyle = '#27f0ff'; c.fillRect(0, 190, W, 2);
  drawText(c, b.title, W / 2 + off, 166, { size: 36, color: '#fff', outline: '#ff2fd0', align: 'center', italic: true, glow: '#ff2fd0', glowBlur: 12, outlineW: 5 });
  drawText(c, b.sub, W / 2 - off, 184, { size: 10, color: '#27f0ff', outline: OUT, align: 'center', italic: true });
  c.globalAlpha = 1;
}

// ---------- title & menus ----------
function drawSynthBg(c, t, sunX, horizon) {
  const g = c.createLinearGradient(0, 0, 0, horizon); g.addColorStop(0, '#07021c'); g.addColorStop(0.6, '#3a0a6a'); g.addColorStop(1, '#ff2fa0');
  c.fillStyle = g; c.fillRect(0, 0, W, horizon);
  for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(255,255,255,${0.15 + ((i * 37) % 10) / 14})`; c.fillRect((i * 97) % W, (i * 53) % (horizon - 50), 1, 1); }
  const sg = c.createLinearGradient(0, horizon - 150, 0, horizon); sg.addColorStop(0, '#fff05a'); sg.addColorStop(0.55, '#ff9a4a'); sg.addColorStop(1, '#ff2f9a');
  c.save(); c.beginPath(); c.rect(0, 0, W, horizon); c.clip();
  c.fillStyle = sg; c.beginPath(); c.arc(sunX, horizon - 30, 88, 0, 6.3); c.fill();
  c.fillStyle = '#3a0a6a';
  for (let i = 0; i < 9; i++) { const y = horizon - 62 + i * 9 + (t * 0.25 % 9); const h = 1.2 + i * 0.8; c.fillRect(sunX - 100, y, 200, h); }
  c.restore();
  c.fillStyle = '#0a0320'; c.fillRect(0, horizon, W, H - horizon);
  // grid
  c.strokeStyle = '#ff2fd0'; c.lineWidth = 1; c.globalAlpha = 0.85;
  for (let i = -20; i <= 20; i++) { c.beginPath(); c.moveTo(sunX + i * 14, horizon); c.lineTo(sunX + i * 90, H); c.stroke(); }
  for (let i = 0; i < 12; i++) {
    const k = ((i + (t * 0.02) % 1) / 12), y = horizon + Math.pow(k, 2.2) * (H - horizon);
    c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
  }
  c.globalAlpha = 1;
  const hg = c.createLinearGradient(0, horizon - 6, 0, horizon + 30); hg.addColorStop(0, 'rgba(255,47,208,.6)'); hg.addColorStop(1, 'rgba(255,47,208,0)'); c.fillStyle = hg; c.fillRect(0, horizon - 6, W, 36);
}

function drawTitle(c) {
  const t = G.menuT;
  drawSynthBg(c, t, 440, 214);
  // portrait
  const px = 26, py = 30, pw = 170, ph = 255;
  c.fillStyle = OUT; c.fillRect(px - 6, py - 6, pw + 12, ph + 12);
  const look = heroLook(), pimg = look.portrait || portraitImg;
  if (pimg) {
    c.save(); c.beginPath(); c.rect(px, py, pw, ph); c.clip();
    c.fillStyle = '#28145a'; c.fillRect(px, py, pw, ph);
    const glitch = t % 200 < 6 || (G.heroSwapT || 99) < 10;
    if (G.hero === 'veex') { c.imageSmoothingEnabled = true; c.drawImage(pimg, px, py, pw, ph); }
    else {   // pixel portrait: keep the pixels crisp and the aspect ratio
      c.imageSmoothingEnabled = false; const s = Math.min(pw / pimg.width, ph / pimg.height), w = pimg.width * s, h = pimg.height * s;
      c.drawImage(pimg, px + (pw - w) / 2, py + (ph - h) / 2, w, h);
    }
    if (glitch) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5; c.drawImage(pimg, px + 4, py, pw, ph); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
    c.fillStyle = 'rgba(0,0,0,.18)'; for (let y = py; y < py + ph; y += 3) c.fillRect(px, y, pw, 1);
    c.restore();
  }
  c.strokeStyle = '#ff2fd0'; c.lineWidth = 3; c.strokeRect(px - 3, py - 3, pw + 6, ph + 6);
  c.strokeStyle = '#27f0ff'; c.lineWidth = 1; c.strokeRect(px - 7, py - 7, pw + 14, ph + 14);
  drawText(c, look.tag, px + pw / 2, py + ph + 22, { size: 12, color: '#ffe44d', outline: OUT, align: 'center', italic: true });
  if (HERO_ORDER.length > 1) drawText(c, '<  CHOISIS TON HEROS  >', px + pw / 2, py + ph + 38, { size: 9, color: t % 60 < 40 ? '#27f0ff' : '#ff9ae9', outline: OUT, align: 'center' });
  // logo
  const lx = 420, bob = Math.sin(t * 0.05) * 2;
  const grad = c.createLinearGradient(0, 40, 0, 130); grad.addColorStop(0, '#fff8a0'); grad.addColorStop(0.5, '#ffb02f'); grad.addColorStop(0.55, '#ff2f9a'); grad.addColorStop(1, '#8b2fff');
  c.save(); c.translate(lx, 0); c.transform(1, 0, -0.12, 1, 0, 0);
  drawText(c, 'VEEXING', 0, 78 + bob, { size: 60, color: '#fff', outline: OUT, align: 'center', outlineW: 8, glow: '#ff2fd0', glowBlur: 14 });
  c.font = `bold 60px ${FONT}`; c.textAlign = 'center'; c.fillStyle = grad; c.fillText('VEEXING', 0, 78 + bob);
  drawText(c, 'FORCE', 0, 130 + bob, { size: 60, color: '#fff', outline: OUT, align: 'center', outlineW: 8, glow: '#27f0ff', glowBlur: 14 });
  c.fillStyle = grad; c.fillText('FORCE', 0, 130 + bob);
  c.restore();
  drawText(c, 'MUAY THAI STREET FIGHTER  -  1986', lx, 150, { size: 11, color: '#27f0ff', outline: OUT, align: 'center', italic: true });
  if (t % 60 < 40) drawText(c, 'PRESS  ENTER', lx, 178, { size: 18, color: '#fff', outline: '#ff2fd0', align: 'center', italic: true, glow: '#ff2fd0' });
  drawText(c, 'C : ENTRER UN CODE', lx, 200, { size: 9, color: '#8b5cff', outline: OUT, align: 'center' });
  // controls
  const rows = [['WASD / ZQSD / FLECHES', 'BOUGER'], ['J', 'POING'], ['K', 'PIED'], ['L', 'GENOU'], ['ESPACE', 'SAUT'], ['SHIFT', 'DASH (AIR AUSSI)'], ['C', 'SE BAISSER'], ['R', 'FURY (JAUGE PLEINE)']];
  const cx = 296, cy = 232;
  c.fillStyle = 'rgba(10,0,30,.72)'; c.fillRect(cx - 8, cy - 14, 352, 122);
  c.strokeStyle = '#8b5cff'; c.lineWidth = 1; c.strokeRect(cx - 8.5, cy - 14.5, 352, 122);
  rows.forEach((r, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    drawText(c, r[0], cx + col * 178, cy + row * 13, { size: 9, color: '#ffe44d', outline: OUT });
    drawText(c, r[1], cx + col * 178 + (col ? 62 : 108), cy + row * 13, { size: 9, color: '#fff', outline: OUT });
  });
  drawText(c, 'ANNULE TES COUPS AVEC DASH / SAUT  -  ESQUIVE AU DERNIER MOMENT = RALENTI', cx + 168, cy + 62, { size: 9, color: '#27f0ff', outline: OUT, align: 'center' });
  drawText(c, 'MANETTE OK  -  C : CODE  -  M : SON  -  F : PLEIN ECRAN', cx + 168, cy + 76, { size: 9, color: '#ff9ae9', outline: OUT, align: 'center' });
  drawText(c, 'HI-SCORE ' + String(G.best).padStart(8, '0'), cx + 168, cy + 96, { size: 10, color: '#fff', outline: OUT, align: 'center' });
  c.drawImage(vig, 0, 0);
}

function drawPanel(c, title, lines, foot) {
  c.fillStyle = 'rgba(8,0,24,.78)'; c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(30,10,70,.9)'; c.fillRect(90, 50, W - 180, H - 100);
  c.strokeStyle = '#ff2fd0'; c.lineWidth = 2; c.strokeRect(90, 50, W - 180, H - 100);
  c.strokeStyle = '#27f0ff'; c.lineWidth = 1; c.strokeRect(94.5, 54.5, W - 189, H - 109);
  drawText(c, title, W / 2, 92, { size: 30, color: '#fff', outline: '#ff2fd0', align: 'center', italic: true, glow: '#ff2fd0', outlineW: 5 });
  lines.forEach((l, i) => drawText(c, l[0], W / 2 - 110, 128 + i * 17, { size: 11, color: '#ffe44d', outline: OUT }) || drawText(c, l[1], W / 2 + 110, 128 + i * 17, { size: 11, color: '#fff', outline: OUT, align: 'right' }));
  if (foot && G.menuT % 60 < 40) drawText(c, foot, W / 2, H - 66, { size: 12, color: '#fff', outline: '#ff2fd0', align: 'center', italic: true });
}

function gradeFor() {
  const s = G.stats, sc = (G.combo.max * 4 + G.combo.dodges * 25 + G.combo.cancels * 6 + G.stats.kills * 5) - s.dmgTaken * 0.6 + G.player.hp * 0.5;
  return sc > 260 ? 'S' : sc > 190 ? 'A' : sc > 130 ? 'B' : sc > 70 ? 'C' : 'D';
}

function drawScreen(c) {
  switch (G.state) {
    case 'title': drawTitle(c); break;
    case 'pause': {
      drawPanel(c, 'PAUSE', [['DEPLACEMENT', 'WASD / ZQSD / FLECHES'], ['POING / PIED / GENOU', 'J / K / L'], ['SAUT  /  DASH', 'ESPACE  /  SHIFT'], ['SE BAISSER', 'C  (esquive les coups hauts)'],
        ['FURY', 'R (jauge pleine)'], ['ANNULER UNE ATTAQUE', 'DASH ou SAUT apres un coup touche'], ['ESQUIVE PARFAITE', 'DASH au moment de l\'impact'], ['SON / PLEIN ECRAN', 'M / F']], 'ENTREE : REPRENDRE   -   T : TITRE');
      break;
    }
    case 'clear': {
      const s = G.stats;
      drawPanel(c, 'STAGE CLEAR!', [['COMBO MAX', String(G.combo.max)], ['KO', String(s.kills)], ['ESQUIVES PARFAITES', String(G.combo.dodges)], ['CANCELS', String(G.combo.cancels)],
        ['BONUS', String(G.clearBonus)], ['SCORE', String(G.score)]], G.menuT > 60 ? 'ENTREE : SUITE' : '');
      drawText(c, gradeFor(), W - 130, 200, { size: 64, color: '#ffe44d', outline: '#ff2fd0', italic: true, align: 'center', glow: '#ff2fd0', outlineW: 6 });
      break;
    }
    case 'gameover':
      drawPanel(c, 'GAME OVER', [['SCORE', String(G.score)], ['COMBO MAX', String(G.combo.max)]], G.menuT > 40 ? 'ENTREE : REESSAYER   -   T : TITRE' : '');
      break;
    case 'victory': {
      c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(0, 0, W, H);
      drawText(c, 'LA VILLE EST SAUVEE', W / 2, 100, { size: 34, color: '#fff', outline: '#ff2fd0', align: 'center', italic: true, glow: '#ff2fd0', outlineW: 5 });
      drawText(c, 'MR. CHROME EST HORS-LIGNE.', W / 2, 130, { size: 12, color: '#27f0ff', outline: OUT, align: 'center', italic: true });
      drawText(c, heroLook().outro, W / 2, 148, { size: 12, color: '#27f0ff', outline: OUT, align: 'center', italic: true });
      drawText(c, 'SCORE FINAL  ' + String(G.score).padStart(8, '0'), W / 2, 200, { size: 22, color: '#ffe44d', outline: OUT, align: 'center', italic: true });
      drawText(c, 'MERCI D\'AVOIR JOUE', W / 2, 232, { size: 14, color: '#fff', outline: OUT, align: 'center' });
      if (G.menuT > 120 && G.menuT % 60 < 40) drawText(c, 'ENTREE', W / 2, 280, { size: 14, color: '#fff', outline: '#ff2fd0', align: 'center', italic: true });
      break;
    }
  }
}

function drawSheet(c) {
  c.fillStyle = '#2a1a50'; c.fillRect(0, 0, W, H);
  const names = Object.keys(POSES);
  const cols = 10, cw = W / cols, rh = 62;
  names.forEach((n, i) => {
    const x = (i % cols) * cw + cw / 2, y = 60 + Math.floor(i / cols) * rh;
    const j = computeJoints(POSES[n]);
    c.save(); c.translate(x, y); c.scale(0.62, 0.62); c.translate(-x, -y);
    Rig.draw(c, j, HERO_STYLE, x, y, 1, { rot: 0 });
    c.restore();
    drawText(c, n, x, y + 9, { size: 9, color: '#fff', align: 'center', outline: OUT });
  });
}

function render() {
  const c = bc;
  if (G.state === 'sheet') { drawSheet(c); composite(); return; }
  if (G.state === 'title') { c.fillStyle = '#05010f'; c.fillRect(0, 0, W, H); composite(); overlay(); return; }
  renderWorld(c);
  composite();
  overlay();
}

// HUD, menus and floating texts are drawn at screen resolution so they stay crisp
const VIEW = { sc: 1, ox: 0, oy: 0 };
function overlay() {
  sctx.save();
  sctx.translate(VIEW.ox, VIEW.oy); sctx.scale(VIEW.sc, VIEW.sc);
  sctx.imageSmoothingEnabled = true;
  if (G.state === 'title') { drawTitle(sctx); drawCodeEntry(sctx); }
  else {
    FX.drawText(sctx, Math.round(G.camX));
    if (G.state === 'play' || G.state === 'pause' || G.state === 'clear' || G.state === 'gameover') drawHUD(sctx);
    if (G.state !== 'play') drawScreen(sctx);
  }
  sctx.restore();
}

let scanPat = null, scanH = 0;
function composite() {
  const cw = cv.width, ch = cv.height;
  const sc = Math.min(cw / W, ch / H), dw = W * sc, dh = H * sc, ox = Math.floor((cw - dw) / 2), oy = Math.floor((ch - dh) / 2);
  VIEW.sc = sc; VIEW.ox = ox; VIEW.oy = oy;
  sctx.fillStyle = '#000'; sctx.fillRect(0, 0, cw, ch);
  sctx.save();
  sctx.translate(ox + FX.sx * sc * 0.6, oy + FX.sy * sc * 0.6);
  if (FX.zoom > 0) { const z = 1 + FX.zoom; sctx.translate(FX.zx * sc, FX.zy * sc); sctx.scale(z, z); sctx.translate(-FX.zx * sc, -FX.zy * sc); }
  sctx.imageSmoothingEnabled = false;
  sctx.drawImage(buf, 0, 0, W, H, 0, 0, dw, dh);
  if (FX.aberr > 0) {
    const k = Math.min(4, FX.aberr * 0.5) * sc * 0.6;
    tintX.globalCompositeOperation = 'source-over'; tintX.drawImage(buf, 0, 0);
    tintX.globalCompositeOperation = 'multiply'; tintX.fillStyle = '#ff0000'; tintX.fillRect(0, 0, W, H);
    sctx.globalCompositeOperation = 'lighter'; sctx.globalAlpha = 0.55;
    sctx.drawImage(tintC, 0, 0, W, H, k, 0, dw, dh);
    tintX.globalCompositeOperation = 'source-over'; tintX.drawImage(buf, 0, 0);
    tintX.globalCompositeOperation = 'multiply'; tintX.fillStyle = '#00ffff'; tintX.fillRect(0, 0, W, H);
    sctx.drawImage(tintC, 0, 0, W, H, -k, 0, dw, dh);
    sctx.globalAlpha = 1; sctx.globalCompositeOperation = 'source-over';
  }
  sctx.restore();
  // bloom
  bloomX.drawImage(buf, 0, 0, W, H, 0, 0, 160, 90);
  sctx.save(); sctx.imageSmoothingEnabled = true; sctx.imageSmoothingQuality = 'high'; sctx.globalCompositeOperation = 'screen'; sctx.globalAlpha = 0.32 + FX.flash * 0.3;
  sctx.drawImage(bloomC, ox, oy, dw, dh); sctx.restore();
  // scanlines
  const lh = Math.max(2, Math.round(sc));
  if (!scanPat || scanH !== lh) {
    const pc = document.createElement('canvas'); pc.width = 4; pc.height = lh; const px = pc.getContext('2d');
    px.fillStyle = 'rgba(0,0,0,.2)'; px.fillRect(0, lh - Math.max(1, Math.round(lh / 3)), 4, Math.max(1, Math.round(lh / 3)));
    scanPat = sctx.createPattern(pc, 'repeat'); scanH = lh;
  }
  sctx.fillStyle = scanPat; sctx.fillRect(ox, oy, dw, dh);
  if (FX.flash > 0.01) { sctx.globalAlpha = Math.min(1, FX.flash); sctx.fillStyle = FX.flashCol; sctx.fillRect(ox, oy, dw, dh); sctx.globalAlpha = 1; }
}

// ============ boot ============
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.floor(window.innerWidth * dpr); cv.height = Math.floor(window.innerHeight * dpr);
  cv.style.width = window.innerWidth + 'px'; cv.style.height = window.innerHeight + 'px';
  scanPat = null;
}

let last = 0, acc = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (ts - last) / 1000 || 0.016); last = ts; acc += dt;
  Input.poll();
  if (G.bot) { botControl(); if (G.frame % 30 === 0) document.title = `L${G.level + 1} stop${G.stopIdx} f${G.frame} ${G.state} hp${G.player ? Math.round(G.player.hp) : 0} sc${G.score} lives${G.lives}`; }
  if (Input.codeDown['KeyM'] && !G.mHeld && !G.codeEntry) { G.muted = Snd.toggleMute(); }
  G.mHeld = !!Input.codeDown['KeyM'];
  let n = 0;
  while (acc >= 1 / 60) { acc -= 1 / 60; step(); if (++n > 4) { acc = 0; break; } }
  render();
}

function boot() {
  const q = new URLSearchParams(location.search);
  G.bot = q.has('bot'); G.god = q.has('god');
  Input.init(); loadSave(); resize();
  addEventListener('resize', resize);
  addEventListener('blur', () => { if (G.state === 'play') { G.state = 'pause'; } });
  addEventListener('keydown', e => {
    Snd.resume();
    if (G.state === 'title' && e.key) codeKey(e);
    if (e.code === 'KeyF' && !e.repeat && !G.codeEntry) { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); }
  });
  addEventListener('pointerdown', () => Snd.resume());
  const pi = new Image(); pi.onload = () => { portraitImg = pi; }; pi.src = ASSETS.portrait;
  loadHeroSprites(); loadEnemySprites(); loadVentSprites(); loadPropSprites();
  Rig.load(() => {
    document.getElementById('loading') && (document.getElementById('loading').style.display = 'none');
    if (q.has('sheet')) G.state = 'sheet';
    if (q.has('hero')) selectHero(q.get('hero'));
    if (q.has('level')) {
      startGame(clamp(parseInt(q.get('level'), 10) - 1, 0, LEVELS.length - 1));
      if (q.has('stop')) jumpToStop(parseInt(q.get('stop'), 10));
    }
    requestAnimationFrame(loop);
  });
  window.G = G;
}
window.addEventListener('error', e => { const el = document.getElementById('err'); if (el) { el.style.display = 'block'; el.textContent += (e.message || e) + ' @' + (e.filename || '') + ':' + (e.lineno || '') + '\n'; } });
boot();

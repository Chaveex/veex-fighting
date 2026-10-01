// Headless logic soak test: runs the game with the bot and a fake DOM, no browser.
// usage: node tools/soak.js [level 1-4] [stop] [steps]
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const level = parseInt(process.argv[2] || '1', 10), stopArg = process.argv[3] === undefined ? -1 : parseInt(process.argv[3], 10), steps = parseInt(process.argv[4] || '20000', 10);

const noop = () => {};
let CALLS = 0, MAXC = 0, BYM = {};
const ctxProxy = () => new Proxy({}, {
  get: (t, k) => {
    if (k === 'measureText') return () => ({ width: 10 });
    if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop: noop });
    if (k === 'createPattern') return () => ({});
    if (k === 'canvas') return {};
    if (t[k] !== undefined) return t[k];
    return (...a) => { CALLS++; BYM[k] = (BYM[k] || 0) + 1; for (const v of a) if (typeof v === 'number' && (!isFinite(v) || Math.abs(v) > 20000)) { BYM['BADARG_' + String(k)] = (BYM['BADARG_' + String(k)] || 0) + 1; } };
  },
  set: (t, k, v) => { t[k] = v; return true; }
});
const mkCanvas = () => ({ width: 0, height: 0, style: {}, getContext: () => ctxProxy(), addEventListener: noop });
const sandbox = {
  console, Math, Date, JSON, Set, Map, Object, Array, String, Number, parseInt, parseFloat, isNaN, Float32Array, Uint8Array,
  setInterval: noop, clearInterval: noop, setTimeout: noop, performance: { now: () => 0 },
  location: { search: process.env.HERO ? '?hero=' + process.env.HERO : '' }, URLSearchParams,
  localStorage: { getItem: () => null, setItem: noop },
  navigator: { getGamepads: () => [] },
  requestAnimationFrame: noop,
  document: { getElementById: (id) => id === 'game' ? mkCanvas() : { style: {} }, createElement: () => mkCanvas(), documentElement: {}, fullscreenElement: null },
  Image: function () { const o = this; Object.defineProperty(o, 'src', { set() { if (o.onload) o.onload(); } }); },
  addEventListener: noop, devicePixelRatio: 1, innerWidth: 1280, innerHeight: 720,
  AudioContext: undefined
};
sandbox.window = sandbox;
vm.createContext(sandbox);
const files = ['assets', 'util', 'audio', 'fx', 'rig', 'heroSprites', 'heroSprites_roxy', 'enemySprites', 'ventSprites', 'propSprites', 'sprites', 'fighter', 'enemies', 'hazards', 'props', 'levels', 'game'];
let code = files.map(f => fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8')).join('\n;\n');
// expose top-level consts of interest & the game loop helpers
code += `\n;globalThis.__api = { makeProp, startLevel, SpriteSheet, G, step, startGame, LEVELS, Input, botControl, FX, worldTick, render };`;
try { vm.runInContext(code, sandbox, { filename: 'game-bundle.js' }); } catch (e) { console.error('BOOT ERROR', e); process.exit(1); }
const A = sandbox.__api;
A.__reset = () => { CALLS = 0; };
A.__check = () => { if (CALLS > MAXC) MAXC = CALLS; };
A.G.bot = true; A.G.god = !process.env.NOGOD;
A.startGame(level - 1);
if (stopArg >= 0) {
  const st = A.LEVELS[level - 1].stops[stopArg];
  A.G.stopIdx = stopArg; A.G.camX = Math.max(0, st.x - 160); A.G.player.x = A.G.camX + 120; A.G.banner = null;
}
if (process.env.PROPS) {   // behaviour check of every level prop
  const G = A.G; G.god = false; G.bot = false; let fails = 0;
  const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!cond) fails++; };
  const arena = () => { A.startLevel(0); G.stopIdx = 1; G.locked = true; G.waveIdx = 99; G.camX = 860; G.bounds = { minX: 860, maxX: 1500 }; G.props = []; G.enemies = []; G.vents = []; G.player.x = 1000; G.player.y = 306; G.player.iframes = 0; G.pickups = [];
    const keep = G.spawnEnemy('grunt', 1480, 330, { flash: true }); keep.cool = 1e9; keep.entered = true; keep.invulT = 0; keep.pin = true; return keep; };
  const run = (n, pin) => { for (let i = 0; i < n; i++) { if (pin) pin(); A.worldTick(); } };
  const mkE = (x, y) => { const e = G.spawnEnemy('grunt', x, y, { flash: true }); e.cool = 1e9; e.entered = true; e.invulT = 0; return e; };
  let k;
  // bin
  k = arena(); let b = A.makeProp('bin', 1040, 306); G.props = [b]; b.onHit(null, {}, 1, 1); b.onHit(null, {}, 1, 1); ok('bin dented', b.hp === 1 && !b.remove); b.onHit(null, {}, 1, 1); ok('bin destroyed', b.dead);
  // hydrant: hit once, enemy standing in the jet gets shoved
  k = arena(); let h = A.makeProp('hydrant', 1000, 306); G.props = [h]; let e = mkE(1050, 306); const hp0 = e.hp; h.onHit(G.player, { w: 1 }, 1, 1); ok('hydrant gushing', h.state === 'gush'); run(60, () => { G.player.x = 900; });
  ok('hydrant hurts + pushes enemy', e.hp < hp0 && e.x > 1050, `hp ${hp0}->${e.hp} x=${Math.round(e.x)}`);
  // cabinet
  k = arena(); let c = A.makeProp('cabinet', 1000, 306); G.props = [c]; e = mkE(1030, 306); const hpc = e.hp; for (let i = 0; i < 4; i++) c.onHit(null, {}, 1, 1); ok('cabinet destroyed', c.dead); ok('cabinet electrocutes neighbours', e.hp < hpc, `hp ${hpc}->${e.hp}`); ok('cabinet drops fury tape', G.pickups.some(p => p.kind === 'tape'));
  // bumper: launched enemy rebounds
  k = arena(); let bm = A.makeProp('bumper', 1100, 306); G.props = [bm]; e = mkE(1060, 306); e.setState('launched'); e.vx = 5; e.vz = 6; e.z = 4; const hpb = e.hp; run(30, () => { G.player.x = 900; });
  ok('bumper rebounds launched enemy', e.vx < 0 || e.x < 1090, `vx=${e.vx.toFixed(1)} x=${Math.round(e.x)} hp ${hpb}->${e.hp}`); ok('bumper damages', e.hp < hpb);
  // bumper: dash rebound refunds a charge
  k = arena(); bm = A.makeProp('bumper', 1100, 306); G.props = [bm]; G.player.x = 1060; G.player.y = 306; G.player.dashCharges = 1; G.player.startDash(1, 0); const dc = G.player.dashCharges; run(6); ok('bumper dash rebound', G.player.dashDX < 0 && G.player.dashCharges > dc, `dx=${G.player.dashDX.toFixed(2)} charges ${dc.toFixed(2)}->${G.player.dashCharges.toFixed(2)}`);
  // cabriolet
  k = arena(); let car = A.makeProp('car', 1000, 306); G.props = [car]; e = mkE(1060, 310); const hpk = e.hp; G.player.x = 900; for (let i = 0; i < 8; i++) car.onHit(null, {}, 1, 1); ok('car exploded', car.dead); ok('car blast hurts enemy', e.hp <= hpk - 20, `hp ${hpk}->${e.hp}`); ok('car drops loot', G.pickups.length >= 2);
  // ball: kicked ball flies and strikes an enemy
  k = arena(); let ball = A.makeProp('ball', 1000, 306); G.props = [ball]; e = mkE(1200, 306); const hpe = e.hp; ball.onHit(G.player, { w: 1 }, 1, 1); run(90, () => { G.player.x = 900; e.x = 1200; e.y = 306; }); ok('ball strikes enemy', e.hp < hpe, `hp ${hpe}->${e.hp}`);
  // server: EMP stuns everybody
  k = arena(); let sv = A.makeProp('server', 1000, 306); G.props = [sv]; e = mkE(1200, 310); const e2 = mkE(1300, 320); G.player.x = 900; for (let i = 0; i < 5; i++) sv.onHit(null, {}, 1, 1); ok('server destroyed', sv.dead); ok('EMP stuns enemies', e.state === 'hurt' && e2.state === 'hurt', `${e.state}/${e2.state}`);
  // conveyor
  k = arena(); let cv = A.makeProp('conveyor', 960, 0, { n: 5, dir: 1 }); G.props = [cv]; G.player.x = 1000; G.player.y = 306; const x0 = G.player.x; run(60, () => { G.player.state = 'idle'; }); ok('conveyor carries hero', G.player.x > x0 + 20, `x ${x0}->${Math.round(G.player.x)}`);
  // player attack hits a prop through the normal hitbox path
  k = arena(); b = A.makeProp('bin', 1030, 306); G.props = [b]; G.player.x = 1000; G.player.facing = 1; G.player.startAttack('punch', 1); run(12, () => { G.player.x = 1000; }); ok('player attack breaks props', b.hp < 3, 'bin hp ' + b.hp);
  console.log(fails ? 'PROP TESTS FAILED: ' + fails : 'ALL PROP TESTS PASSED'); process.exit(fails ? 2 : 0);
}
if (process.env.VENT) {   // targeted check: player + enemy standing on vent 0 while it blows
  const G = A.G; G.god = false; G.bot = false;
  const v = G.vents[0]; G.stopIdx = 1; G.locked = true; G.waveIdx = 99; G.camX = A.LEVELS[G.level].stops[1].x; G.bounds = { minX: G.camX, maxX: G.camX + 640 };
  G.player.x = v.x - 6; G.player.y = v.y; G.player.z = 0;
  const e = G.spawnEnemy('grunt', v.x + 6, v.y, { flash: true }); e.entered = true; e.invulT = 0; e.cool = 9999;
  const log = []; let last = '';
  vm.runInContext('0', sandbox);
  for (let i = 0; i < 1000; i++) {
    e.x = v.x + 6; e.y = v.y; A.worldTick(); G.player.x = Math.abs(G.player.x - v.x) > 30 ? v.x - 6 : G.player.x;
    const st = v.state; if (st !== last) { log.push(`f${G.frame} vent=${st} hp=${G.player.hp} pState=${G.player.state} eHp=${e.hp} eState=${e.state}`); last = st; }
  }
  console.log(log.join(String.fromCharCode(10))); process.exit(0);
}
const drive = `
  var process_env_progress = ${process.env.PROGRESS ? 'true' : 'false'};
  var __i = 0;
  for (; __i < ${steps}; __i++) {
    __api.Input.poll(); __api.botControl();
    __api.step();
    if (__i % 5 === 0) { __api.__reset(); __api.render(); __api.__check(); }
    globalThis.__prog = { i: __i, state: __api.G.state, lvl: __api.G.level, stop: __api.G.stopIdx, frame: __api.G.frame, en: __api.G.enemies.map(e => e.kind + ':' + e.state).join(','), hp: __api.G.player.hp };
    if (process_env_progress && __i % 4000 === 0) console.log('PROGRESS', JSON.stringify(globalThis.__prog));
    if (__api.G.state === 'victory') break;
  }
  globalThis.__done = __i;
`;
const t0 = Date.now();
try {
  vm.runInContext(drive, sandbox, { timeout: 25000 });
  console.log('max canvas calls/frame', MAXC, 'bad args', JSON.stringify(Object.fromEntries(Object.entries(BYM).filter(([k]) => k.startsWith('BADARG')))));
  console.log('missing frames', JSON.stringify(A.SpriteSheet.missing || {}));
  console.log('OK steps', sandbox.__done, 'state', A.G.state, 'level', A.G.level + 1, 'stop', A.G.stopIdx, 'score', A.G.score, 'lives', A.G.lives, 'dmgTaken', A.G.stats.dmgTaken, 'combo', A.G.combo.max, 'dodges', A.G.combo.dodges, 'cancels', A.G.combo.cancels, 'ms', Date.now() - t0);
} catch (e) {
  console.log('FAIL', e.message); console.log(e.stack ? e.stack.split('\n').slice(0, 8).join('\n') : '');
  console.log('progress', JSON.stringify(sandbox.__prog));
  process.exit(2);
}

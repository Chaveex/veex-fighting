'use strict';
// Medals (3 badges per level + best grade / score / time) and the ENDLESS mode (infinite waves).
// Saved in localStorage (veexMedals). Cheated runs (codes / god mode) neither earn medals nor rank.

// ---------- medals ----------
const MEDAL_PAR = [130, 150, 160, 170];   // seconds: speed-medal par per level (time spent fighting, hit-stop excluded)
const MEDAL_KINDS = [
  { id: 'rank', label: 'STYLE S', col: '#ffe44d' },
  { id: 'flawless', label: 'SANS DEGATS', col: '#27f0ff' },
  { id: 'speed', label: 'RAPIDE', col: '#ff2fd0' }
];
const GRADE_ORD = ['D', 'C', 'B', 'A', 'S'];
const fmtTime = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

const Medals = {
  lv: {}, endless: { wave: 0, score: 0 },
  load() {
    try {
      const d = JSON.parse(localStorage.getItem('veexMedals') || '{}');
      this.lv = d.lv && typeof d.lv === 'object' ? d.lv : {};
      this.endless = Object.assign({ wave: 0, score: 0 }, d.endless);
    } catch (e) { this.lv = {}; this.endless = { wave: 0, score: 0 }; }
    Daily.load();
  },
  save() { try { localStorage.setItem('veexMedals', JSON.stringify({ lv: this.lv, endless: this.endless })); } catch (e) { /* ignore */ } },
  get(li) { return this.lv[li] || null; },
  count() { let n = 0; for (const k in this.lv) { const m = this.lv[k]; if (m) n += (m.rank ? 1 : 0) + (m.flawless ? 1 : 0) + (m.speed ? 1 : 0); } return n; },
  // a level was cleared: update the saved bests, return what is new (clear screen)
  record(li, grade, gain, time, dmg) {
    const prev = this.lv[li] || {};
    const got = { rank: grade === 'S', flawless: dmg === 0, speed: time <= MEDAL_PAR[li] };
    const res = { got, fresh: {}, grade, gain, time, par: MEDAL_PAR[li],
      newScore: gain > (prev.score || 0), newTime: !prev.time || time < prev.time, newGrade: GRADE_ORD.indexOf(grade) > GRADE_ORD.indexOf(prev.grade || '') };
    for (const k of ['rank', 'flawless', 'speed']) res.fresh[k] = got[k] && !prev[k];
    this.lv[li] = {
      grade: res.newGrade || !prev.grade ? grade : prev.grade,
      score: Math.max(prev.score || 0, gain), time: res.newTime ? Math.round(time) : prev.time,
      rank: !!prev.rank || got.rank, flawless: !!prev.flawless || got.flawless, speed: !!prev.speed || got.speed
    };
    this.save();
    return res;
  },
  // endless run over: keep the best wave / score
  endRun() {
    if (G.mode !== 'endless' || G.cheated || !G.endless) return;
    if (G.daily) { Daily.endRun(); return; }
    const e = this.endless, w = G.endless.wave;
    G.endlessRes = { wave: w, newWave: w > e.wave, newScore: G.score > e.score };
    if (w > e.wave) e.wave = w;
    if (G.score > e.score) e.score = G.score;
    this.save();
    if (w >= 10) Ach.unlock('endless10');
  }
};

// badge: a round medal with a glyph; `on` = earned, `fresh` = earned for the first time (sparkles)
function drawMedalBadge(c, x, y, kind, on, fresh, t) {
  const r = 10;
  c.fillStyle = OUT; c.beginPath(); c.arc(x, y, r + 2, 0, 6.3); c.fill();
  c.fillStyle = on ? kind.col : '#2a1a4a'; c.beginPath(); c.arc(x, y, r, 0, 6.3); c.fill();
  if (on) {
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(x - 2, y - 3, r - 5, 0, 6.3); c.fill();
    if (fresh && t % 24 < 14) { c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r + 4, 0, 6.3); c.stroke(); }
  }
  const ink = on ? '#12062a' : '#5a4a7a';
  if (kind.id === 'speed') {   // lightning bolt
    c.fillStyle = ink; c.beginPath(); c.moveTo(x + 2, y - 7); c.lineTo(x - 5, y + 1); c.lineTo(x - 0.5, y + 1); c.lineTo(x - 2, y + 7); c.lineTo(x + 5, y - 2); c.lineTo(x + 0.5, y - 2); c.closePath(); c.fill();
  } else drawText(c, kind.id === 'rank' ? 'S' : '0', x, y + 5, { size: 14, color: ink, align: 'center', italic: true });
}

// ---------- DAILY RUN ----------
// Endless with the seed of the UTC day: same waves + same 2 modifiers for everybody, own board per day.
// Unlimited retries (same seed each time, so it can be practised); the best run of the day is what counts.
const DAILY_MODS = [
  { id: 'glass', name: 'VERRE CASSE', desc: 'DEGATS SUBIS x2' },
  { id: 'tank', name: 'BLINDES', desc: 'ENNEMIS +50% PV' },
  { id: 'horde', name: 'FOULE', desc: 'PLUS DE MONDE PAR VAGUE' },
  { id: 'solo', name: 'UNE VIE', desc: 'UNE SEULE VIE, PAS DE RETOUR' },
  { id: 'rush', name: 'BOSS RUSH', desc: 'UN BOSS TOUTES LES 3 VAGUES' },
  { id: 'dry', name: 'SANS SOINS', desc: 'PLUS DE SODA NI DE PIZZA' }
];
const Daily = {
  best: { day: '', wave: 0, score: 0 }, forceDay: null, _memo: null,
  today() { return this.forceDay || new Date().toISOString().slice(0, 10); },   // UTC day: everybody shares the same one
  load() {
    try { this.best = Object.assign({ day: '', wave: 0, score: 0 }, JSON.parse(localStorage.getItem('veexDaily') || '{}')); } catch (e) { /* ignore */ }
  },
  save() { try { localStorage.setItem('veexDaily', JSON.stringify(this.best)); } catch (e) { /* ignore */ } },
  bestToday(day) { return this.best.day === day ? this.best : { day, wave: 0, score: 0 }; },
  seed(day) { let h = 2166136261; const s = 'veex-daily-' + day; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; },
  rng(seed) { let a = seed; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; },
  // the 2 modifiers of a day (memoised: the title screen asks every frame)
  mods(day) {
    if (this._memo && this._memo.day === day) return this._memo.mods;
    const r = this.rng(this.seed(day)), n = DAILY_MODS.length;
    const a = Math.floor(r() * n); let b = Math.floor(r() * (n - 1)); if (b >= a) b++;
    const bad = (x, y) => (x === 3 && y === 0) || (x === 0 && y === 3);   // UNE VIE + VERRE CASSE is not a day, it is a joke
    if (bad(a, b)) b = (b + 1) % n === a ? (b + 2) % n : (b + 1) % n;
    const mods = [DAILY_MODS[a], DAILY_MODS[b]];
    this._memo = { day, mods };
    return mods;
  },
  make(day) { return { day, mods: this.mods(day).map(m => m.id), rng: this.rng(this.seed(day) ^ 0x9E3779B9), wrng: this.rng(this.seed(day) ^ 0x51ED270B) }; },
  has(id) { return !!(G.daily && G.daily.mods.includes(id)); },
  names(day) { return this.mods(day).map(m => m.name).join(' + '); },
  endRun() {
    const w = G.endless.wave, d = G.daily.day, b = this.bestToday(d);
    G.endlessRes = { wave: w, newWave: w > b.wave, newScore: G.score > b.score };
    this.best = { day: d, wave: Math.max(b.wave, w), score: Math.max(b.score, G.score) };
    this.save();
  }
};

// ---------- ENDLESS ----------
// One arena (the camera never scrolls), waves forever. Every 5th wave is a boss, the theme changes every 5 waves
// (NEON -> ARCADE -> SUNSET -> CYBER -> NEON...), enemies get tougher each wave. 3 lives, no checkpoint.
const ENDLESS_STOP = { x: 0, endless: true, waves: [] };
const Endless = {
  rnd() { return G.daily ? G.daily.rng() : Math.random(); },
  start(daily) {
    G.daily = daily ? Daily.make(Daily.today()) : null;
    G.mode = 'endless'; G.lives = Daily.has('solo') ? 1 : 3; G.score = 0; G.level = 0; G.player = null; G.sty.v = 0; G.seenProps = {};
    G.cheated = !!G.god; G.runDeaths = 0; G.endlessRes = null; G.boss = null;
    G.endless = { wave: 0, rest: 70, lastBoss: false };
    startLevel(0);
    this.layout(0);
    G.hpMul = 1; G.dmgMul = 1; G.maxTok = 2;
    if (G.daily) {
      const ms = Daily.mods(G.daily.day);
      G.banner = { t: 0, title: 'RUN DU JOUR', sub: ms.map(m => m.name).join('  +  '), kind: 'level' };
      G.hint = { t: 0, text: ms.map(m => m.desc).join('  -  ') };
    } else {
      G.banner = { t: 0, title: 'ENDLESS', sub: 'VAGUES INFINIES  -  TIENS LE PLUS LONGTEMPS', kind: 'level' };
      G.hint = { t: 0, text: 'VAGUE APRES VAGUE : AUCUN POINT DE REPRISE' };
    }
  },
  // arena furniture of a theme, squeezed onto the single screen
  layout(li) {
    const L = LEVELS[li];
    G.props = (L.props || []).filter(p => p[0] !== 'conveyor').slice(0, 2).map((p, i) => makeProp(p[0], [270, 380][i], p[2], p[3]));
    G.vents = (L.vents || []).slice(0, 2).map((v, i) => new SteamVent([130, 510][i], v[1], Object.assign({ delay: v[2] || 0, dormant: !!L.ventsDormant }, L.ventTiming)))
      .concat((L.plates || []).slice(0, 2).map((o, i) => new ElectroPlate({ x: [150, 480][i], y: o.y, delay: o.delay }, L.plateTiming)));
  },
  theme(li) {
    Snd.stopLoops();   // jets / buzzes of the old furniture
    G.level = li; BG.init(li); this.layout(li);
    Snd.playMusic(LEVELS[li].music, false);
  },
  pickKind(n) {
    const pool = [['grunt', 6]];
    if (n >= 2) pool.push(['fast', 3]);
    if (n >= 3) pool.push(['thrower', 3]);
    if (n >= 4) pool.push(['rusher', 3]);
    if (n >= 5) pool.push(['heavy', 2 + Math.floor(n / 5)]);
    if (n >= 6) pool.push(['brute', 2 + Math.floor(n / 8)]);
    let r = this.rnd() * pool.reduce((s, p) => s + p[1], 0);
    for (const p of pool) { if ((r -= p[1]) < 0) return p[0]; }
    return 'grunt';
  },
  startWave() {
    const E = G.endless, n = ++E.wave, th = Math.floor((n - 1) / 5) % LEVELS.length, boss = n % (Daily.has('rush') ? 3 : 5) === 0;
    const newTheme = th !== G.level;
    if (newTheme) this.theme(th);
    G.hpMul = Math.min(3, 1 + (n - 1) * 0.05); G.dmgMul = Math.min(2, 1 + (n - 1) * 0.025);
    G.maxTok = n < 4 ? 2 : 3;
    Weapons.onArena(boss ? 0.3 : n % 2 === 1 ? 0.22 : 0.05);   // weapons fall in the arena
    if (Daily.has('tank')) G.hpMul *= 1.5;
    if (Daily.has('glass')) G.dmgMul *= 2;
    if (Daily.has('horde')) G.maxTok++;
    let kinds = [];
    if (boss) {
      const esc = Math.min(2, Math.floor(n / 5));
      for (let i = 0; i < esc; i++) kinds.push('grunt');
    } else {
      const count = Math.min(7, 1 + Math.ceil((n + 1) / 2)) + (Daily.has('horde') ? 2 : 0), heavyCap = 1 + Math.floor(n / 10);
      let heavies = 0;
      for (let i = 0; i < count; i++) {
        let k = this.pickKind(n);
        if ((k === 'heavy' || k === 'brute') && ++heavies > heavyCap) k = 'grunt';
        kinds.push(k);
      }
    }
    let side = this.rnd() < 0.5 ? -1 : 1, i = 0;
    for (const k of kinds) { G.spawnQ.push({ kind: k, t: i * 26 + 4, side }); side = -side; i++; }
    if (boss) {
      const key = 'boss' + (G.level + 1), look = LOOKS[G.level][key];
      G.banner = { t: 0, title: 'WARNING', sub: look.name, kind: 'boss' }; Snd.sfx.announce('warning', 3);
      Snd.sfx.warn(); Snd.playMusic(LEVELS[G.level].music, true); FX.flashScreen(0.4, '#ff2a4d');
      const e = spawnEnemy(key, G.camX + W + 40, 300); e.facing = -1;
    } else if (newTheme) {
      G.banner = { t: 0, title: LEVELS[G.level].name, sub: 'VAGUE ' + n, kind: 'level' };
    } else {
      FX.text('VAGUE ' + n, W / 2, 120, { color: '#fff', size: 22, glow: '#ff2fd0', life: 70 });
    }
    E.lastBoss = boss;
    if (G.props.length === 0) this.layout(G.level);   // furniture all smashed: put it back
  },
  onWaveClear() {
    const E = G.endless, n = E.wave, p = G.player, bonus = n * 60;
    G.score += bonus;
    FX.text('VAGUE ' + n + ' OK  +' + bonus, W / 2, 110, { color: '#3dffa0', size: 14, glow: '#3dffa0', life: 70 });
    const drop = (kind, dx) => G.pickups.push(new Pickup(kind, W / 2 + dx, 306));
    if (E.lastBoss) {
      G.boss = null; Snd.playMusic(LEVELS[G.level].music, false); Snd.sfx.fanfare();
      if (!Daily.has('dry')) drop('pizza', -30);
      drop('tape', 30);
      if (n % 10 === 0) drop('life', 0);
      E.rest = 150;
    } else {
      if (!Daily.has('dry') && (p.hp < 60 || n % 3 === 0)) drop(p.hp < 40 ? 'pizza' : 'soda', 0);
      E.rest = 50;
    }
    if (n >= 10) Ach.unlock('endless10');
  },
  step() {
    const E = G.endless; if (!E || G.clearT > 0) return;
    if (G.player.state === 'dead') return;
    if (E.rest > 0) { if (--E.rest === 0) this.startWave(); return; }
    if (G.spawnQ.length === 0 && liveEnemies() === 0) { if (E.wave > 0) this.onWaveClear(); else E.rest = 1; }
  }
};

// title panel (B / pad RB): best grade, score, time and the 3 badges of each level + the endless record
function drawMedalsPanel(c) {
  const x0 = 60, w = 520, gcol = { S: '#ffe44d', A: '#3dffa0', B: '#27f0ff', C: '#fff', D: '#8a7aaa' };
  c.fillStyle = 'rgba(5,1,15,.97)'; c.fillRect(0, 0, W, H);
  drawText(c, 'MEDAILLES  ' + Medals.count() + ' / ' + LEVELS.length * 3, W / 2, 34, { size: 20, color: '#fff', outline: '#ff2fd0', align: 'center', italic: true, glow: '#ff2fd0', outlineW: 4 });
  const head = { size: 8, color: '#8b5cff', outline: OUT };
  drawText(c, 'NIVEAU', x0 + 12, 62, head); drawText(c, 'RANG', x0 + 190, 62, Object.assign({ align: 'center' }, head));
  drawText(c, 'SCORE', x0 + 340, 62, Object.assign({ align: 'right' }, head)); drawText(c, 'TEMPS', x0 + 396, 62, Object.assign({ align: 'right' }, head));
  drawText(c, 'MEDAILLES', x0 + 470, 62, Object.assign({ align: 'center' }, head));
  LEVELS.forEach((L, i) => {
    const y = 70 + i * 44, m = Medals.get(i), played = !!m;
    c.fillStyle = played ? 'rgba(40,20,80,.7)' : 'rgba(20,8,50,.6)'; c.fillRect(x0, y, w, 40);
    c.strokeStyle = '#3a2a6a'; c.lineWidth = 1; c.strokeRect(x0 + 0.5, y + 0.5, w - 1, 39);
    drawText(c, (i + 1) + '. ' + L.name, x0 + 12, y + 17, { size: 11, color: played ? '#fff' : '#8a7aaa', outline: OUT, italic: true });
    drawText(c, 'TEMPS PAR  ' + fmtTime(MEDAL_PAR[i]), x0 + 12, y + 31, { size: 8, color: '#27f0ff', outline: OUT });
    drawText(c, played ? m.grade : '-', x0 + 190, y + 30, { size: 24, color: played ? gcol[m.grade] : '#4a3a6a', outline: OUT, align: 'center', italic: true, glow: played && m.grade === 'S' ? '#ffe44d' : null });
    drawText(c, played ? String(m.score).padStart(8, '0') : '--------', x0 + 340, y + 24, { size: 11, color: played ? '#fff' : '#4a3a6a', outline: OUT, align: 'right' });
    drawText(c, played && m.time ? fmtTime(m.time) : '-:--', x0 + 396, y + 24, { size: 11, color: played && m.time && m.time <= MEDAL_PAR[i] ? '#ff9ae9' : played ? '#fff' : '#4a3a6a', outline: OUT, align: 'right' });
    MEDAL_KINDS.forEach((k, j) => drawMedalBadge(c, x0 + 436 + j * 34, y + 20, k, played && m[k.id], false, 0));
  });
  const ye = 70 + LEVELS.length * 44 + 4, e = Medals.endless;
  c.fillStyle = 'rgba(70,16,70,.7)'; c.fillRect(x0, ye, w, 34); c.strokeStyle = '#ff2fd0'; c.lineWidth = 1; c.strokeRect(x0 + 0.5, ye + 0.5, w - 1, 33);
  drawText(c, 'ENDLESS', x0 + 12, ye + 21, { size: 12, color: '#fff', outline: OUT, italic: true, glow: '#ff2fd0' });
  drawText(c, e.wave ? 'RECORD : VAGUE ' + e.wave : 'PAS ENCORE JOUE', x0 + 190, ye + 21, { size: 11, color: e.wave ? '#ffe44d' : '#4a3a6a', outline: OUT, align: 'center' });
  drawText(c, e.score ? String(e.score).padStart(8, '0') : '--------', x0 + 340, ye + 21, { size: 11, color: e.score ? '#fff' : '#4a3a6a', outline: OUT, align: 'right' });
  const yl = ye + 56;   // legend
  MEDAL_KINDS.forEach((k, j) => {
    const x = x0 + 24 + j * 170, txt = k.id === 'rank' ? 'NOTE S EN FIN DE NIVEAU' : k.id === 'flawless' ? 'AUCUN DEGAT SUR LE NIVEAU' : 'SOUS LE TEMPS PAR';
    drawMedalBadge(c, x, yl, k, true, false, 0);
    drawText(c, k.label, x + 18, yl - 1, { size: 8, color: '#fff', outline: OUT });
    drawText(c, txt, x + 18, yl + 9, { size: 7, color: '#c8b8ff', outline: OUT });
  });
  drawText(c, K('B / ECHAP : RETOUR', 'RB / B : RETOUR'), W / 2, H - 8, { size: 9, color: '#27f0ff', outline: OUT, align: 'center' });
}

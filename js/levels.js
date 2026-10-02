'use strict';
// ============ enemy looks per level ============
const S = (o) => Object.assign({ skin: '#e2a887', jacket: '#333', jacketDark: '#222', tee1: '#ddd', tee2: '#888', pants: '#223', pants2: '#446', shoe: '#eee', wrap: '#888', head: 'mohawk', hair: '#222', accent: '#ff2fd0' }, o);

const LOOKS = [
  { // 1 - NEON DOWNTOWN
    grunt:   { name: 'PUNK', style: S({ jacket: '#1a1a24', jacketDark: '#0e0e14', tee1: '#222', tee2: '#ff2fd0', pants: '#5a1a7a', pants2: '#ff2fd0', shoe: '#222', wrap: '#ff2fd0', head: 'mohawk', hair: '#27f0ff', skin: '#d99b7a' }) },
    fast:    { name: 'BREAKER', style: S({ jacket: '#ffe44d', jacketDark: '#d9b800', tee1: '#fff', tee2: '#ff2fd0', pants: '#27f0ff', pants2: '#fff', shoe: '#fff', wrap: '#fff', head: 'cap', hat: '#ff2fd0', hair: '#111', skin: '#8a5a3c', accent: '#ffe44d' }) },
    thrower: { name: 'DJ VINYL', style: S({ jacket: '#3d2a7a', jacketDark: '#2a1a5a', tee1: '#fff', tee2: '#27f0ff', pants: '#111', pants2: '#27f0ff', shoe: '#ff2fd0', wrap: '#27f0ff', head: 'headphones', hat: '#ff2fd0', hair: '#3a2210', skin: '#e0b090', accent: '#27f0ff' }) },
    heavy:   { name: 'BIKER', style: S({ jacket: '#151515', jacketDark: '#000', tee1: '#c33', tee2: '#fff', pants: '#222', pants2: '#555', shoe: '#111', wrap: '#333', head: 'helmet', hat: '#b02020', accent: '#ffe44d', skin: '#c48a68' }) },
    rusher:  { name: 'SKATER', style: S({ jacket: '#3dffa0', jacketDark: '#20c070', tee1: '#fff', tee2: '#111', pants: '#2338b8', pants2: '#fff', shoe: '#ffe44d', wrap: '#111', head: 'beanie', hat: '#ff6a3d', accent: '#3dffa0', skin: '#e2a887' }) },
    boss1:   { name: 'BIG BOOMER', style: S({ jacket: '#ff2fd0', jacketDark: '#b0107f', tee1: '#111', tee2: '#27f0ff', pants: '#111', pants2: '#ffe44d', shoe: '#fff', wrap: '#ffe44d', head: 'shades', hair: '#111', skin: '#9c6444', accent: '#ff2fd0', aura: '#ff2fd0', prop: boomboxProp }) }
  },
  { // 2 - GALAXY ARCADE
    grunt:   { name: 'ARCADE THUG', style: S({ jacket: '#2a3fa8', jacketDark: '#1a2a78', tee1: '#fff', tee2: '#3dffa0', pants: '#111', pants2: '#3dffa0', shoe: '#eee', wrap: '#3dffa0', head: 'bandana', hat: '#e8323c', hair: '#3a2210', skin: '#e2a887', accent: '#3dffa0' }) },
    fast:    { name: 'ROLLER GIRL', style: S({ jacket: '#ff8adf', jacketDark: '#d060b0', tee1: '#fff', tee2: '#27f0ff', pants: '#27f0ff', pants2: '#ff2fd0', shoe: '#fff', wrap: '#ff2fd0', head: 'blonde', hat: '#ff2fd0', hair: '#ffd84a', skin: '#f0c0a0', accent: '#ff8adf' }) },
    thrower: { name: 'GAMER', style: S({ jacket: '#2a2a3a', jacketDark: '#1a1a26', tee1: '#3dffa0', tee2: '#111', pants: '#3a3a4a', pants2: '#3dffa0', shoe: '#ff2fd0', wrap: '#3dffa0', head: 'visor', hair: '#5a3a1a', skin: '#e8c0a0', accent: '#3dffa0' }) },
    heavy:   { name: 'JOCK', style: S({ jacket: '#e8323c', jacketDark: '#a01020', tee1: '#fff', tee2: '#e8323c', pants: '#fff', pants2: '#e8323c', shoe: '#fff', wrap: '#fff', head: 'cap', hat: '#e8323c', hair: '#c9a24a', skin: '#e2a887', accent: '#ffe44d' }) },
    rusher:  { name: 'MALL RAT', style: S({ jacket: '#ffe44d', jacketDark: '#d9b800', tee1: '#111', tee2: '#ff2fd0', pants: '#8b5cff', pants2: '#fff', shoe: '#27f0ff', wrap: '#8b5cff', head: 'cap', hat: '#27f0ff', hair: '#222', skin: '#a06a48', accent: '#8b5cff' }) },
    boss2:   { name: 'LADY LASER', style: S({ jacket: '#27f0ff', jacketDark: '#10a0c0', tee1: '#ff2fd0', tee2: '#fff', pants: '#ff2fd0', pants2: '#27f0ff', shoe: '#fff', wrap: '#ffe44d', head: 'blonde', hat: '#27f0ff', hair: '#ff9ae9', skin: '#f0c0a0', accent: '#27f0ff', aura: '#27f0ff' }) }
  },
  { // 3 - SUNSET BOULEVARD (Miami)
    grunt:   { name: 'GANGSTER', style: S({ jacket: '#f2ece0', jacketDark: '#cfc6b4', tee1: '#ff8adf', tee2: '#fff', pants: '#f2ece0', pants2: '#cfc6b4', shoe: '#8a5a3c', wrap: '#f2ece0', head: 'slick', hair: '#111', skin: '#d99b7a', accent: '#5ce1ff' }) },
    fast:    { name: 'CAPOEIRISTA', style: S({ jacket: '#ffe44d', jacketDark: '#d9b800', tee1: '#3dffa0', tee2: '#ffe44d', pants: '#fff', pants2: '#3dffa0', shoe: '#ffe44d', wrap: '#3dffa0', head: 'bandana', hat: '#3dffa0', hair: '#111', skin: '#8a5a3c', accent: '#3dffa0' }) },
    thrower: { name: 'SPIKER', style: S({ jacket: '#ff6a3d', jacketDark: '#c04020', tee1: '#fff', tee2: '#ff6a3d', pants: '#27f0ff', pants2: '#ffe44d', shoe: '#fff', wrap: '#fff', head: 'shades', hair: '#e8c060', skin: '#e0a070', accent: '#ffe44d' }) },
    heavy:   { name: 'BODYBUILDER', style: S({ jacket: '#e2a887', jacketDark: '#c08868', tee1: '#e2a887', tee2: '#e2a887', pants: '#ff2fd0', pants2: '#27f0ff', shoe: '#fff', wrap: '#ffe44d', head: 'shades', hair: '#d9b040', skin: '#d08a60', accent: '#ff2fd0' }) },
    rusher:  { name: 'BLADER', style: S({ jacket: '#27f0ff', jacketDark: '#10a0c0', tee1: '#fff', tee2: '#ff2fd0', pants: '#ff2fd0', pants2: '#27f0ff', shoe: '#fff', wrap: '#27f0ff', head: 'headphones', hat: '#ffe44d', hair: '#3a2210', skin: '#e2a887', accent: '#ff2fd0' }) },
    boss3:   { name: 'DON PASTEL', style: S({ jacket: '#fff', jacketDark: '#d8d0e0', tee1: '#ff8adf', tee2: '#fff', pants: '#fff', pants2: '#d8d0e0', shoe: '#ff8adf', wrap: '#ff8adf', head: 'slick', hair: '#111', skin: '#e2b090', accent: '#ff8adf', aura: '#ff8adf' }) }
  },
  { // 4 - CYBER TOWER
    grunt:   { name: 'ANDROID', style: S({ skin: '#8a94a8', jacket: '#2a3040', jacketDark: '#1a2030', tee1: '#111', tee2: '#27f0ff', pants: '#1a2030', pants2: '#27f0ff', shoe: '#3a4458', wrap: '#27f0ff', head: 'robot', hat: '#3a4458', accent: '#27f0ff', legs: '#8a94a8', robot: true }) },
    fast:    { name: 'CYBER NINJA', style: S({ skin: '#222', jacket: '#111', jacketDark: '#000', tee1: '#111', tee2: '#ff2a4d', pants: '#111', pants2: '#ff2a4d', shoe: '#000', wrap: '#ff2a4d', head: 'visor', hair: '#111', accent: '#ff2a4d', legs: '#222' }) },
    thrower: { name: 'DRONE PILOT', style: S({ skin: '#8a94a8', jacket: '#3d2a7a', jacketDark: '#2a1a5a', tee1: '#111', tee2: '#3dffa0', pants: '#2a1a5a', pants2: '#3dffa0', shoe: '#3dffa0', wrap: '#3dffa0', head: 'robot', hat: '#8b5cff', accent: '#3dffa0', legs: '#8a94a8', robot: true }) },
    heavy:   { name: 'MECH', style: S({ skin: '#6a7488', jacket: '#4a5468', jacketDark: '#2a3040', tee1: '#ffe44d', tee2: '#111', pants: '#3a4458', pants2: '#ffe44d', shoe: '#2a3040', wrap: '#ffe44d', head: 'robot', hat: '#ffe44d', accent: '#ff2a4d', legs: '#6a7488', robot: true }) },
    rusher:  { name: 'HOVERBOT', style: S({ skin: '#b0b8c8', jacket: '#ff2fd0', jacketDark: '#b0107f', tee1: '#fff', tee2: '#27f0ff', pants: '#27f0ff', pants2: '#fff', shoe: '#fff', wrap: '#fff', head: 'robot', hat: '#27f0ff', accent: '#ff2fd0', legs: '#b0b8c8', robot: true }) },
    boss4:   { name: 'MR. CHROME', style: S({ skin: '#c8d0e0', jacket: '#8a94a8', jacketDark: '#5a6478', tee1: '#111', tee2: '#ff2fd0', pants: '#2a3040', pants2: '#ff2fd0', shoe: '#c8d0e0', wrap: '#ff2fd0', head: 'crt', hat: '#5a6478', accent: '#3dffa0', legs: '#c8d0e0', aura: '#3dffa0' }) }
  }
];

LOOKS.forEach((lv, i) => Object.keys(lv).forEach(k => { lv[k].key = `l${i + 1}_${k}`; }));

function boomboxProp(c, j) {
  // boombox held on the shoulder, above the front hand
  const hx = j.aF.tx, hy = j.aF.ty;
  c.save(); c.translate(hx + 4, hy + 8); c.scale(1, -1);
  c.fillStyle = OUT; c.fillRect(-14, -8, 28, 17);
  c.fillStyle = '#b8b8c8'; c.fillRect(-13, -7, 26, 15);
  c.fillStyle = '#333'; c.beginPath(); c.arc(-7, 1, 5.2, 0, 6.3); c.arc(7, 1, 5.2, 0, 6.3); c.fill();
  c.fillStyle = '#ff2fd0'; c.beginPath(); c.arc(-7, 1, 2, 0, 6.3); c.arc(7, 1, 2, 0, 6.3); c.fill();
  c.fillStyle = '#27f0ff'; c.fillRect(-3, -5, 6, 3); c.fillStyle = '#666'; c.fillRect(-12, -10, 24, 2);
  c.restore();
}

// ============ level definitions ============
// stops: camera locks at x; waves are arrays of enemy kinds. Last stop = boss.
const LEVELS = [
  {
    name: 'NEON DOWNTOWN', props: [['bin', 540, 322], ['bin', 1020, 292], ['hydrant', 1240, 284], ['bin', 1440, 326], ['bin', 1580, 326], ['hydrant', 1980, 330], ['bin', 2150, 292], ['bin', 2620, 324]], vents: [[1180,322,150],[1800,292,200]], ventTiming: { off: 210, warn: 60, act: 55 }, sub: 'STAGE 1  -  LA RUE NE DORT JAMAIS', theme: 'city', width: 2700, music: 0,
    hint: 'J POING  K PIED  L GENOU', hintPad: 'X POING  Y PIED  B GENOU',
    stops: [
      { x: 260, waves: [['grunt', 'grunt'], ['grunt']] },
      { x: 860, waves: [['grunt', 'grunt', 'fast'], ['grunt', 'thrower']] },
      { x: 1500, waves: [['fast', 'grunt', 'grunt'], ['thrower', 'grunt', 'fast']] },
      { x: 2060, boss: 'boss1' }
    ]
  },
  {
    name: 'GALAXY ARCADE', props: [['cabinet', 520, 292], ['cabinet', 1080, 292], ['bumper', 1290, 300], ['bumper', 1430, 326], ['cabinet', 1640, 326], ['bumper', 1900, 298], ['cabinet', 2340, 324], ['bumper', 2480, 296], ['bumper', 2720, 326]], vents: [], ventTiming: { off: 190, warn: 55, act: 60 }, sub: 'STAGE 2  -  INSERT COIN OR DIE', theme: 'arcade', width: 2900, music: 1,
    hint: 'ANNULE UNE ATTAQUE AVEC DASH OU SAUT !',
    stops: [
      { x: 260, waves: [['grunt', 'grunt', 'rusher'], ['fast', 'thrower']] },
      { x: 900, waves: [['heavy', 'grunt'], ['fast', 'fast', 'thrower']] },
      { x: 1500, waves: [['rusher', 'rusher', 'grunt'], ['heavy', 'thrower', 'fast']] },
      { x: 2260, boss: 'boss2' }
    ]
  },
  {
    name: 'SUNSET BOULEVARD', props: [['ball', 540, 312], ['car', 1080, 326], ['ball', 1330, 326], ['ball', 1700, 300], ['car', 2000, 322], ['ball', 2250, 312], ['ball', 2700, 300], ['car', 2900, 326]], vents: [[1200,300,150],[1800,322,120],[2300,296,100],[2540,326,242]], ventTiming: { off: 170, warn: 50, act: 65 }, ventsDormant: true, sub: 'STAGE 3  -  MIAMI HEAT 1987', theme: 'miami', width: 3100, music: 2,
    hint: 'ESQUIVE PARFAITE = RALENTI + FURY',
    stops: [
      { x: 280, waves: [['grunt', 'grunt', 'fast'], ['thrower', 'rusher']] },
      { x: 880, waves: [['heavy', 'fast', 'grunt'], ['thrower', 'thrower', 'grunt']] },
      { x: 1500, waves: [['rusher', 'fast', 'fast'], ['heavy', 'heavy']] },
      { x: 2100, waves: [['heavy', 'thrower', 'rusher', 'grunt'], ['fast', 'fast', 'thrower']] },
      { x: 2460, boss: 'boss3' }
    ]
  },
  {
    name: 'CYBER TOWER', props: [['conveyor', 960, 0, { n: 5, dir: 1 }], ['server', 1420, 298], ['conveyor', 1540, 0, { n: 5, dir: -1 }], ['server', 2060, 326], ['server', 2200, 296], ['conveyor', 2470, 0, { n: 6, dir: 1 }], ['server', 2900, 324]], vents: [], ventTiming: { off: 150, warn: 50, act: 70 },
    plates: [{ x: 1180, y: 308, delay: 120 }, { x: 1740, y: 270, delay: 100 }, { x: 1990, y: 270, delay: 200 }, { x: 2250, y: 308, delay: 60 }], plateTiming: { off: 160, warn: 55, act: 70 }, sub: 'STAGE 4  -  LE SYNDICAT DE LA MACHINE', theme: 'cyber', width: 3300, music: 3,
    hint: 'RENVOIE LES PROJECTILES AVEC TES COUPS !',
    stops: [
      { x: 280, waves: [['grunt', 'fast', 'thrower'], ['rusher', 'grunt', 'grunt']] },
      { x: 880, waves: [['heavy', 'fast', 'fast'], ['thrower', 'thrower', 'rusher']] },
      { x: 1500, waves: [['heavy', 'heavy', 'fast'], ['rusher', 'rusher', 'thrower', 'grunt']] },
      { x: 2100, waves: [['heavy', 'fast', 'thrower', 'rusher'], ['heavy', 'heavy', 'fast', 'fast']] },
      { x: 2660, boss: 'boss4' }
    ]
  }
];

// ============ backgrounds ============
// Each theme renders parallax layers into offscreen canvases once, animated bits are drawn live.
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
// seeded rng so the backdrop is stable for a given level
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function neonSign(c, txt, x, y, col, size = 11, tilt = 0) {
  c.save(); c.translate(x, y); c.rotate(tilt);
  c.font = `${size}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  const w = c.measureText(txt).width + 10;
  c.fillStyle = '#0a0418'; c.fillRect(-w / 2, -size / 2 - 4, w, size + 8);
  c.strokeStyle = col; c.lineWidth = 1; c.strokeRect(-w / 2 + 0.5, -size / 2 - 3.5, w - 1, size + 7);
  c.shadowColor = col; c.shadowBlur = 8; c.fillStyle = col; c.fillText(txt, 0, 1); c.fillText(txt, 0, 1);
  c.restore();
}

function buildLevelArt(li) {
  const L = LEVELS[li], rnd = mulberry(1234 + li * 77), theme = L.theme;
  const totalW = L.width;
  const art = { layers: [], floor: null, theme, live: [] };
  const skyH = FLOOR_TOP + 6;

  // ---- sky (static, screen-sized) ----
  const sky = mkCanvas(W, skyH), s = sky.getContext('2d');
  const grads = {
    city: ['#0d0630', '#2a0b5e', '#7a1a8a'], arcade: ['#0a0620', '#1b0f4a', '#3a1670'],
    miami: ['#2a0a5a', '#ff4f9a', '#ffb05a'], cyber: ['#02040c', '#06122a', '#0a2a4a']
  }[theme];
  let g = s.createLinearGradient(0, 0, 0, skyH); g.addColorStop(0, grads[0]); g.addColorStop(0.65, grads[1]); g.addColorStop(1, grads[2]);
  s.fillStyle = g; s.fillRect(0, 0, W, skyH);
  if (theme === 'city' || theme === 'cyber' || theme === 'arcade') {
    for (let i = 0; i < 90; i++) { s.fillStyle = `rgba(255,255,255,${0.2 + rnd() * 0.6})`; s.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * skyH * 0.6), 1, 1); }
  }
  if (theme === 'city') {
    // big neon moon with stripes
    const mx = 470, my = 78;
    g = s.createRadialGradient(mx, my, 6, mx, my, 70); g.addColorStop(0, 'rgba(255,90,210,.55)'); g.addColorStop(1, 'rgba(255,90,210,0)'); s.fillStyle = g; s.fillRect(mx - 80, my - 80, 160, 160);
    g = s.createLinearGradient(0, my - 34, 0, my + 34); g.addColorStop(0, '#ffe44d'); g.addColorStop(1, '#ff2fd0');
    s.fillStyle = g; s.beginPath(); s.arc(mx, my, 34, 0, 6.3); s.fill();
    s.fillStyle = grads[1]; for (let i = 0; i < 6; i++) s.fillRect(mx - 36, my + 2 + i * 6, 72, 1 + i * 0.7);
  }
  if (theme === 'miami') {
    const mx = 330, my = 150;
    g = s.createRadialGradient(mx, my, 20, mx, my, 150); g.addColorStop(0, 'rgba(255,220,120,.6)'); g.addColorStop(1, 'rgba(255,120,120,0)'); s.fillStyle = g; s.fillRect(mx - 160, my - 160, 320, 320);
    g = s.createLinearGradient(0, my - 60, 0, my + 60); g.addColorStop(0, '#fff05a'); g.addColorStop(0.5, '#ff9a4a'); g.addColorStop(1, '#ff2f9a');
    s.fillStyle = g; s.beginPath(); s.arc(mx, my, 62, 0, 6.3); s.fill();
    s.fillStyle = grads[2]; for (let i = 0; i < 9; i++) s.fillRect(mx - 64, my + 8 + i * 6.5, 128, 1.2 + i * 0.75);
  }
  if (theme === 'cyber') {
    s.strokeStyle = 'rgba(39,240,255,.12)'; s.lineWidth = 1;
    for (let x = 0; x < W; x += 32) { s.beginPath(); s.moveTo(x, 0); s.lineTo(x, skyH); s.stroke(); }
    for (let y = 0; y < skyH; y += 32) { s.beginPath(); s.moveTo(0, y); s.lineTo(W, y); s.stroke(); }
  }
  art.sky = sky;

  // ---- far layer (parallax 0.25) ----
  const farW = Math.ceil(totalW * 0.25 + W + 40), far = mkCanvas(farW, skyH), f = far.getContext('2d');
  const farCol = { city: '#1a0a4a', arcade: '#1a0c4a', miami: '#8a2a8a', cyber: '#081a34' }[theme];
  let x = 0;
  while (x < farW) {
    const bw = 22 + rnd() * 40, bh = 40 + rnd() * 90;
    if (theme === 'miami') {
      // art deco pastel hotels + palms
      f.fillStyle = pick2(rnd, ['#b0509a', '#9a4aa8', '#c0609a']); f.fillRect(x, skyH - bh, bw, bh);
      f.fillStyle = 'rgba(255,255,255,.18)'; f.fillRect(x, skyH - bh, 3, bh);
      f.fillStyle = 'rgba(255,240,180,.5)'; for (let wy = skyH - bh + 6; wy < skyH - 6; wy += 9) for (let wx = x + 4; wx < x + bw - 4; wx += 7) if (rnd() > 0.35) f.fillRect(wx, wy, 3, 4);
    } else {
      f.fillStyle = farCol; f.fillRect(x, skyH - bh, bw, bh);
      f.fillStyle = 'rgba(255,255,255,.05)'; f.fillRect(x, skyH - bh, 2, bh);
      const wc = theme === 'cyber' ? '#27f0ff' : theme === 'arcade' ? '#ff2fd0' : '#ffe44d';
      f.fillStyle = wc; f.globalAlpha = 0.5;
      for (let wy = skyH - bh + 5; wy < skyH - 6; wy += 8) for (let wx = x + 3; wx < x + bw - 3; wx += 6) if (rnd() > 0.55) f.fillRect(wx, wy, 2, 3);
      f.globalAlpha = 1;
      if (theme === 'cyber' && rnd() > 0.5) { f.fillStyle = '#27f0ff'; f.fillRect(x + bw / 2, skyH - bh - 14, 1, 14); }
    }
    x += bw + rnd() * 6;
  }
  art.far = far;

  // ---- mid layer (parallax 0.55) ----
  const midW = Math.ceil(totalW * 0.55 + W + 40), midH = skyH, mid = mkCanvas(midW, midH), m = mid.getContext('2d');
  const signs = {
    city: [['VEEX', '#ff2fd0'], ['DISCO', '#27f0ff'], ['SUSHI', '#ffe44d'], ['VIDEO', '#3dffa0'], ['24H', '#ff6a3d'], ['BAR', '#8b5cff'], ['PIZZA', '#ff2fd0'], ['HI-FI', '#27f0ff']],
    arcade: [['GAME', '#3dffa0'], ['HI-SCORE', '#ffe44d'], ['1UP', '#ff2fd0'], ['PLAY', '#27f0ff'], ['GALAXY', '#8b5cff'], ['TOKENS', '#ff6a3d']],
    miami: [['HOTEL', '#27f0ff'], ['PALMS', '#ff2fd0'], ['OCEAN', '#3dffa0'], ['CLUB', '#ffe44d'], ['VICE', '#ff2fd0']],
    cyber: [['SYNTH', '#27f0ff'], ['CORP', '#ff2a4d'], ['NET', '#3dffa0'], ['0101', '#8b5cff'], ['MAINFRAME', '#ffe44d']]
  }[theme];
  x = 0; let si = 0;
  while (x < midW) {
    const bw = 60 + rnd() * 70, bh = 92 + rnd() * 80;
    if (theme === 'arcade') {
      // rows of arcade cabinets
      const cw = 22;
      for (let cx = x; cx < x + bw; cx += cw + 2) {
        const ch = 46 + rnd() * 6, cy = midH - ch;
        const col = pick2(rnd, ['#27f0ff', '#ff2fd0', '#ffe44d', '#3dffa0', '#8b5cff']);
        m.fillStyle = '#120830'; m.fillRect(cx, cy, cw, ch);
        m.fillStyle = '#1e1050'; m.fillRect(cx + 1, cy + 1, cw - 2, 4);
        m.fillStyle = col; m.globalAlpha = 0.85; m.fillRect(cx + 3, cy + 8, cw - 6, 15); m.globalAlpha = 1;
        m.fillStyle = 'rgba(255,255,255,.4)'; for (let ly = cy + 9; ly < cy + 22; ly += 3) m.fillRect(cx + 3, ly, cw - 6, 1);
        m.fillStyle = '#2a1a6a'; m.fillRect(cx + 2, cy + 26, cw - 4, 6);
        m.fillStyle = '#e8323c'; m.fillRect(cx + 6, cy + 28, 2, 2); m.fillStyle = '#ffe44d'; m.fillRect(cx + 13, cy + 28, 2, 2);
        m.fillStyle = col; m.globalAlpha = 0.25; m.fillRect(cx - 2, cy + 6, cw + 4, 26); m.globalAlpha = 1;
      }
      if (rnd() > 0.55) { const sg = signs[si++ % signs.length]; neonSign(m, sg[0], x + bw / 2, midH - 78 - rnd() * 24, sg[1], 12, 0); }
    } else if (theme === 'miami') {
      // palm silhouette + pastel building
      const bc = pick2(rnd, ['#ff8adf', '#8ae8ff', '#ffe08a', '#c0a0ff']);
      m.fillStyle = bc; m.fillRect(x, midH - bh, bw, bh);
      m.fillStyle = 'rgba(0,0,0,.12)'; m.fillRect(x + bw - 8, midH - bh, 8, bh);
      m.fillStyle = 'rgba(255,255,255,.35)'; m.fillRect(x, midH - bh, bw, 3);
      m.fillStyle = 'rgba(40,20,80,.55)'; for (let wy = midH - bh + 12; wy < midH - 20; wy += 15) for (let wx = x + 6; wx < x + bw - 10; wx += 11) m.fillRect(wx, wy, 7, 9);
      m.fillStyle = '#ff2fd0'; m.fillRect(x, midH - bh + 3, bw, 1);
      if (rnd() > 0.4) { const sg = signs[si++ % signs.length]; neonSign(m, sg[0], x + bw / 2, midH - bh + 20, sg[1], 10); }
      // palm
      const px = x + bw + 8, ph = 70 + rnd() * 40;
      m.strokeStyle = '#2a0a4a'; m.lineWidth = 3; m.beginPath(); m.moveTo(px, midH); m.quadraticCurveTo(px + 4, midH - ph / 2, px - 2, midH - ph); m.stroke();
      m.fillStyle = '#2a0a4a';
      for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.55; m.beginPath(); m.moveTo(px - 2, midH - ph); m.quadraticCurveTo(px - 2 + Math.cos(a) * 16, midH - ph + Math.sin(a) * 16 - 5, px - 2 + Math.cos(a) * 26, midH - ph + Math.sin(a) * 22 + 10); m.quadraticCurveTo(px - 2 + Math.cos(a) * 14, midH - ph + Math.sin(a) * 14 + 2, px - 2, midH - ph); m.fill(); }
      x += 22;
    } else if (theme === 'cyber') {
      // server towers
      m.fillStyle = '#0a1830'; m.fillRect(x, midH - bh, bw, bh);
      m.fillStyle = '#123058'; m.fillRect(x, midH - bh, 3, bh);
      for (let ry = midH - bh + 6; ry < midH - 6; ry += 7) {
        m.fillStyle = '#06101f'; m.fillRect(x + 6, ry, bw - 12, 5);
        for (let lx = x + 9; lx < x + bw - 10; lx += 6) { m.fillStyle = pick2(rnd, ['#27f0ff', '#3dffa0', '#ff2a4d', '#0c2a4a']); m.fillRect(lx, ry + 1, 3, 3); }
      }
      if (rnd() > 0.5) { const sg = signs[si++ % signs.length]; neonSign(m, sg[0], x + bw / 2, midH - bh - 8, sg[1], 10); }
    } else {
      // city: apartment blocks with neon signs
      const bc = pick2(rnd, ['#1e0c52', '#2a1268', '#160a44', '#240e5a']);
      m.fillStyle = bc; m.fillRect(x, midH - bh, bw, bh);
      m.fillStyle = 'rgba(255,255,255,.07)'; m.fillRect(x, midH - bh, 2, bh);
      m.fillStyle = 'rgba(0,0,0,.25)'; m.fillRect(x + bw - 6, midH - bh, 6, bh);
      for (let wy = midH - bh + 10; wy < midH - 26; wy += 12) for (let wx = x + 6; wx < x + bw - 10; wx += 10) {
        const on = rnd() > 0.45;
        m.fillStyle = on ? pick2(rnd, ['#ffe44d', '#ff9ae9', '#7ae8ff']) : '#120838'; m.globalAlpha = on ? 0.85 : 1; m.fillRect(wx, wy, 5, 7); m.globalAlpha = 1;
      }
      if (rnd() > 0.35) { const sg = signs[si++ % signs.length]; neonSign(m, sg[0], x + bw / 2, midH - bh + 22 + rnd() * 30, sg[1], 12, (rnd() - 0.5) * 0.06); }
    }
    x += bw + 6 + rnd() * 10;
  }
  art.mid = mid;

  // ---- floor (parallax 1.0) ----
  const fh = H - FLOOR_TOP, fl = mkCanvas(totalW + W, fh), fc = fl.getContext('2d');
  const fg = fc.createLinearGradient(0, 0, 0, fh);
  const fcols = { city: ['#241040', '#0e0620'], arcade: ['#2a1060', '#100430'], miami: ['#ffb0d8', '#c060a0'], cyber: ['#061428', '#020a14'] }[theme];
  fg.addColorStop(0, fcols[0]); fg.addColorStop(1, fcols[1]);
  fc.fillStyle = fg; fc.fillRect(0, 0, totalW + W, fh);
  if (theme === 'city') {
    // curb, dashed lane markings, wet neon reflections
    fc.fillStyle = '#4a3a7a'; fc.fillRect(0, 0, totalW + W, 5); fc.fillStyle = '#2a1a50'; fc.fillRect(0, 5, totalW + W, 3);
    fc.fillStyle = 'rgba(255,230,120,.5)'; for (let xx = 0; xx < totalW + W; xx += 60) fc.fillRect(xx, 48, 30, 2);
    for (let i = 0; i < 26; i++) { const rx = rnd() * (totalW + W); const col = pick2(rnd, ['#ff2fd0', '#27f0ff', '#ffe44d']); const gg = fc.createLinearGradient(rx, 8, rx, fh); gg.addColorStop(0, col + '55'); gg.addColorStop(1, col + '00'); fc.fillStyle = gg; fc.fillRect(rx, 8, 2 + rnd() * 3, fh - 8); }
    fc.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 40; i++) fc.fillRect(rnd() * (totalW + W), 10 + rnd() * (fh - 12), 6 + rnd() * 20, 1);
  } else if (theme === 'arcade') {
    // memphis carpet
    const cols = ['#ff2fd0', '#27f0ff', '#ffe44d', '#3dffa0', '#8b5cff'];
    fc.fillStyle = '#3a1a80'; fc.fillRect(0, 0, totalW + W, 4);
    for (let i = 0; i < 380; i++) {
      const rx = rnd() * (totalW + W), ry = 6 + rnd() * (fh - 8), col = cols[Math.floor(rnd() * 5)];
      fc.strokeStyle = col; fc.fillStyle = col; fc.globalAlpha = 0.55; fc.lineWidth = 1.5;
      const k = Math.floor(rnd() * 3);
      if (k === 0) { fc.beginPath(); fc.moveTo(rx, ry); fc.lineTo(rx + 4, ry - 3); fc.lineTo(rx + 8, ry); fc.lineTo(rx + 12, ry - 3); fc.stroke(); }
      else if (k === 1) { fc.beginPath(); fc.arc(rx, ry, 2.5, 0, 6.3); fc.stroke(); }
      else { fc.fillRect(rx, ry, 4, 2); }
    }
    fc.globalAlpha = 1;
    fc.strokeStyle = 'rgba(255,47,208,.25)'; fc.lineWidth = 1; for (let xx = 0; xx < totalW + W; xx += 48) { fc.beginPath(); fc.moveTo(xx, 4); fc.lineTo(xx - 30, fh); fc.stroke(); }
  } else if (theme === 'miami') {
    fc.fillStyle = '#ffd8ec'; fc.fillRect(0, 0, totalW + W, 5); fc.fillStyle = '#e080b8'; fc.fillRect(0, 5, totalW + W, 3);
    fc.fillStyle = 'rgba(255,255,255,.55)'; for (let xx = 0; xx < totalW + W; xx += 70) fc.fillRect(xx, 50, 34, 2);
    fc.fillStyle = 'rgba(120,40,120,.18)'; for (let xx = 0; xx < totalW + W; xx += 32) { fc.fillRect(xx, 8, 1, fh); }
    for (let i = 0; i < 16; i++) { const rx = rnd() * (totalW + W); fc.fillStyle = 'rgba(70,20,110,.22)'; fc.beginPath(); fc.ellipse(rx, 20 + rnd() * 80, 26, 6, 0, 0, 6.3); fc.fill(); }
  } else {
    // glossy grid
    fc.strokeStyle = 'rgba(39,240,255,.5)'; fc.lineWidth = 1;
    for (let xx = 0; xx < totalW + W; xx += 40) { fc.beginPath(); fc.moveTo(xx, 4); fc.lineTo(xx - (xx % 200 === 0 ? 0 : 0), fh); fc.stroke(); }
    fc.strokeStyle = 'rgba(39,240,255,.3)'; for (let yy = 8; yy < fh; yy += 14 + (yy / fh) * 8) { fc.beginPath(); fc.moveTo(0, yy); fc.lineTo(totalW + W, yy); fc.stroke(); }
    fc.fillStyle = '#27f0ff'; fc.fillRect(0, 0, totalW + W, 2); fc.fillStyle = 'rgba(39,240,255,.15)'; fc.fillRect(0, 2, totalW + W, 6);
    for (let i = 0; i < 24; i++) { const rx = rnd() * (totalW + W); fc.fillStyle = 'rgba(255,42,77,.18)'; fc.fillRect(rx, 10, 60, 1); }
  }
  art.floor = fl;
  return art;
}
function pick2(rnd, a) { return a[Math.floor(rnd() * a.length)]; }

// live (animated) backdrop drawing
const BG = {
  art: null, rain: [], code: [],
  init(li) {
    this.art = buildLevelArt(li); this.li = li;
    // hand-made Aseprite backdrop (js/levelArt.js, assets/levels/level<N>.aseprite) replaces the procedural one when present
    this.img = null; this.la = typeof LEVEL_ART !== 'undefined' ? LEVEL_ART[li] : null;
    if (this.la) {
      this.img = {};
      for (const k in this.la) if (k !== 'meta') { const im = new Image(); im.src = this.la[k].img; this.img[k] = { im, x: this.la[k].x, y: this.la[k].y }; }
    }
    this.rain = []; this.code = [];
    for (let i = 0; i < 90; i++) this.rain.push({ x: Math.random() * W, y: Math.random() * H, v: 6 + Math.random() * 4, l: 5 + Math.random() * 6 });
    for (let i = 0; i < 46; i++) this.code.push({ x: i * 14 + Math.random() * 6, y: Math.random() * FLOOR_TOP, v: 0.6 + Math.random() * 1.6, l: 6 + Math.random() * 10 });
  },
  // Aseprite layers: sky (static) | far x0.2 | mid x0.5 | floor + facade x1 | additive light: glow, flicker (broken "24H" sign), bulbsA/B (marquee chaser)
  drawArt(c, camX, t) {
    const L = this.img, m = this.la.meta, cx = Math.floor(camX);
    const blit = (k, par) => { const o = L[k], sx = Math.floor(camX * par) - o.x; c.drawImage(o.im, sx, 0, W, o.im.height, 0, o.y, W, o.im.height); };
    c.drawImage(L.sky.im, 0, 0);
    blit('far', m.far);
    c.fillStyle = '#ff2a4d';
    m.antennas.forEach(([ax, ay], i) => { if ((t + i * 37) % 96 < 40) { const x = Math.round(ax - camX * m.far); if (x > -2 && x < W + 2) { c.fillRect(x - 1, ay - 1, 2, 2); c.globalAlpha = 0.35; c.fillRect(x - 2, ay - 2, 4, 4); c.globalAlpha = 1; } } });
    blit('mid', m.mid);
    blit('floor', 1);
    blit('facade', 1);
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.9 + 0.1 * Math.sin(t * 0.05); blit('glow', 1);
    const ph = t % 260, stutter = ph > 170 && ph < 214 && ((t >> 2) % 3 === 0 || (ph > 196 && ph < 206));
    c.globalAlpha = 1;
    const small = (k) => { const o = L[k]; if (o.x - cx < W && o.x - cx + o.im.width > 0) c.drawImage(o.im, o.x - cx, o.y); };
    if (!stutter) small('flicker');
    small((t >> 3) % 2 ? 'bulbsA' : 'bulbsB');
    c.globalCompositeOperation = 'source-over';
  },
  draw(c, camX, t) {
    const a = this.art; if (!a) return;
    if (this.img && this.img.facade.im.complete && this.img.facade.im.naturalWidth) { this.drawArt(c, camX, t); return; }
    c.drawImage(a.sky, 0, 0);
    // parallax layers
    const fx = Math.floor(camX * 0.25), mx = Math.floor(camX * 0.55);
    c.drawImage(a.far, fx, 0, W, a.far.height, 0, 0, W, a.far.height);
    c.drawImage(a.mid, mx, 0, W, a.mid.height, 0, 0, W, a.mid.height);
    // live neon flicker over the mid layer
    if (a.theme === 'cyber') {
      c.globalCompositeOperation = 'lighter'; c.fillStyle = '#27f0ff';
      for (const d of this.code) { d.y += d.v; if (d.y > FLOOR_TOP) { d.y = -d.l; } c.globalAlpha = 0.25; c.fillRect(d.x, d.y, 2, d.l); c.globalAlpha = 0.7; c.fillRect(d.x, d.y + d.l - 2, 2, 2); }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    }
    c.drawImage(a.floor, Math.floor(camX), 0, W, a.floor.height, 0, FLOOR_TOP, W, a.floor.height);
    // horizon glow
    const hg = c.createLinearGradient(0, FLOOR_TOP - 10, 0, FLOOR_TOP + 14);
    const glow = { city: '255,47,208', arcade: '139,92,255', miami: '255,120,200', cyber: '39,240,255' }[a.theme];
    hg.addColorStop(0, `rgba(${glow},0)`); hg.addColorStop(0.4, `rgba(${glow},.28)`); hg.addColorStop(1, `rgba(${glow},0)`);
    c.fillStyle = hg; c.fillRect(0, FLOOR_TOP - 10, W, 24);
  },
  drawFront(c, camX, t) {
    const a = this.art; if (!a) return;
    if (a.theme === 'city') {
      c.strokeStyle = 'rgba(160,220,255,.35)'; c.lineWidth = 1; c.beginPath();
      for (const r of this.rain) { r.y += r.v; r.x -= 1.5; if (r.y > H) { r.y = -10; r.x = Math.random() * (W + 20); } c.moveTo(r.x, r.y); c.lineTo(r.x + 1.5, r.y - r.l); }
      c.stroke();
    }
    if (a.theme === 'miami') {
      c.fillStyle = 'rgba(255,240,200,.5)';
      for (let i = 0; i < 10; i++) { const x = ((i * 97 + t * 0.4) % (W + 20)), y = 40 + (i * 53) % 180 + Math.sin(t * 0.03 + i) * 6; c.fillRect(x, y, 1.5, 1.5); }
    }
    if (a.theme === 'arcade') {
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) { const x = ((i * 131 + t * 0.2) % W); c.fillStyle = ['rgba(255,47,208,.05)', 'rgba(39,240,255,.05)'][i % 2]; c.fillRect(x, 0, 30, FLOOR_TOP); }
      c.globalCompositeOperation = 'source-over';
    }
    if (a.theme === 'cyber' && t % 240 < 5) { c.fillStyle = 'rgba(39,240,255,.08)'; c.fillRect(0, (t * 7) % H, W, 4); }
  }
};

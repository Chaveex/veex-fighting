'use strict';
// ============ intro: the new-game cutscene. A supermarket, a mum, a pro-AI brute, and a very bad Saturday ============
// Art: tools/make_intro.py -> js/introArt.js (INTRO_BG backdrop + cart, INTRO_SHEETS.mom). The hero (VEEX / ROXY) and BIG BOOMER reuse their game sheets.
// Driven by Intro.step() per frame from G.state === 'intro' (js/game.js), drawn by Intro.draw(c). ENTREE: next line, ECHAP: skip everything.
// shared by the intro and the post-boss talk: bottom dialogue box, typewriter text, speaker tag (boss pink / mum mint / hero cyan)
function drawDialogueBox(c, who, lines, typed, full, name, t, top) {
  const col = who === 'boss' ? '#ff2fd0' : who === 'mom' ? '#7fe3c8' : '#27f0ff';
  const x = 18, y = top ? 62 : 300, w = W - 36, h = 52;
  c.fillStyle = 'rgba(8,3,22,.88)'; c.fillRect(x, y, w, h); c.strokeStyle = col; c.lineWidth = 2; c.strokeRect(x + 1, y + 1, w - 2, h - 2);
  c.fillStyle = col; c.fillRect(x + 8, y - 9, 8 + name.length * 8, 14);
  drawText(c, name, x + 12, y + 2, { size: 9, color: '#0a0418', align: 'left', weight: 'bold' });
  let n = Math.floor(typed), ty = y + 22;
  for (const ln of lines) { drawText(c, ln.slice(0, Math.max(0, n)), x + 14, ty, { size: 11, color: '#fff', outline: OUT, align: 'left' }); n -= ln.length + 1; ty += 16; }
  if (typed >= full && (t >> 4) & 1) drawText(c, '>', x + w - 16, y + h - 10, { size: 10, color: col, outline: OUT, align: 'left' });
}

// ============ talk: short in-game exchange (world frozen, same box). Talk.start(lines, onDone); G.state === 'talk' ============
const Talk = {
  q: null, i: 0, typed: 0, t: 0, onDone: null,
  start(lines, onDone, cam) { this.q = lines; this.i = 0; this.typed = 0; this.t = 0; this.onDone = onDone; this.cam = cam; G.state = 'talk'; Input.clear(); },
  step() {
    if (!this.q) return; this.t++;
    FX.updateWorld();
    const L = this.q[this.i], full = L.text.length;
    if (Input.eat('pause')) { this.end(); return; }
    if (this.cam !== undefined && Math.abs(this.cam - G.camX) > 1.5) { G.camX += (this.cam - G.camX) * 0.12; return; }   // pan to the speaker first
    if (this.typed < full) { this.typed = Math.min(full, this.typed + 0.7); if (this.t % 6 === 0) Snd.sfx.ui && Snd.sfx.ui(); }
    if (Input.eat('confirm')) { if (this.typed < full) this.typed = full; else if (++this.i >= this.q.length) this.end(); else this.typed = 0; }
  },
  end() { const cb = this.onDone; this.q = null; this.onDone = null; G.state = 'play'; Input.clear(); cb && cb(); },
  drawUI(c) {
    if (!this.q) return; const L = this.q[this.i];
    const name = L.who === 'boss' ? 'BIG BOOMER' : L.who === 'mom' ? 'MAMAN' : (G.hero === 'roxy' ? 'ROXY' : 'VEEX');
    drawDialogueBox(c, L.who, L.text.split('\n'), this.typed, L.text.length, name, this.t, true);   // top: the lane near the bottom is where the boss lies
  },
};

const Intro = {
  auto: false, t: 0, bi: -1, bt: 0, typed: 0, line: null, done: false, fade: 1, shakeT: 0, flashT: 0,
  A: null, beats: null, onDone: null, _img: null, _mom: null,

  load() {
    if (this._img || typeof INTRO_BG === 'undefined') return;
    const mk = src => { const im = new Image(); im.src = src; return im; };
    this._img = { back: mk(INTRO_BG.back), glow: mk(INTRO_BG.glow), cart: mk(INTRO_BG.cart) };
    this._mom = new SpriteSheet(INTRO_SHEETS.mom); this._mom.load();
  },

  start(onDone) {
    this.load();
    this.t = 0; this.bi = -1; this.bt = 0; this.typed = 0; this.line = null; this.done = false; this.fade = 1; this.shakeT = 0; this.flashT = 0;
    this.onDone = onDone;
    const gal = G.hero === 'roxy';
    this.names = { hero: gal ? 'ROXY' : 'VEEX', mom: 'MAMAN', boss: 'BIG BOOMER' };
    this.A = {
      hero: { x: -70, y: 282, f: 1, fr: 'idle', ph: 0, anim: 'idle', hurt: 0 },
      mom: { x: -150, y: 282, f: 1, fr: 'stand', ph: 0, anim: 'stand', hurt: 0 },
      boss: { x: 760, y: 286, f: -1, fr: 'idle', ph: 0, anim: 'idle', hurt: 0 },
      cart: { x: -100, y: 282, show: true, shake: 0 },
      cans: [],
    };
    this.beats = this.script(gal);
    this.next();
  },

  // ---- script ----------------------------------------------------------------------------------------------------------------------------
  // beat = { dur, who?, text?, init?(), run?(bt) }  -  a beat with text waits for ENTREE (or its dur after typing); one without just plays for dur frames
  script(gal) {
    const A = this.A, H = A.hero, M = A.mom, B = A.boss;
    const face = () => { H.f = B.x > H.x ? 1 : -1; M.f = B.x > M.x ? 1 : -1; B.f = B.x > H.x ? -1 : 1; };
    const hit = (target, dir, power) => {
      Snd.sfx.hit(power); Snd.sfx.hurt(); FX.impact(target.x, target.y - 60, dir, power, true); FX.flashScreen(0.35, '#fff'); this.shakeT = 14;
      for (let i = 0; i < 9; i++) A.cans.push({ x: M.x + 30, y: 250, vx: (Math.random() - 0.3) * 4, vy: -3 - Math.random() * 5, r: Math.random() * 6, c: ['#ffe44d', '#ff2fd0', '#27f0ff', '#3dffa0'][i % 4] });
    };
    return [
      // 0: walk in from the left, mum pushing the cart
      { dur: 190, init: () => { Snd.playMusic(0, false); }, run: bt => {
        const k = Math.min(1, bt / 150), e = 1 - Math.pow(1 - k, 2);
        M.x = -150 + e * 330; M.f = 1; M.anim = k < 1 ? 'walk' : 'stand'; M.ph = bt;
        A.cart.x = M.x + 36; A.cart.y = 282;
        H.x = M.x - 78; H.f = 1; H.anim = k < 1 ? 'walk' : 'idle'; H.ph = bt;
      } },
      { who: 'mom', text: 'Bon. Trois paquets de nouilles\net on rentre.', run: bt => { M.anim = 'talk'; M.ph = bt; H.anim = 'idle'; H.ph = bt; } },
      { who: 'hero', text: "Maman... t'en as déjà six dans le caddie.", run: bt => { M.anim = 'stand'; M.ph = bt; H.anim = 'idle'; H.ph = bt; } },
      { who: 'mom', text: 'Six, c\'est pour la semaine.\nLe reste, c\'est pour la crise.', run: bt => { M.anim = 'talk'; M.ph = bt; H.anim = 'idle'; H.ph = bt; } },
      // 4: the brute walks in from the right, boombox thumping
      { dur: 130, init: () => { B.x = 760; B.f = -1; Snd.sfx.boom(); }, run: bt => {
        const k = Math.min(1, bt / 110); B.x = 760 - k * 250; B.anim = k < 1 ? 'walk' : 'idle'; B.ph = bt;
        M.anim = 'stand'; H.anim = 'idle'; H.ph = bt; M.ph = bt; face(); if (bt % 24 === 0 && k < 1) { this.shakeT = 4; Snd.sfx.hit(1); }
      } },
      { who: 'boss', text: 'HÉ ! C\'est vous, la dame de la télé ?!', run: bt => { B.anim = 'idle'; B.ph = bt; M.anim = 'stand'; H.anim = 'idle'; H.ph = bt; face(); } },
      { who: 'mom', text: "Euh... oui. J'ai juste dit que l'IA ramollit\nle cerveau des gens.", run: bt => { M.anim = 'talk'; M.ph = bt; B.anim = 'idle'; B.ph = bt; H.anim = 'idle'; H.ph = bt; } },
      { who: 'mom', text: "Et que notre futur est incertain.", run: bt => { M.anim = 'talk'; M.ph = bt; B.anim = 'idle'; B.ph = bt; H.anim = 'idle'; H.ph = bt; } },
      { who: 'boss', text: "RETIREZ ÇA ! L'IA, c'est PARFAIT !", run: bt => { B.anim = 'rage'; B.ph = bt; M.anim = 'stand'; H.anim = 'idle'; H.ph = bt; if (bt % 18 === 0) this.shakeT = 6; } },
      { who: 'mom', text: "Mais enfin... vous aussi, vous avez été\nfait par l'IA, ou quoi ?", run: bt => { M.anim = 'arms'; M.ph = bt; B.anim = 'idle'; B.ph = bt; H.anim = 'idle'; H.ph = bt; } },
      { dur: 70, run: bt => { B.anim = 'idle'; B.ph = bt; M.anim = 'arms'; H.anim = 'idle'; H.ph = bt; if (bt === 10) { Snd.sfx.warn(); FX.flashScreen(0.25, '#ff2a4d'); } } },
      { who: 'boss', text: 'COMMENT... OSEZ-VOUS.', run: bt => { B.anim = 'rage'; B.ph = bt; M.anim = 'arms'; H.anim = 'idle'; H.ph = bt; if (bt % 10 === 0) this.shakeT = 5; } },
      // 12: haymaker, the mum goes down, groceries everywhere
      { dur: 120, init: () => { B.hit = false; this._hk = 0; }, run: bt => {
        const reach = M.x + 74;
        B.x = Math.max(reach, B.x - 4.2); B.f = -1;
        const near = B.x <= reach + 1;
        if (!near) { B.anim = 'walk'; B.ph = bt; M.anim = 'stand'; }
        else {
          const k = this._hk++;
          B.anim = k < 10 ? 'hay_w' : k < 16 ? 'hay_s' : 'hay_r';
          if (k === 12 && !B.hit) { B.hit = true; hit(M, -1, 3); M.anim = 'down'; M.hurt = 1; M.vx = -3.2; M.vy = -7; M.fly = true; A.cart.shake = 18; Snd.sfx.cry('hurt', G.hero); }
        }
        if (M.fly) { M.x += M.vx; M.y += M.vy; M.vy += 0.6; M.vx *= 0.97; if (M.y >= 282) { M.y = 282; M.fly = false; M.vx = 0; this.shakeT = 8; Snd.sfx.hit(2); } M.anim = M.fly ? 'tumble' : 'down'; M.f = 1; }
        H.anim = 'idle'; H.ph = bt;
      } },
      { who: 'hero', text: '...MAMAN ?!', run: bt => { H.anim = 'fury'; H.ph = bt; M.anim = 'down'; B.anim = 'idle'; B.ph = bt; M.f = 1; } },
      { who: 'hero', text: 'TU AS FRAPPÉ MA MÈRE ?!', run: bt => { H.anim = 'fury'; H.ph = bt; M.anim = 'down'; B.anim = 'idle'; B.ph = bt; if (bt % 14 === 0) this.shakeT = 6; } },
      // 15: the hero charges, the brute goes flying into the shelves
      { dur: 130, init: () => { this._hk2 = 0; B.hit = false; B.fly = false; }, run: bt => {
        face(); B.f = -1;
        const k = this._hk2++;
        if (!B.hit) {
          const tx = B.x - 66; H.x += Math.min(9, Math.max(0, tx - H.x) * 0.25 + 3); H.anim = 'rush'; H.ph = bt;
          if (H.x >= tx - 3) { B.hit = true; H.anim = 'punch'; hit(B, 1, 3); Snd.sfx.cry('kiai', G.hero); B.fly = true; B.vx = 6; B.vy = -7; for (let i = 0; i < 8; i++) A.cans.push({ x: B.x, y: 150 + i * 6, vx: (Math.random() - 0.5) * 5, vy: -2 - Math.random() * 4, r: Math.random() * 6, c: ['#ffe44d', '#ff2fd0', '#27f0ff', '#3dffa0'][i % 4] }); }
        } else {
          H.anim = 'punch'; H.ph = bt;
          if (B.fly) { B.x += B.vx; B.y += B.vy; B.vy += 0.55; B.vx *= 0.97; B.anim = 'tumble'; if (B.y >= 286) { B.y = 286; B.fly = false; this.shakeT = 10; Snd.sfx.hit(3); B.anim = 'down'; } }
        }
        B.f = -1;
      } },
      { who: 'boss', text: "T'as rien vu, " + (gal ? 'gamine' : 'gamin') + ' ! Moi, je vais\nrejoindre le PROGRÈS !', run: bt => { H.anim = 'idle'; H.ph = bt; B.anim = bt < 28 ? 'down' : 'getup'; B.ph = bt; M.anim = 'down'; } },
      // 17: the brute legs it to the right
      { dur: 80, run: bt => { B.f = 1; B.anim = 'run'; B.ph = bt; B.x += 3 + bt * 0.12; H.f = 1; H.anim = 'idle'; H.ph = bt; M.anim = 'down'; } },
      { who: 'mom', text: "Ça va, ça va, j'ai rien !\nVa... et rapporte des nouilles !", run: bt => { M.anim = 'down'; M.f = 1; H.anim = 'idle'; H.ph = bt; B.x += 8; } },
      // 19: the hero chases him out of the shop
      { dur: 95, init: () => { Snd.sfx.go && Snd.sfx.go(); }, run: bt => { H.f = 1; H.anim = 'walkfast'; H.ph = bt; H.x += 2 + bt * 0.14; B.x += 12; M.anim = 'down'; } },
    ];
  },

  // ---- flow ------------------------------------------------------------------------------------------------------------------------------
  next() {
    this.bi++; this.bt = 0; this.typed = 0;
    const b = this.beats[this.bi];
    if (!b) { this.finish(); return; }
    this.line = b.text ? { who: b.who, lines: b.text.split('\n'), full: b.text.length } : null;
    b.init && b.init();
  },
  finish() {
    if (this.done) return; this.done = true;
    const cb = this.onDone; this.onDone = null; cb && cb();
  },
  step() {
    if (this.done || !this.beats) return;
    this.t++;
    this.fade = this.bi < this.beats.length - 1 ? Math.max(0, 1 - this.t / 40) : this.fade;
    if (Input.eat('pause')) { this.finish(); return; }
    const b = this.beats[this.bi]; if (!b) return;
    this.bt++;
    if (b.run) b.run(this.bt);
    if (this.shakeT > 0) this.shakeT--;
    // groceries physics
    for (const c of this.A.cans) { c.x += c.vx; c.y += c.vy; c.vy += 0.5; c.r += c.vx * 0.2; if (c.y > 288) { c.y = 288; c.vy *= -0.35; c.vx *= 0.7; } }
    if (this.A.cart.shake > 0) this.A.cart.shake--;
    FX.updateWorld();
    if (b.text) {
      const typing = this.typed < b.text.length;
      if (typing) { this.typed = Math.min(b.text.length, this.typed + 0.7); if (Math.floor(this.typed) % 3 === 0 && this.bt % 2 === 0) Snd.sfx.ui && Snd.sfx.ui(); }
      if (Input.eat('confirm')) { if (typing) this.typed = b.text.length; else this.next(); }
      else if (this.auto && !typing && this.bt > b.text.length / 0.7 + 50) this.next();   // dev: ?intro=auto plays itself
    } else if (this.bt >= b.dur) this.next();
    // the closing beat fades out
    if (this.bi === this.beats.length - 1) { const b2 = this.beats[this.bi]; if (this.bt > b2.dur - 40) this.fade = (this.bt - (b2.dur - 40)) / 40; }
  },

  // ---- drawing ---------------------------------------------------------------------------------------------------------------------------
  heroFrame(a) {
    const S = HeroSprites; if (!S || !S.ready) return null;
    switch (a.anim) {
      case 'walk': return S.loop('walk', a.ph) || 'walk_0';
      case 'walkfast': return S.loop('walk', a.ph * 2) || 'walk_0';
      case 'fury': return ['fury_0', 'fury_1', 'fury_2'][(a.ph >> 3) % 3];
      case 'rush': return 'rushp_s0';
      case 'punch': return a.ph % 20 < 10 ? 'jab_s0' : 'cross_s0';
      default: return S.loop('idle', a.ph) || 'idle_0';
    }
  },
  bossFrame(a) {
    switch (a.anim) {
      case 'walk': return 'walk' + ((a.ph >> 3) % 6);
      case 'run': return 'walk' + ((a.ph >> 2) % 6);
      case 'rage': return (a.ph >> 3) % 2 ? 'arms_up' : 'idle1';
      case 'hay_w': return 'hay_w'; case 'hay_s': return 'hay_s'; case 'hay_r': return 'hay_r';
      case 'tumble': return 'tumble'; case 'down': return 'down'; case 'getup': return (a.ph >> 4) % 2 ? 'getup1' : 'getup0';
      default: return 'idle' + ((a.ph >> 5) & 1);
    }
  },
  momFrame(a) {
    switch (a.anim) {
      case 'walk': return 'walk' + ((a.ph >> 3) % 6);
      case 'talk': return 'talk' + ((a.ph >> 4) & 1);
      case 'arms': return 'arms_up';
      case 'tumble': return 'tumble'; case 'down': return 'down';
      default: return 'stand' + ((a.ph >> 5) & 1);
    }
  },
  draw(c) {
    this.load();
    const I = this._img; c.save();
    if (this.shakeT > 0) c.translate((Math.random() - 0.5) * this.shakeT * 0.6, (Math.random() - 0.5) * this.shakeT * 0.4);
    if (I && I.back.complete) { c.drawImage(I.back, 0, 0); } else { c.fillStyle = '#2e2a52'; c.fillRect(0, 0, W, H); }
    const A = this.A; if (!A) { c.restore(); return; }
    // depth sort by feet
    const actors = [
      { y: A.mom.y, draw: () => { const s = this._mom; if (s && s.ready) s.draw(c, this.momFrame(A.mom), A.mom.x, A.mom.y, A.mom.f); } },
      { y: A.hero.y, draw: () => { const f = this.heroFrame(A.hero); if (f && HeroSprites.has(f)) HeroSprites.draw(c, f, A.hero.x, A.hero.y, A.hero.f, {}); } },
      { y: A.boss.y, draw: () => { const s = EnemySprites['l1_boss1']; if (s && s.ready) { const f = this.bossFrame(A.boss); s.draw(c, s.has(f) ? f : 'idle0', A.boss.x, A.boss.y, A.boss.f); } } },
    ].sort((a, b) => a.y - b.y);
    // cart sits behind the mum
    if (A.cart.show && I && I.cart.complete) {
      const sh = A.cart.shake > 0 ? Math.sin(A.cart.shake * 1.7) * 2 : 0;
      c.imageSmoothingEnabled = false; c.drawImage(I.cart, Math.round(A.cart.x - 14 + sh), Math.round(A.cart.y - 46), 64, 48);
    }
    // soft ground shadows
    for (const a of [A.mom, A.hero, A.boss]) { c.fillStyle = 'rgba(20,9,31,.35)'; c.beginPath(); c.ellipse(a.x, a.y + 2, a === A.boss ? 34 : 24, 5, 0, 0, 6.3); c.fill(); }
    for (const a of actors) a.draw();
    for (const k of A.cans) { c.save(); c.translate(Math.round(k.x), Math.round(k.y)); c.rotate(k.r); c.fillStyle = k.c; c.fillRect(-3, -4, 6, 8); c.fillStyle = '#fff'; c.fillRect(-3, -1, 6, 2); c.restore(); }
    if (I && I.glow.complete) { c.globalCompositeOperation = 'lighter'; c.drawImage(I.glow, 0, 0); c.globalCompositeOperation = 'source-over'; }
    FX.draw(c, 0);
    c.restore();
    if (this.fade > 0) { c.fillStyle = `rgba(5,1,15,${Math.min(1, this.fade)})`; c.fillRect(0, 0, W, H); }
  },

  // dialogue + hints, drawn at screen resolution by overlay() so the text stays crisp
  drawUI(c) {
    if (!this.A || this.done) return;
    // location card
    if (this.bi === 0) {
      const a = this.bt < 20 ? this.bt / 20 : this.bt > 150 ? Math.max(0, 1 - (this.bt - 150) / 30) : 1;
      c.save(); c.globalAlpha = a;
      drawText(c, 'SAMEDI, 17H42', 18, 24, { size: 10, color: '#27f0ff', outline: OUT, glow: '#27f0ff' });
      c.restore();
    }
    if (this.line) drawDialogueBox(c, this.line.who, this.line.lines, this.typed, this.line.full, this.names[this.line.who], this.t);
    if (this.t > 60) drawText(c, K('ENTREE : SUITE   -   ECHAP : PASSER', 'A : SUITE   -   START : PASSER'), W - 12, 14, { size: 7, color: '#bfb3e0', outline: OUT, align: 'right' });
  },
};

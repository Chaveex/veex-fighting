'use strict';
// Fully procedural audio: sfx + 80s synthwave step-sequencer. No files needed.
const Snd = (() => {
  let ctx = null, master, sfxBus, musBus, noiseBuf, muted = false;
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2;
    master = ctx.createGain(); master.gain.value = 0.7;
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9;
    musBus = ctx.createGain(); musBus.gain.value = 0.42;
    sfxBus.connect(comp); musBus.connect(comp); comp.connect(master); master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function resume() { init(); if (ctx && ctx.state === 'suspended') ctx.resume(); }
  function toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.7; return muted; }

  function tone(o) {
    if (!ctx) return;
    const t = ctx.currentTime + (o.when || 0);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t + o.dur);
    const a = o.attack || 0.003, v = o.vol === undefined ? 0.25 : o.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    let node = osc;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; osc.connect(f); node = f; }
    node.connect(g); g.connect(o.dest || sfxBus);
    osc.start(t); osc.stop(t + o.dur + 0.05);
  }
  function noise(o) {
    if (!ctx) return;
    const t = ctx.currentTime + (o.when || 0);
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    src.playbackRate.value = o.rate || 1;
    const f = ctx.createBiquadFilter(); f.type = o.ftype || 'bandpass';
    f.frequency.setValueAtTime(o.f || 1000, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain();
    const a = o.attack || 0.002;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol === undefined ? 0.3 : o.vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f); f.connect(g); g.connect(o.dest || sfxBus);
    src.start(t, Math.random()); src.stop(t + o.dur + 0.05);
  }

  const sfx = {
    swing(p = 1) { noise({ f: 700 * p, f2: 3200 * p, dur: 0.11, vol: 0.14, q: 0.8, attack: 0.03 }); },
    hit(w = 1) {
      noise({ f: 1800, f2: 300, dur: 0.09 + w * 0.03, vol: 0.4 + w * 0.08, q: 0.7 });
      tone({ type: 'sine', f: 190 - w * 20, f2: 38, dur: 0.14 + w * 0.05, vol: 0.55 + w * 0.1 });
      if (w >= 2) tone({ type: 'square', f: 900, f2: 120, dur: 0.07, vol: 0.12 });
    },
    crit() {
      noise({ f: 5000, f2: 400, dur: 0.22, vol: 0.5, q: 0.5, ftype: 'highpass' });
      tone({ type: 'sawtooth', f: 1400, f2: 90, dur: 0.22, vol: 0.28, lp: 4000 });
      tone({ type: 'sine', f: 110, f2: 30, dur: 0.3, vol: 0.8 });
    },
    dash() {
      noise({ f: 400, f2: 4800, dur: 0.16, vol: 0.22, q: 0.9, attack: 0.02 });
      tone({ type: 'triangle', f: 220, f2: 620, dur: 0.12, vol: 0.12 });
    },
    airdash() {
      noise({ f: 900, f2: 6000, dur: 0.2, vol: 0.24, q: 1.2, attack: 0.02 });
      tone({ type: 'sine', f: 500, f2: 1400, dur: 0.14, vol: 0.14 });
    },
    jump() { tone({ type: 'square', f: 260, f2: 620, dur: 0.11, vol: 0.09 }); },
    land() { tone({ type: 'sine', f: 90, f2: 40, dur: 0.1, vol: 0.4 }); noise({ f: 300, dur: 0.06, vol: 0.12 }); },
    hurt() { tone({ type: 'sawtooth', f: 420, f2: 90, dur: 0.24, vol: 0.2, lp: 1800 }); sfx.hit(2); },
    ko() {
      noise({ f: 2400, f2: 120, dur: 0.6, vol: 0.55, q: 0.5 });
      tone({ type: 'sine', f: 150, f2: 26, dur: 0.6, vol: 0.9 });
      tone({ type: 'sawtooth', f: 800, f2: 60, dur: 0.4, vol: 0.18, lp: 2500 });
    },
    boom() {
      noise({ f: 1400, f2: 80, dur: 0.9, vol: 0.7, q: 0.4 });
      tone({ type: 'sine', f: 120, f2: 22, dur: 0.9, vol: 1 });
    },
    dodge() {
      [0, 4, 7, 12].forEach((n, i) => tone({ type: 'sine', f: midi(84 + n), dur: 0.35, vol: 0.13, when: i * 0.045 }));
    },
    hiss(v = 1) { noise({ f: 6000, f2: 3500, dur: 0.22, vol: Math.min(0.14, 0.05 * v), q: 0.6, ftype: 'highpass', attack: 0.02 }); },
    steam() {
      noise({ f: 5200, f2: 1100, dur: 0.75, vol: 0.42, q: 0.5, ftype: 'highpass', attack: 0.01 });
      noise({ f: 900, f2: 200, dur: 0.35, vol: 0.3, q: 0.6 });
      tone({ type: 'sine', f: 95, f2: 38, dur: 0.3, vol: 0.55 });
    },
    clang() {
      tone({ type: 'square', f: 540, f2: 340, dur: 0.11, vol: 0.12 }); tone({ type: 'triangle', f: 1350, f2: 820, dur: 0.2, vol: 0.1 });
      noise({ f: 3200, f2: 1600, dur: 0.09, vol: 0.2, q: 1.5 });
    },
    zap(v = 1) {
      noise({ f: 4200, f2: 700, dur: 0.3 * v + 0.05, vol: 0.28 * v, q: 0.6, ftype: 'highpass' }); tone({ type: 'sawtooth', f: 1900, f2: 180, dur: 0.26 * v + 0.05, vol: 0.18 * v, lp: 4200 });
    },
    boing() { tone({ type: 'sine', f: 170, f2: 560, dur: 0.22, vol: 0.32 }); tone({ type: 'sine', f: 560, f2: 300, dur: 0.16, vol: 0.2, when: 0.1 }); },
    splash() { noise({ f: 2600, f2: 900, dur: 0.45, vol: 0.32, q: 0.7, attack: 0.02 }); tone({ type: 'sine', f: 220, f2: 90, dur: 0.25, vol: 0.3 }); },
    pop() { noise({ f: 1800, f2: 500, dur: 0.12, vol: 0.4, q: 0.5 }); tone({ type: 'sine', f: 320, f2: 80, dur: 0.14, vol: 0.4 }); },
    cancel() { tone({ type: 'triangle', f: 700, f2: 1500, dur: 0.09, vol: 0.14 }); },
    pickup() { [72, 76, 79, 84].forEach((n, i) => tone({ type: 'square', f: midi(n), dur: 0.09, vol: 0.1, when: i * 0.06 })); },
    ui() { tone({ type: 'square', f: 880, f2: 1320, dur: 0.06, vol: 0.09 }); },
    select() { tone({ type: 'square', f: 440, dur: 0.05, vol: 0.09 }); tone({ type: 'square', f: 660, dur: 0.09, vol: 0.09, when: 0.05 }); },
    throw_() { noise({ f: 1200, f2: 3000, dur: 0.12, vol: 0.18, q: 2 }); tone({ type: 'triangle', f: 300, f2: 700, dur: 0.1, vol: 0.1 }); },
    tele() { tone({ type: 'square', f: 1200, dur: 0.05, vol: 0.06 }); },
    laser() {
      tone({ type: 'sawtooth', f: 2400, f2: 200, dur: 0.6, vol: 0.2, lp: 5000 });
      noise({ f: 3000, dur: 0.5, vol: 0.2, q: 0.6, ftype: 'highpass' });
    },
    warn() { tone({ type: 'square', f: 440, dur: 0.1, vol: 0.1 }); tone({ type: 'square', f: 330, dur: 0.1, vol: 0.1, when: 0.12 }); },
    special() {
      tone({ type: 'sawtooth', f: 80, f2: 900, dur: 0.5, vol: 0.28, lp: 3000 });
      noise({ f: 300, f2: 6000, dur: 0.5, vol: 0.3, q: 0.8 });
    },
    go() { [67, 71, 74].forEach((n, i) => tone({ type: 'square', f: midi(n), dur: 0.16, vol: 0.1, when: i * 0.09 })); },
    fanfare() { [60, 64, 67, 72, 67, 72, 76].forEach((n, i) => tone({ type: 'square', f: midi(n), dur: 0.2, vol: 0.12, when: i * 0.12 })); },
    over() { [67, 63, 60, 55].forEach((n, i) => tone({ type: 'sawtooth', f: midi(n), dur: 0.4, vol: 0.14, when: i * 0.25, lp: 1600 })); }
  };

  // ---------- music ----------
  // songs: per level. prog = chord roots (semitones from root), minor unless major:true
  const SONGS = [
    { name: 'neon', bpm: 116, root: 45, prog: [0, -4, -2, -5], arp: [0, 7, 12, 7], lead: [12, 15, 19, 15, 12, 10, 12, 7] },
    { name: 'arcade', bpm: 126, root: 47, prog: [0, -2, -4, -2], arp: [0, 3, 7, 12], lead: [19, 17, 15, 12, 15, 17, 19, 22] },
    { name: 'miami', bpm: 108, root: 48, major: true, prog: [0, 5, -3, 7], arp: [0, 4, 7, 12], lead: [16, 19, 21, 19, 16, 14, 12, 16] },
    { name: 'cyber', bpm: 132, root: 43, prog: [0, 0, -2, 1], arp: [0, 3, 7, 10], lead: [15, 14, 12, 10, 12, 14, 15, 19] }
  ];
  const M = { on: false, song: null, boss: false, step: 0, next: 0, timer: 0, gainMul: 1 };

  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g); g.connect(musBus); o.start(t); o.stop(t + 0.25);
  }
  function snare(t) {
    noise({ f: 1800, dur: 0.16, vol: 0.5, q: 0.6, dest: musBus, when: t - ctx.currentTime });
    tone({ type: 'triangle', f: 210, f2: 120, dur: 0.1, vol: 0.35, dest: musBus, when: t - ctx.currentTime });
  }
  function hat(t, open) {
    noise({ f: 8000, dur: open ? 0.16 : 0.04, vol: open ? 0.14 : 0.1, q: 0.5, ftype: 'highpass', dest: musBus, when: t - ctx.currentTime });
  }
  function bassNote(t, n, len) {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = midi(n);
    f.type = 'lowpass'; f.Q.value = 6; f.frequency.setValueAtTime(1600, t); f.frequency.exponentialRampToValueAtTime(220, t + len);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(f); f.connect(g); g.connect(musBus); o.start(t); o.stop(t + len + 0.02);
  }
  function synthNote(t, n, len, vol, type, lp) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = o2.type = type; o.frequency.value = midi(n); o2.frequency.value = midi(n) * 1.006;
    f.type = 'lowpass'; f.frequency.value = lp;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(musBus);
    o.start(t); o2.start(t); o.stop(t + len + 0.02); o2.stop(t + len + 0.02);
  }
  function pad(t, root, len, major) {
    [0, major ? 4 : 3, 7].forEach(iv => {
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = midi(root + 12 + iv) * (1 + (Math.random() - 0.5) * 0.004);
      f.type = 'lowpass'; f.frequency.value = 900;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.045, t + len * 0.3); g.gain.linearRampToValueAtTime(0.0001, t + len);
      o.connect(f); f.connect(g); g.connect(musBus); o.start(t); o.stop(t + len + 0.05);
    });
  }

  function scheduleStep(t, step) {
    const s = M.song, boss = M.boss;
    const bar = Math.floor(step / 16) % 4, i = step % 16;
    const root = s.root + s.prog[bar];
    const sixteenth = 60 / (s.bpm + (boss ? 10 : 0)) / 4;
    if (i % 4 === 0) kick(t);
    else if (boss && (i === 7 || i === 14)) kick(t);
    if (i === 4 || i === 12) snare(t);
    if (i % 2 === 0) hat(t, i % 4 === 2); else if (boss || i % 4 === 3) hat(t, false);
    // driving 8th bass with octave jumps
    if (i % 2 === 0) bassNote(t, root - 12 + (i % 4 === 2 ? 12 : 0) + (i === 14 ? 7 : 0), sixteenth * 1.8);
    // arpeggio
    const ap = s.arp[(i >> 1) % 4] + (i % 4 === 1 ? 12 : 0);
    synthNote(t, root + 12 + ap, sixteenth * 1.2, boss ? 0.075 : 0.055, 'square', 2400);
    if (i === 0) pad(t, root, sixteenth * 16, s.major);
    // lead melody on bars 2 and 4 (and every bar for boss)
    if ((bar % 2 === 1 || boss) && i % 2 === 0) {
      const note = s.lead[(i >> 1)];
      if ((i >> 1) % 3 !== 2 || boss) synthNote(t, s.root + 12 + note + (s.prog[bar] > 0 ? 0 : 0), sixteenth * 3.2, 0.08, 'sawtooth', 3200);
    }
  }
  function tick() {
    if (!ctx || !M.on) return;
    const s = M.song;
    const sixteenth = 60 / (s.bpm + (M.boss ? 10 : 0)) / 4;
    while (M.next < ctx.currentTime + 0.15) {
      scheduleStep(M.next, M.step);
      M.step++; M.next += sixteenth;
    }
  }
  function playMusic(level, boss) {
    if (!ctx) return;
    stopMusic();
    M.song = SONGS[level % SONGS.length]; M.boss = !!boss; M.step = 0; M.next = ctx.currentTime + 0.08; M.on = true;
    M.timer = setInterval(tick, 30);
  }
  function stopMusic() { M.on = false; if (M.timer) clearInterval(M.timer); M.timer = 0; }

  return { init, resume, sfx, playMusic, stopMusic, toggleMute, get ready() { return !!ctx; } };
})();

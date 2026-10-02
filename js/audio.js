'use strict';
// Procedural audio (sfx + 80s synthwave step-sequencer) + a few ElevenLabs clips (js/sfxData.js, tools/make_sfx.py).
// Every clip has a synthesized fallback, so the game still sounds right if a clip is missing.
const Snd = (() => {
  let ctx = null, master, sfxBus, musBus, loopBus, annBus, voiceBus, sfx2Bus, masterIn, noiseBuf, muted = false;
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const dB = v => Math.pow(10, v / 20);
  // ================= AUDIO MIXER =================
  // Four groups summed into the master, then a brickwall: nothing ever leaves above -1 dBFS.
  //   voice  (announcer, hero / enemy voices)          target  0 .. -3 dB   - top priority, always cuts through
  //   sfx    (combat: hits, impacts, blasts, hazards)  target -3 .. -6 dB
  //   sfx2   (UI, jumps / landings, pickups, ambience) target -8 .. -12 dB
  //   music                                             target -12 .. -18 dB
  // fader = the bus gain; trim = calibration so that the bus PEAK in game lands on its target (measured with Snd.meter(),
  // a 60 s bot run at level 1: see the numbers in the comments). Ducking: while the announcer talks, music and sfx2 dip.
  const MIX = {
    fader: { voice: -1.5, sfx: -4.5, sfx2: -10, music: -15 },
    // calibration (bot run, level 1, 40 s, before trim): voice p95 +0.2 / max +3.0 | sfx p95 -6.1 / max -3.2 (with glue comp)
    //                                                 sfx2 p95 -17.9 / max -15.8 | music p95 -16.6 / max -13.1
    trim: { voice: -2, sfx: 1.5, sfx2: 7.5, music: 1 },
    ceiling: -1,                                     // master brickwall (dBFS)
    duck: { music: -7, sfx2: -4, attack: 0.05, release: 0.45 },
  };
  let route = null;                                  // bus forced by a sfx2 wrapper (see SECONDARY below)
  const meters = {};                                 // AnalyserNode taps for the bus meters

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    // ---- groups -> master -> limiter -> brickwall clipper -> output ----
    const bus = name => { const g = ctx.createGain(); g.gain.value = dB(MIX.fader[name] + MIX.trim[name]); g.connect(masterIn); return g; };
    masterIn = ctx.createGain();
    voiceBus = bus('voice'); sfx2Bus = bus('sfx2'); musBus = bus('music');
    // sfx group: a glue compressor in front of the fader tames stacked impacts (5 hits + a blast on the same frame) without flattening single hits
    const sfxFader = bus('sfx'); sfxBus = ctx.createDynamicsCompressor();
    sfxBus.threshold.value = -12; sfxBus.knee.value = 6; sfxBus.ratio.value = 4; sfxBus.attack.value = 0.003; sfxBus.release.value = 0.12;
    sfxBus.connect(sfxFader); sfxBus.fader = sfxFader;
    loopBus = ctx.createGain(); loopBus.connect(sfx2Bus);           // ambience loops (hydrant jet, faulty buzz...)
    // limiter: hard knee, fast attack, catches the sum before it reaches the ceiling
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = MIX.ceiling - 2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.1;
    // brickwall: the limiter has no look-ahead, so a waveshaper guarantees the ceiling (transparent below -3 dBFS, soft above, flat at -1)
    const clip = ctx.createWaveShaper(), C = dB(MIX.ceiling), knee = dB(MIX.ceiling - 2), cv = new Float32Array(4096);
    for (let i = 0; i < 4096; i++) {
      const x = i / 2047.5 - 1, a = Math.abs(x);
      const y = a <= knee ? a : knee + (C - knee) * Math.tanh((a - knee) / (C - knee));
      cv[i] = Math.sign(x) * Math.min(C, y);
    }
    clip.curve = cv; clip.oversample = '4x';
    master = ctx.createGain(); master.gain.value = muted ? 0 : 1;
    masterIn.connect(lim); lim.connect(clip); clip.connect(master); master.connect(ctx.destination);
    for (const [name, node] of [['voice', voiceBus], ['sfx', sfxBus.fader], ['sfx2', sfx2Bus], ['music', musBus], ['master', clip]]) {
      const an = ctx.createAnalyser(); an.fftSize = 2048; node.connect(an); meters[name] = { an, buf: new Float32Array(2048), peak: -120, hold: -120 };
    }
    // announcer: "close-miked arcade announcer in a big arena" (Street Fighter / Mortal Kombat / UT style): a DRY, compressed, deep voice
    // with only a short dense arena tail mixed low. No discrete echoes (they sounded like a fairground PA), light saturation only,
    // gentle presence instead of a megaphone bump, nasal low-mids scooped. Clips are slightly pitched down (see announce()).
    annBus = ctx.createGain(); annBus.gain.value = 1.0;              // announcer chain -> voice group
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 70;
    const drive = ctx.createWaveShaper(); const curve = new Float32Array(1024), K = 2.4;   // grit, not distortion
    for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; curve[i] = (1 + K) * x / (1 + K * Math.abs(x)); }
    drive.curve = curve; drive.oversample = '2x';
    const bass = ctx.createBiquadFilter(); bass.type = 'lowshelf'; bass.frequency.value = 160; bass.gain.value = 6;   // chest
    const box = ctx.createBiquadFilter(); box.type = 'peaking'; box.frequency.value = 450; box.Q.value = 1.1; box.gain.value = -3;
    const pres = ctx.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 3200; pres.Q.value = 0.7; pres.gain.value = 2;
    const comp2 = ctx.createDynamicsCompressor(); comp2.threshold.value = -22; comp2.ratio.value = 6; comp2.attack.value = 0.003; comp2.release.value = 0.12;
    const out = ctx.createGain(); out.gain.value = 0.85;
    annBus.connect(hp); hp.connect(drive); drive.connect(bass); bass.connect(box); box.connect(pres); pres.connect(comp2); comp2.connect(out); out.connect(voiceBus);
    // short dense arena tail: generated impulse (25 ms pre-delay, ~0.9 s exponential decay, darkened), mixed well below the dry voice
    const rate = ctx.sampleRate, len = Math.floor(rate * 0.95), ir = ctx.createBuffer(2, len, rate), pre = Math.floor(rate * 0.025);
    for (let ch = 0; ch < 2; ch++) {
      const dt = ir.getChannelData(ch); let lpz = 0;
      for (let i = pre; i < len; i++) { const t = (i - pre) / rate; lpz += ((Math.random() * 2 - 1) - lpz) * (0.35 - 0.25 * t / 0.95); dt[i] = lpz * Math.exp(-t * 5.5); }
    }
    const verb = ctx.createConvolver(); verb.buffer = ir;
    const verbLp = ctx.createBiquadFilter(); verbLp.type = 'lowpass'; verbLp.frequency.value = 3500;
    const wet = ctx.createGain(); wet.gain.value = 0.16;
    comp2.connect(verb); verb.connect(verbLp); verbLp.connect(wet); wet.connect(voiceBus);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    loadSamples();
  }
  // ---- recorded clips: base64 MP3 -> AudioBuffer; the leading silence is skipped so hits land on the frame ----
  const samples = {};
  function loadSamples() {
    if (typeof SFX_DATA === 'undefined') return;
    for (const k in SFX_DATA) {
      const bin = atob(SFX_DATA[k]), bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      ctx.decodeAudioData(bytes.buffer).then(buf => {
        const ch = buf.getChannelData(0); let peak = 0, i0 = 0;
        for (let i = 0; i < ch.length; i++) peak = Math.max(peak, Math.abs(ch[i]));
        while (i0 < ch.length && Math.abs(ch[i0]) < peak * 0.12) i0++;
        samples[k] = { buf, off: Math.max(0, i0 / buf.sampleRate - 0.004), peak };
      }).catch(() => { /* keep the synth fallback */ });
    }
  }
  function sample(name, o = {}) {
    const s = samples[name]; if (!ctx || !s) return false;
    const src = ctx.createBufferSource(); src.buffer = s.buf; src.playbackRate.value = o.rate || 1;
    const g = ctx.createGain(); g.gain.value = (o.vol === undefined ? 1 : o.vol) * Math.min(4, 0.9 / Math.max(0.05, s.peak));   // peak-normalized
    src.connect(g); g.connect(o.bus === 'ann' ? annBus : o.bus === 'voice' ? voiceBus : route || sfxBus); src.start(ctx.currentTime, s.off);
    if (o.dur) {   // cut the clip after o.dur seconds with a short fade (drops a tail we don't want)
      const t = ctx.currentTime, v = g.gain.value; g.gain.setValueAtTime(v, t + o.dur - 0.08); g.gain.linearRampToValueAtTime(0, t + o.dur); src.stop(t + o.dur + 0.02);
    }
    return { src, g };
  }
  let lastBinHit = '', lastCab = '', lastBump = '', lastBall = '', lastCar = '', lastSrv = '', lastEnemyKO = '';
  const cryLast = {}, lastOf = {};
  let annUntil = 0, annPrio = 0, annNode = null, lastNode = null, annLast = -99;
  const ANN_RATE = 0.85;                                    // the clips are generated 15 % faster: ~3 semitones deeper, same pace
  const ANN_COOLDOWN = { perfect: 6, rank: 8 };            // seconds between two PERFECT! / two style rank calls
  const annCdAt = {};
  // takes of a family: <base> itself and <base>_a, <base>_b...
  function family(base) { return Object.keys(samples).filter(k => k === base || (k.length === base.length + 2 && k.startsWith(base + '_'))); }
  function playFamily(base, o) {
    const all = family(base); if (!all.length) return null;
    const pool = all.length > 1 ? all.filter(k => k !== lastOf[base]) : all;
    const k = pool[Math.floor(Math.random() * pool.length)]; lastOf[base] = k;
    lastNode = sample(k, o); return lastNode ? k : null;
  }
  const takeOf = (list, last) => { const ok = list.filter(k => k !== last && samples[k]); return ok.length ? ok[Math.floor(Math.random() * ok.length)] : null; };
  // ---- looping clips (hydrant jet...): one per key, faded in / out, silenced outside of play ----
  const loops = {};
  const norm = s => Math.min(4, 0.9 / Math.max(0.05, s.peak));
  function loopStart(key, name, vol = 1) {
    if (loops[key]) return true;
    const s = samples[name]; if (!ctx || !s) return false;
    const src = ctx.createBufferSource(); src.buffer = s.buf; src.loop = true;
    const g = ctx.createGain(), t = ctx.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * norm(s), t + 0.15);
    src.connect(g); g.connect(loopBus); src.start(t, Math.random() * s.buf.duration);
    loops[key] = { src, g, n: norm(s) }; return true;
  }
  function loopVol(key, vol) { const l = loops[key]; if (l && ctx) l.g.gain.setTargetAtTime(vol * l.n, ctx.currentTime, 0.08); }
  function loopStop(key, fade = 0.35) {
    const l = loops[key]; if (!l || !ctx) return; delete loops[key];
    const t = ctx.currentTime; l.g.gain.setTargetAtTime(0, t, fade / 3); l.src.stop(t + fade + 0.05);
  }
  function stopLoops() { for (const k in loops) loopStop(k, 0.1); }
  function loopsActive(on) { if (loopBus) loopBus.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.05); }
  function resume() { init(); if (ctx && ctx.state === 'suspended') ctx.resume(); }
  function toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 1; return muted; }
  // ducking: music and secondary sfx dip while a voice line plays, then come back
  function duck(seconds) {
    if (!ctx) return; const t = ctx.currentTime, D = MIX.duck;
    for (const [b, name, amt] of [[musBus, 'music', D.music], [sfx2Bus, 'sfx2', D.sfx2]]) {
      const base = dB(MIX.fader[name] + MIX.trim[name]), g = b.gain;
      g.cancelScheduledValues(t); g.setTargetAtTime(base * dB(amt), t, D.attack / 3);
      g.setTargetAtTime(base, t + Math.max(0.2, seconds), D.release / 3);
    }
  }
  // bus meters (peak dBFS of the last frame + a decaying peak hold); call meterTick() once per frame when they are displayed
  function meterTick() {
    for (const k in meters) {
      const m = meters[k]; m.an.getFloatTimeDomainData(m.buf); let p = 0;
      for (let i = 0; i < m.buf.length; i++) { const a = Math.abs(m.buf[i]); if (a > p) p = a; }
      m.peak = p > 1e-6 ? 20 * Math.log10(p) : -120; m.hold = Math.max(m.peak, m.hold - 0.4);
      m.max = Math.max(m.max ?? -120, m.peak);
    }
  }
  function meter() { const o = {}; for (const k in meters) o[k] = { peak: +meters[k].peak.toFixed(1), hold: +meters[k].hold.toFixed(1), max: +(meters[k].max ?? -120).toFixed(1) }; return o; }
  function meterReset() { for (const k in meters) meters[k].max = -120; }

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
    node.connect(g); g.connect(o.dest || route || sfxBus);
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
    src.connect(f); f.connect(g); g.connect(o.dest || route || sfxBus);
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
    // trash bins: three recorded takes, never the same twice in a row, slight pitch spread
    binHit() {
      const takes = ['bin_hit_a', 'bin_hit_b', 'bin_hit_c'].filter(k => k !== lastBinHit && samples[k]);
      if (takes.length) { lastBinHit = takes[Math.floor(Math.random() * takes.length)]; sample(lastBinHit, { vol: 0.95, rate: 0.94 + Math.random() * 0.12 }); }
      else sfx.clang();
    },
    // steam manholes: warning rattle (returns false without the clip so the caller keeps the synth hiss), then the blast
    ventWarn() { return sample('vent_warn', { vol: 0.75, rate: 0.96 + Math.random() * 0.08 }); },
    ventBurst() { if (!sample('vent_burst', { vol: 0.95, rate: 0.95 + Math.random() * 0.1 })) sfx.steam(); },
    // fire hydrant: iron hit, cap bursting off; the jet itself is a loop (Snd.loopStart in Hydrant.update)
    hydrantHit() { if (!sample('hydrant_hit', { vol: 0.9, rate: 0.95 + Math.random() * 0.1 })) sfx.clang(); },
    hydrantBurst() { if (!sample('hydrant_burst', { vol: 1.0 })) sfx.splash(); },
    // arcade cabinets (stage 2): hits, then the CRT implodes in an electric arc (the faulty buzz is a loop in Cabinet.update)
    cabHit() { const k = takeOf(['cab_hit_a', 'cab_hit_b'], lastCab); if (k) { lastCab = k; sample(k, { vol: 0.9, rate: 0.95 + Math.random() * 0.1 }); } else { sfx.clang(); sfx.zap(0.4); } },
    cabBreak() { if (!sample('cab_break', { vol: 1.0 })) { sfx.zap(1); sfx.boom(); } },
    // pinball bumpers (stage 2)
    bumper() { const k = takeOf(['bumper_a', 'bumper_b'], lastBump); if (k) { lastBump = k; sample(k, { vol: 0.85, rate: 0.96 + Math.random() * 0.08 }); } else sfx.boing(); },
    // beach ball (stage 3)
    ballKick() { const k = takeOf(['ball_kick_a', 'ball_kick_b'], lastBall); if (k) { lastBall = k; sample(k, { vol: 0.85, rate: 0.95 + Math.random() * 0.1 }); } else sfx.boing(); },
    // rebounds: same hollow beach-ball takes, higher and softer (a separate clip sounded like sheet metal)
    ballBounce() { const k = takeOf(['ball_kick_a', 'ball_kick_b'], ''); if (k) sample(k, { vol: 0.45, rate: 1.2 + Math.random() * 0.15 }); else sfx.boing(); },
    ballPop() { if (!sample('ball_pop', { vol: 0.9 })) sfx.pop(); },
    // pink cabriolet (stage 3): body hits, a one-shot alarm when it is about to blow (returns false without the clip), explosion
    carHit() { const k = takeOf(['car_hit_a', 'car_hit_b'], lastCar); if (k) { lastCar = k; sample(k, { vol: 0.9, rate: 0.95 + Math.random() * 0.1 }); } else { sfx.clang(); sfx.hit(2); } },
    carAlarm() { return sample('car_alarm', { vol: 0.45 }); },
    carExplode() { if (!sample('car_explode', { vol: 1.0 })) { sfx.boom(); sfx.boom(); } },
    // electrified plates (stage 4): charge (returns false without the clip so the caller keeps the synth crackle), discharge
    plateCharge() { return sample('plate_charge', { vol: 0.55, rate: 0.96 + Math.random() * 0.08 }); },
    plateZap() { if (!sample('plate_zap', { vol: 0.8, rate: 0.95 + Math.random() * 0.1 })) sfx.zap(1); },
    // server racks (stage 4): hits, EMP crash (the fault alarm is played by Server via loopStart / loopStop, ~2.5 s, not looped)
    srvHit() { const k = takeOf(['srv_hit_a', 'srv_hit_b'], lastSrv); if (k) { lastSrv = k; sample(k, { vol: 0.9, rate: 0.95 + Math.random() * 0.1 }); } else { sfx.clang(); sfx.zap(0.4); } },
    srvCrash() { if (!sample('srv_crash', { vol: 1.0 })) { sfx.zap(1); sfx.special(); } },
    // MR. CHROME's floor laser: lock-on while the red strip blinks (cut at 0.8 s, before the clip's end click), then the beam
    laserWarn() { if (!sample('laser_warn', { vol: 0.7, dur: 0.8 })) sfx.warn(); },
    laserFire() { if (!sample('laser_fire', { vol: 0.9, rate: 0.97 + Math.random() * 0.06 })) sfx.laser(); },
    // ---- voices: every family (veex_kiai, enemy_ko, ann_fight...) has several takes; a random one plays, never twice in a row ----
    cry(kind, hero) {   // hero cries follow the chosen hero (VEEX male / ROXY female); throttled so a flurry of hits never spams them
      if (!ctx) return; const now = ctx.currentTime;
      if (now - (cryLast[kind] ?? -9) < ({ kiai: 0.45, hurt: 0.35, atk: 0.3 }[kind] || 0)) return;
      cryLast[kind] = now;
      playFamily((hero === 'roxy' ? 'roxy' : 'veex') + '_' + kind, { bus: 'voice', vol: { hurt: 0.6, atk: 0.45 }[kind] || 0.75, rate: 0.96 + Math.random() * 0.08, dur: { kiai: 0.55, hurt: 0.5, atk: 0.35, ko: 1.4 }[kind] });
    },
    // enemies: the voice follows the enemy (robots on stage 4, women, men); bosses are pitched down
    enemyVoice(e) { const st = (e && e.style) || {}; return st.robot || st.head === 'robot' || st.head === 'crt' ? 'robot' : st.head === 'blonde' ? 'enemyf' : 'enemy'; },
    enemyKO(e) { const boss = e && e.boss; playFamily(sfx.enemyVoice(e) + '_ko', { bus: 'voice', vol: boss ? 0.85 : 0.55, rate: boss ? 0.8 : 0.9 + Math.random() * 0.2, dur: boss ? 1.1 : 0.75 }); },
    enemyHurt(e) {
      if (!ctx || Math.random() > 0.35) return; const now = ctx.currentTime; if (now - (cryLast.enemyHurt ?? -9) < 0.25) return; cryLast.enemyHurt = now;
      playFamily(sfx.enemyVoice(e) + '_hurt', { bus: 'voice', vol: 0.42, rate: (e && e.boss ? 0.82 : 0.9) + Math.random() * 0.2, dur: 0.45 });
    },
    // announcer (ElevenLabs text to speech): priority lines (K.O., stage clear...) talk over the minor ones, never the reverse
    announce(name, prio = 1) {
      if (!ctx) return; const now = ctx.currentTime;
      if (now < annUntil && prio <= annPrio) return;
      // game design: an announcement hits when it is rare and readable -> minor lines keep 1.5 s of air, some lines have a cooldown
      if (prio < 3 && now - annLast < 1.5) return;
      const cd = ANN_COOLDOWN[name.replace(/_[a-z]+$/, '')] || ANN_COOLDOWN[name]; if (cd && now - (annCdAt[name.slice(0, 4)] ?? -99) < cd) return;
      if (cd) annCdAt[name.slice(0, 4)] = now;
      if (now < annUntil && annNode) { try { annNode.g.gain.setTargetAtTime(0, now, 0.03); annNode.src.stop(now + 0.12); } catch (e) { /* already stopped */ } }   // a priority line cuts the current one
      const k = playFamily('ann_' + name, { vol: 1.0, rate: ANN_RATE, bus: 'ann' }); if (!k) return;   // slightly pitched down + arena chain
      annNode = lastNode; duck((samples[k].buf.duration - samples[k].off) / ANN_RATE);
      annUntil = now + (samples[k].buf.duration - samples[k].off) / ANN_RATE; annPrio = prio; annLast = now;
    },
    binBreak() { if (!sample('bin_break', { vol: 1.0, rate: 0.97 + Math.random() * 0.06 })) { sfx.clang(); sfx.hit(2); } },
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

  // ---- secondary effects (UI, jumps / landings, pickups, jingles, ambience): routed to the sfx2 group ----
  const SECONDARY = ['jump', 'land', 'hiss', 'pickup', 'ui', 'select', 'tele', 'warn', 'go', 'fanfare', 'over', 'cancel', 'carAlarm'];
  for (const k of SECONDARY) {
    const f = sfx[k]; if (!f) continue;
    sfx[k] = (...a) => { const prev = route; route = sfx2Bus; try { return f(...a); } finally { route = prev; } };
  }

  return { init, resume, sfx, sample, meterTick, meter, meterReset, MIX, duck, loopStart, loopVol, loopStop, stopLoops, loopsActive, playMusic, stopMusic, toggleMute, get ready() { return !!ctx; }, get clips() { return samples; } };
})();

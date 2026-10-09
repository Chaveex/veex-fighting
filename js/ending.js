'use strict';
// ============ ending: the hero rides off on a motorbike into a Vice-style sunset ============
// Fully procedural (no assets). Driven by End.step() per frame, drawn by End.draw(c, hero, portrait).
const End = {
  t: 0, scroll: 0, len: 1020,
  reset() { this.t = 0; this.scroll = 0; },
  speed() { const t = this.t; return t < 240 ? 2 + 6 * (1 - ease3(1 - t / 240)) * 0.5 : t < 660 ? 3.2 : 3.2 + Math.pow((t - 660) / 40, 2); },
  step() { this.t++; this.scroll += this.speed(); },
  bikeX() { const t = this.t; return t < 240 ? -110 + 350 * ease3(t / 240) : t < 660 ? 240 + Math.sin(t * 0.02) * 4 : 240 + Math.pow((t - 660) / 34, 2.2) * 40; },
  draw(c, hero) {
    const t = this.t;
    drawBackdrop(c, t, this.scroll);
    const bx = this.bikeX(), by = 322, wheelie = t > 650 ? Math.min(0.42, (t - 650) / 60 * 0.42) : 0;
    drawBike(c, bx, by + Math.sin(t * 0.7) * 0.6, t, this.scroll, hero, wheelie, t > 660);
    // speed lines once the throttle opens
    if (t > 660) {
      const k = Math.min(1, (t - 660) / 40);
      c.fillStyle = `rgba(255,255,255,${0.35 * k})`;
      for (let i = 0; i < 14; i++) { const y = 262 + ((i * 53) % 90), x = W - ((t * 22 + i * 91) % (W + 160)); c.fillRect(x, y, 70 + (i % 3) * 30, 1); }
    }
    // titles
    const a1 = fade(t, 90, 150, 330, 390), a2 = fade(t, 480, 540, 9999, 9999), a3 = fade(t, 780, 840, 9999, 9999);
    if (a1 > 0) { c.save(); c.globalAlpha = a1; drawText(c, 'SUNSET BOULEVARD', W / 2, 62, { size: 14, color: '#ffe44d', outline: '#ff2fd0', align: 'center', italic: true, glow: '#ff2fd0', outlineW: 4 }); c.restore(); }
    if (a2 > 0) { c.save(); c.globalAlpha = a2; drawText(c, 'THE END', W / 2, 74, { size: 38, color: '#fff', outline: '#ff2fd0', align: 'center', italic: true, glow: '#ff2fd0', outlineW: 6 }); c.restore(); }
    if (a3 > 0) { c.save(); c.globalAlpha = a3; drawText(c, 'VEEXING FORCE', W / 2, 112, { size: 16, color: '#27f0ff', outline: OUT, align: 'center', italic: true, glow: '#27f0ff' }); c.restore(); }
    // fade in from / out to black
    const f = t < 45 ? 1 - t / 45 : t > this.len - 50 ? (t - (this.len - 50)) / 50 : 0;
    if (f > 0) { c.fillStyle = `rgba(5,1,15,${Math.min(1, f)})`; c.fillRect(0, 0, W, H); }
  }
};

function ease3(x) { x = Math.max(0, Math.min(1, x)); return 1 - Math.pow(1 - x, 3); }
function fade(t, a, b, c2, d) { return t < a ? 0 : t < b ? (t - a) / (b - a) : t < c2 ? 1 : t < d ? 1 - (t - c2) / (d - c2) : (c2 >= 9999 ? 1 : 0); }

const _ride = {};
function rideSheet(hero) {
  if (typeof RIDE_SHEETS === 'undefined' || !RIDE_SHEETS[hero]) return null;
  if (!_ride[hero]) { const o = _ride[hero] = { ready: false, frames: RIDE_SHEETS[hero].frames, img: new Image() }; o.img.onload = () => { o.ready = true; }; o.img.src = RIDE_SHEETS[hero].img; }
  return _ride[hero];
}

// ---- backdrop: hand-drawn in Aseprite (tools/make_ending_bg.py -> assets/ending/ending.aseprite -> js/endingArt.js), parallax layers
const _bg = {};
function endingLayer(name) {
  if (typeof ENDING_ART === 'undefined') return null;
  let o = _bg[name];
  if (!o) { const L = ENDING_ART[name]; o = _bg[name] = { ready: false, x: L.x, y: L.y, img: new Image() }; o.img.onload = () => { o.ready = true; }; o.img.src = L.img; }
  return o.ready ? o : null;
}
function layer(c, name, par, scroll, dy) {   // par = 0: static plane; otherwise a tile that wraps every image width
  const o = endingLayer(name); if (!o) return;
  const w = o.img.width; let ox = 0;
  if (par) ox = (scroll * par) % w;
  c.drawImage(o.img, Math.round(o.x - ox), o.y + (dy || 0));
  if (par && o.x - ox + w < W) c.drawImage(o.img, Math.round(o.x - ox + w), o.y + (dy || 0));
}
function drawBackdrop(c, t, scroll) {
  const m = typeof ENDING_ART !== 'undefined' && ENDING_ART.meta;
  c.fillStyle = '#6a1a80'; c.fillRect(0, 0, W, H);
  layer(c, 'sky', 0, 0);
  layer(c, 'sun', 0, 0, Math.round(Math.min(1, t / 1000) * 56));                 // the sun sinks; the sea plane below hides what is under the horizon
  layer(c, 'clouds', 0.12, scroll + t * 0.4);
  layer(c, 'far', 0.2, scroll);
  layer(c, 'sea', 0, 0);
  if (m) {   // glitter on the water, flickering under the sun
    c.fillStyle = 'rgba(255,240,170,.75)';
    for (let i = 0; i < 9; i++) { const k = (t * 0.07 + i * 1.7) % 8, y = m.horizon + 3 + Math.floor(k * 4), hw = 6 + k * 5; c.fillRect(m.sunX + Math.sin(t * 0.05 + i * 2.1) * hw - 3, y, 5 + k, 1); }
  }
  layer(c, 'mid', 0.5, scroll);
  layer(c, 'front', 1, scroll);
  const g = endingLayer('glow');
  if (g) { c.globalCompositeOperation = 'lighter'; const w = 1280, ox = scroll % w; c.drawImage(g.img, Math.round(g.x - ox), g.y); c.drawImage(g.img, Math.round(g.x - ox + w), g.y); c.globalCompositeOperation = 'source-over'; }
  // lane markings (nearer than the sidewalk, so they run faster)
  c.fillStyle = '#ffe44d'; const gap = 90, off = scroll * 1.6 % gap;
  for (let x = -gap; x < W + gap; x += gap) c.fillRect(x - off, 338, 52, 3);
  c.fillStyle = 'rgba(255,255,255,.35)'; for (let x = -gap; x < W + gap; x += gap) c.fillRect(x - off * 0.8 + 20, 286, 28, 1);
}

// ---- the bike: hand-drawn in Aseprite (tools/make_ending_bike.py -> assets/ending/bike*.aseprite -> js/endingBike.js)
const _bike = {};
function bikeArt() {
  if (typeof ENDING_BIKE === 'undefined') return null;
  if (!_bike.meta) { _bike.meta = ENDING_BIKE.meta; for (const k of ['body_pink', 'body_cyan', 'under', 'wheel']) { const im = new Image(); im.onload = () => { _bike[k + '_ok'] = true; }; im.src = ENDING_BIKE[k]; _bike[k] = im; } }
  return _bike.body_pink_ok && _bike.body_cyan_ok && _bike.under_ok && _bike.wheel_ok ? _bike : null;
}
function artWheel(c, B, cx, cy, rot) {
  const n = B.meta.wheelFrames, f = Math.floor((((rot % (Math.PI * 2 / 5)) + Math.PI * 2 / 5) % (Math.PI * 2 / 5)) / (Math.PI * 2 / 5) * n) % n, ws = B.meta.wheel;
  c.drawImage(B.wheel, f * ws, 0, ws, ws, Math.round(cx - ws / 2 + 0.5), Math.round(cy - ws / 2 + 0.5), ws, ws);
}

// bike faces right; (bx, by) = rear tyre contact point. The rider sprite is pinned to the bike with RIDE_PIN (hips on the seat, fists on the grip, feet on the pegs;
// offsets measured on the pose targets in tools/make_ride_sprites.py: px = 1.26 * target).
function drawBike(c, bx, by, t, scroll, hero, wheelie, boost) {
  const B = bikeArt();
  c.save();
  c.translate(bx, by); c.rotate(-wheelie); c.translate(-bx, -by);   // pivot on the rear wheel
  // ground shadow + tail light trail + headlight beam
  c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(bx + 32, by + 1, 54, 5, 0, 0, 6.3); c.fill();
  c.globalCompositeOperation = 'lighter';
  const tl = c.createLinearGradient(bx - 90, 0, bx - 6, 0); tl.addColorStop(0, 'rgba(255,42,77,0)'); tl.addColorStop(1, 'rgba(255,42,77,.7)');
  c.fillStyle = tl; c.fillRect(bx - 90 - (boost ? 60 : 0), by - 36, 84 + (boost ? 60 : 0), 3);
  const hb = c.createLinearGradient(bx + 66, 0, bx + 230, 0); hb.addColorStop(0, 'rgba(255,240,180,.35)'); hb.addColorStop(1, 'rgba(255,240,180,0)');
  c.fillStyle = hb; c.beginPath(); c.moveTo(bx + 64, by - 44); c.lineTo(bx + 240, by - 66); c.lineTo(bx + 240, by + 8); c.lineTo(bx + 64, by - 36); c.fill();
  c.globalCompositeOperation = 'source-over';
  if (B) {
    const m = B.meta, rot = scroll * 0.18;
    c.imageSmoothingEnabled = false;
    artWheel(c, B, bx, by - 16, rot); artWheel(c, B, bx + 64, by - 16, rot);
    c.drawImage(hero === 'roxy' ? B.body_cyan : B.body_pink, bx - m.ox, by - m.oy);
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.55 + 0.15 * Math.sin(t * 0.2); c.drawImage(B.under, bx - m.ox, by - m.oy); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.imageSmoothingEnabled = true;
  }
  // rider: dedicated seated pose (tools/make_ride_sprites.py -> assets/hero_ride*.aseprite), same pixel-art renderer as the fight sprites
  const rs = rideSheet(hero);
  if (rs && rs.ready) {
    const fr = boost ? 'boost_' + ((t >> 2) & 1) : 'ride_' + ((t >> 3) & 3), f = rs.frames[fr];
    c.imageSmoothingEnabled = false;
    c.drawImage(rs.img, f.x, f.y, f.w, f.h, Math.round(bx + RIDE_PIN.x - RIDE_ANCHOR.x), Math.round(by + RIDE_PIN.y - RIDE_ANCHOR.y), f.w, f.h);
    c.imageSmoothingEnabled = true;
  }
  c.restore();
}
const RIDE_PIN = { x: 21, y: -14 };   // world offset of the sprite anchor from the rear tyre contact

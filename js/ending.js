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

function limb(c, pts, w, col) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = OUT; c.lineWidth = w + 3; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke();
  c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke();
}

function wheel(c, x, y, r, rot) {
  c.fillStyle = '#0c0418'; c.beginPath(); c.arc(x, y, r, 0, 6.3); c.fill();
  c.strokeStyle = '#27f0ff'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, r - 3, 0, 6.3); c.stroke();   // neon rim
  c.strokeStyle = '#8a7ab0'; c.lineWidth = 1;
  for (let i = 0; i < 5; i++) { const a = rot + i * 1.2566; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * (r - 3), y + Math.sin(a) * (r - 3)); c.stroke(); }
}

// bike faces right; (bx, by) = rear tyre contact point. The rider sprite is pinned to the bike with RIDE_PIN: seat = hips, bar = fists, peg = feet
// (offsets from the sprite anchor, measured on the pose targets in tools/make_ride_sprites.py: px = 1.26 * target).
function drawBike(c, bx, by, t, scroll, hero, wheelie, boost) {
  const R = 16, jacket = hero === 'roxy' ? '#27f0ff' : '#ff2fd0';
  const head = [bx + 52, by - 47], fax = [bx + 64, by - R], grip = [bx + 56, by - 53];
  c.save();
  c.translate(bx, by); c.rotate(-wheelie); c.translate(-bx, -by);   // pivot on the rear wheel
  // ground shadow + tail light trail + headlight beam
  c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(bx + 32, by + 1, 54, 5, 0, 0, 6.3); c.fill();
  c.globalCompositeOperation = 'lighter';
  const tl = c.createLinearGradient(bx - 90, 0, bx - 6, 0); tl.addColorStop(0, 'rgba(255,42,77,0)'); tl.addColorStop(1, 'rgba(255,42,77,.7)');
  c.fillStyle = tl; c.fillRect(bx - 90 - (boost ? 60 : 0), by - 33, 84 + (boost ? 60 : 0), 3);
  const hb = c.createLinearGradient(bx + 66, 0, bx + 230, 0); hb.addColorStop(0, 'rgba(255,240,180,.35)'); hb.addColorStop(1, 'rgba(255,240,180,0)');
  c.fillStyle = hb; c.beginPath(); c.moveTo(bx + 64, by - 44); c.lineTo(bx + 240, by - 66); c.lineTo(bx + 240, by + 8); c.lineTo(bx + 64, by - 36); c.fill();
  c.globalCompositeOperation = 'source-over';
  const rot = scroll * 0.18, rw = [bx, by - R], fw = [bx + 64, by - R];
  wheel(c, rw[0], rw[1], R, rot); wheel(c, fw[0], fw[1], R, rot);
  // exhaust, swingarm, frame, engine
  limb(c, [[bx + 24, by - 14], [bx - 12, by - 22]], 5, '#c8c0e0'); limb(c, [[bx - 12, by - 22], [bx - 15, by - 23]], 5, '#ff7a3a');
  limb(c, [rw, [bx + 22, by - 24]], 4, '#2b1850');
  limb(c, [[bx + 24, by - 24], [bx + 40, by - 40], head], 3, '#2b1850');
  c.fillStyle = OUT; c.fillRect(bx + 19, by - 32, 22, 17); c.fillStyle = '#7a6aa8'; c.fillRect(bx + 21, by - 30, 18, 13);
  c.fillStyle = '#c8c0e0'; for (let i = 0; i < 4; i++) c.fillRect(bx + 22 + i * 4, by - 29, 2, 11); c.fillStyle = '#2b1850'; c.fillRect(bx + 21, by - 19, 18, 2);
  // fork + wheel hub
  limb(c, [head, fax], 4, '#d8d0f0');
  // seat, tail
  limb(c, [[bx - 3, by - 34], [bx + 20, by - 37]], 7, '#1a0c3a'); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(bx + 2, by - 38, 14, 1);
  c.fillStyle = OUT; c.fillRect(bx - 9, by - 38, 7, 6); c.fillStyle = '#ff2a4d'; c.fillRect(bx - 8, by - 37, 5, 3);
  // tank (glossy)
  c.fillStyle = OUT; c.beginPath(); c.ellipse(bx + 35, by - 43, 17, 8.5, -0.12, 0, 6.3); c.fill();
  c.fillStyle = jacket; c.beginPath(); c.ellipse(bx + 35, by - 43, 14.5, 6, -0.12, 0, 6.3); c.fill();
  c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(bx + 26, by - 47, 12, 1.5);
  // headlight bucket + handlebar riser (the fists land on the grip)
  c.fillStyle = OUT; c.beginPath(); c.arc(bx + 59, by - 42, 6, 0, 6.3); c.fill(); c.fillStyle = '#fffbe0'; c.beginPath(); c.arc(bx + 60, by - 42, 4, 0, 6.3); c.fill();
  limb(c, [head, [bx + 53, by - 52], grip], 3, '#d8d0f0'); limb(c, [grip, [bx + 51, by - 54]], 4, '#1a0c3a');
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

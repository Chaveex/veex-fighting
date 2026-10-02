'use strict';
// ---------- constants ----------
const W = 640, H = 360;            // internal resolution
const FLOOR_TOP = 258;             // horizon of the walkable plane
const LANE_MIN = 270, LANE_MAX = 344;
const GRAV = 0.42;
// Sprite scale of the characters (the sprites are drawn bigger; hit/hurt boxes, reach and speeds follow).
// PU = player unit, EU = enemy unit. 1 = the original chibi size.
const PU = 1.26, EU = 1.22;
const HERO_H = Math.round(68 * PU), HERO_CROUCH_H = Math.round(31 * EU);   // crouch must stay under the enemies' high attacks and thrown discs (z >= 38 * EU)

// ---------- math ----------
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const sgn = v => v < 0 ? -1 : 1;
const easeOut = t => 1 - (1 - t) * (1 - t);
const easeInOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const dist2 = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

// ---------- input (keyboard + gamepad, with buffering) ----------
const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'punch', 'kick', 'knee', 'dash', 'crouch', 'special', 'pause', 'confirm', 'title'];
const Input = {
  BUF: 12,
  map: {
    left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
    up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
    jump: ['Space', 'KeyU'], punch: ['KeyJ', 'KeyF'], kick: ['KeyK', 'KeyG'], knee: ['KeyL', 'KeyH'],
    dash: ['ShiftLeft', 'ShiftRight', 'KeyE', 'KeyO'], crouch: ['KeyC', 'ControlLeft', 'ControlRight', 'KeyX'],
    special: ['KeyR', 'KeyI'], pause: ['Escape', 'KeyP'], confirm: ['Enter', 'Space', 'KeyJ'], title: ['KeyT']
  },
  padMap: { jump: [0], knee: [1], punch: [2], kick: [3], crouch: [4, 6], dash: [5, 7], special: [10, 11, 8], pause: [9], confirm: [0, 9], title: [8],
            up: [12], down: [13], left: [14], right: [15] },
  codeDown: {}, edge: {}, held: {}, buf: {}, padPrev: {}, usingPad: false, padTap: {}, padBtnPrev: [],
  init() {
    ACTIONS.forEach(a => { this.held[a] = false; this.buf[a] = 0; this.edge[a] = false; this.padPrev[a] = false; });
    const prevent = new Set();
    Object.values(this.map).forEach(l => l.forEach(c => { if (/^(Arrow|Space|Control|Shift|Tab)/.test(c)) prevent.add(c); }));
    addEventListener('keydown', e => {
      if (prevent.has(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.codeDown[e.code] = true; this.usingPad = false;   // UI hints follow the last device used
      for (const a of ACTIONS) if (this.map[a].includes(e.code)) this.edge[a] = true;
    });
    addEventListener('keyup', e => { this.codeDown[e.code] = false; });
    addEventListener('blur', () => { this.codeDown = {}; });
  },
  // call once per real frame
  poll() {
    let pad = null;
    if (navigator.getGamepads) for (const p of navigator.getGamepads()) if (p && p.connected) { pad = p; break; }
    this.pad = pad; this.padTap = {};
    if (pad) pad.buttons.forEach((b, i) => { if (b.pressed && !this.padBtnPrev[i]) { this.padTap['b' + i] = true; this.usingPad = true; } this.padBtnPrev[i] = b.pressed; });
    for (const a of ACTIONS) {
      let h = this.map[a].some(c => this.codeDown[c]);
      let padH = false;
      if (pad) {
        padH = this.padMap[a] && this.padMap[a].some(b => pad.buttons[b] && pad.buttons[b].pressed);
        if (a === 'left' && pad.axes[0] < -0.4) padH = true;
        if (a === 'right' && pad.axes[0] > 0.4) padH = true;
        if (a === 'up' && pad.axes[1] < -0.4) padH = true;
        if (a === 'down' && pad.axes[1] > 0.4) padH = true;
        if (padH && !this.padPrev[a]) { this.edge[a] = true; this.padTap[a] = true; }
        this.padPrev[a] = padH;
        if (padH) this.usingPad = true;
      }
      this.held[a] = h || padH;
      if (this.buf[a] > 0) this.buf[a]--;
      if (this.edge[a]) { this.buf[a] = this.BUF; this.edge[a] = false; }
    }
  },
  eat(a) { if (this.buf[a] > 0) { this.buf[a] = 0; return true; } return false; },
  peek(a) { return this.buf[a] > 0; },
  clear() { for (const a of ACTIONS) this.buf[a] = 0; },
  ax() { return (this.held.right ? 1 : 0) - (this.held.left ? 1 : 0); },
  ay() { return (this.held.down ? 1 : 0) - (this.held.up ? 1 : 0); },
  rumble(strong, weak, ms) {
    const p = this.pad;
    if (!p || !p.vibrationActuator || !p.vibrationActuator.playEffect) return;
    try { p.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }); } catch (e) { /* ignore */ }
  }
};

// ---------- text ----------
const FONT = "'Impact','Haettenschweiler','Arial Black',sans-serif";
function drawText(c, s, x, y, o = {}) {
  const size = o.size || 10;
  c.save();
  c.font = `${o.italic && size >= 12 ? 'italic ' : ''}${o.weight || 'bold'} ${size}px ${o.font || FONT}`;
  c.textAlign = o.align || 'left';
  c.textBaseline = o.base || 'alphabetic';
  if (o.scale && o.scale !== 1) { c.translate(x, y); c.scale(o.scale, o.scale); x = 0; y = 0; }
  if (o.rot) { c.translate(x, y); c.rotate(o.rot); x = 0; y = 0; }
  c.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
  if (o.glow) { c.shadowColor = o.glow; c.shadowBlur = o.glowBlur || 6; }
  if (o.outline) {
    c.lineJoin = 'round'; c.lineWidth = o.outlineW || (size < 14 ? Math.max(1.6, size / 5) : size / 4); c.strokeStyle = o.outline;
    c.strokeText(s, x, y);
  }
  if (o.shadow) { c.shadowColor = 'transparent'; c.fillStyle = o.shadow; c.fillText(s, x + 1, y + 1); }
  if (o.glow) { c.shadowColor = o.glow; c.shadowBlur = o.glowBlur || 6; }
  c.fillStyle = o.color || '#fff';
  c.fillText(s, x, y);
  c.restore();
}

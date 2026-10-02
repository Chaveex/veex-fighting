'use strict';
// Procedural 2-bone-IK puppet used by the hero and every enemy.
// Local space: origin at feet, +x forward, +y up. Poses are plain number bags so they can be lerped.
const RIG = { thigh: 14, shin: 14, upper: 10, fore: 10, torso: 17, neck: 12, headW: 27, headH: 31 };
const PK = ['hx', 'hy', 'lean', 'tilt', 'hFx', 'hFy', 'hBx', 'hBy', 'fFx', 'fFy', 'fBx', 'fBy'];
const P = (...v) => { const o = {}; PK.forEach((k, i) => o[k] = v[i]); return o; };
function lerpPose(a, b, t, out) {
  out = out || {};
  for (let i = 0; i < PK.length; i++) { const k = PK[i]; out[k] = a[k] + (b[k] - a[k]) * t; }
  return out;
}

//            hip    lean tilt  handF    handB     footF    footB
const POSES = {
  stance:   P(0, 25, .10, 0,   15, 50,   8, 46,   9, 1,   -9, 1),
  crouch:   P(1, 14, .30, .05, 14, 40,   8, 36,   11, 1,  -9, 1),
  jumpUp:   P(0, 24, .05, 0,   12, 52,   6, 48,   8, 12,  -6, 7),
  jumpFall: P(0, 27, .00, 0,   14, 54,   6, 50,   7, 3,   -5, 2),
  dash:     P(-4, 21, .62, .15, 16, 41,  -10, 35,  14, 2,  -16, 11),
  airdash:  P(-2, 23, .75, .2,  20, 43,  -12, 41,  -10, 15, -19, 21),
  hurt:     P(-3, 24, -.25, -.25, 6, 35, -4, 37,   6, 1,   -12, 1),
  hurt2:    P(-6, 23, -.45, -.4,  0, 31, -8, 33,   8, 1,   -14, 3),
  tumble:   P(0, 25, -.6, -.3,   4, 42,  -8, 36,   12, 12,  6, 18),
  down:     P(0, 15, -1.45, -.05, -6, 19, -12, 14, 22, 2,   18, 1),
  getup:    P(0, 18, .6, .1,    14, 27,   8, 23,   14, 1,   -8, 1),
  block:    P(-1, 24, .08, 0,   14, 52,  10, 50,   9, 1,   -9, 1),
  held:     P(2, 22, .50, .40,  13, 36,  10, 38,   6, 1,  -13, 1),   // caught in the clinch: bent forward, head pulled down, hands on the hero's arms
  // ---- punches
  jab_w:    P(0, 25, .05, 0,     8, 49,   5, 46,   9, 1,   -9, 1),
  jab_s:    P(3, 25, .20, .05,  29, 50,   6, 46,  12, 1,  -10, 1),
  cross_w:  P(-1, 25, -.05, 0,  14, 48,  -2, 46,   9, 1,  -11, 1),
  cross_s:  P(4, 24, .30, .08,  15, 47,  31, 49,  13, 1,  -12, 1),
  hook_w:   P(-2, 25, -.15, 0,   6, 47,  -8, 43,   9, 1,  -11, 1),
  hook_s:   P(5, 24, .38, .12,  22, 50,  27, 47,  14, 1,  -13, 1),
  elbow_w:  P(-2, 25, -.25, 0,   8, 49,  -6, 50,   9, 1,  -11, 1),
  elbow_s:  P(2, 24, .32, .1,   20, 52,  17, 47,  11, 1,  -11, 1),
  upper_w:  P(1, 14, .35, .05,  12, 24,   6, 30,  11, 1,   -9, 1),
  upper_s:  P(3, 26, .18, -.05, 22, 62,   6, 48,   9, 1,   -9, 1),
  // ---- kicks
  teep_w:   P(-2, 25, -.05, 0,  12, 46,   4, 44,  10, 20,  -9, 1),
  teep_s:   P(-4, 26, -.22, -.05, 10, 47,  2, 44,  27, 27, -10, 1),
  round_w:  P(-2, 25, -.15, 0,   9, 48,  -2, 46,   6, 1,  -10, 22),
  round_s:  P(-3, 26, -.55, -.15, 8, 50, -6, 40,   2, 1,   24, 40),
  low_w:    P(-3, 15, -.1, 0,   10, 38,   4, 34,   9, 1,   -9, 1),
  low_s:    P(-6, 14, -.3, -.05, 8, 37,   2, 32,  26, 3,   -8, 1),
  // ---- knees / clinch
  knee_w:   P(1, 25, .15, 0,    12, 48,   8, 46,   9, 1,   -9, 1),
  knee_s:   P(5, 26, .30, .05,  22, 50,  18, 48,  16, 14,  -9, 1),
  rknee_w:  P(1, 14, .35, .05,  14, 40,  10, 36,  10, 1,   -9, 1),
  rknee_s:  P(3, 31, .10, -.1,  16, 54,  10, 50,  14, 30,  -8, 1),
  // ---- aerial
  airp_s:   P(2, 28, .15, 0,    29, 50,   6, 46,   8, 8,   -6, 4),
  airk_s:   P(-2, 30, -.35, -.1, 8, 50,   0, 46,  25, 10,  -6, 14),
  airknee_s: P(2, 31, .42, .1,  22, 52,  18, 50,  17, 19,  -10, 8),
  // ---- dash attacks
  rushp_s:  P(2, 22, .55, .1,   14, 46,  30, 46,  14, 2,   -16, 8),
  rushk_s:  P(-4, 21, -.6, -.1,  6, 44,  -4, 40,  27, 14,  -8, 4),
  rushn_s:  P(4, 23, .5, .15,   24, 50,  20, 48,  18, 15,  -14, 6),
  // ---- special (spinning elbows)
  spin_s:   P(0, 25, .10, 0,    24, 48, -24, 48,  12, 1,  -12, 1),
  // ---- enemy-flavoured
  hay_w:    P(-5, 25, -.4, -.1,  -4, 40, -10, 44,   9, 1,  -11, 1),
  hay_s:    P(6, 24, .5, .12,    28, 44,   6, 40,  15, 1,  -14, 1),
  slam_w:   P(0, 27, -.3, -.1,    6, 62,   0, 60,   9, 1,   -9, 1),
  slam_s:   P(6, 21, .72, .2,    25, 20,  21, 18,  14, 1,  -12, 1),
  throw_w:  P(-2, 25, -.3, 0,   -10, 52,   0, 46,   9, 1,  -10, 1),
  throw_s:  P(3, 25, .25, .05,   27, 52,   4, 46,  12, 1,  -10, 1),
  charge_w: P(-3, 17, .5, .1,    10, 34,   2, 30,  12, 1,  -10, 1),
  charge_s: P(0, 22, .7, .15,    22, 40,  12, 36,  15, 3,  -15, 9),
  flykick_s: P(-2, 30, -.5, -.1,  8, 50,   0, 44,  26, 21,  -8, 20),
  point_s:  P(2, 26, .05, 0,     28, 56,   6, 46,   9, 1,   -9, 1),
  arms_up:  P(0, 25, -.1, -.1,   14, 66,  -2, 66,   9, 1,   -9, 1)
};

// ----- procedural cycles -----
function walkPose(ph, base, amp = 1) {
  const p = Object.assign({}, base || POSES.stance);
  const s = Math.sin(ph), c = Math.cos(ph);
  p.fFx += s * 11 * amp; p.fFy += Math.max(0, c) * 6 * amp;
  p.fBx -= s * 11 * amp; p.fBy += Math.max(0, -c) * 6 * amp;
  p.hy -= Math.abs(c) * 1.6 * amp; p.hx += s * 0.6;
  p.hFy += Math.sin(ph * 2) * 1.2; p.hBy -= Math.sin(ph * 2) * 1.2;
  return p;
}
function idlePose(t, base) {
  const p = Object.assign({}, base || POSES.stance);
  const b = Math.sin(t * 0.09);
  p.hy += b * 0.9; p.hFy += b * 1.4; p.hBy += b * 1.1; p.hFx += Math.sin(t * 0.05) * 1.2; p.lean += b * 0.012;
  return p;
}

// ----- two bone IK -----
function ik(rx, ry, tx, ty, l1, l2, bend) {
  let dx = tx - rx, dy = ty - ry, d = Math.hypot(dx, dy);
  const maxd = l1 + l2 - 0.05;
  if (d > maxd) { dx *= maxd / d; dy *= maxd / d; d = maxd; }
  if (d < 0.6) { d = 0.6; if (dx === 0 && dy === 0) dy = -0.6; }
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const ux = dx / d, uy = dy / d;
  return { x: rx + ux * a - uy * h * bend, y: ry + uy * a + ux * h * bend, tx: rx + dx, ty: ry + dy };
}

function computeJoints(pp) {
  const R = RIG, j = {};
  j.hip = [pp.hx, pp.hy];
  const su = [Math.sin(pp.lean), Math.cos(pp.lean)], pv = [Math.cos(pp.lean), -Math.sin(pp.lean)];
  j.su = su; j.pv = pv;
  j.chest = [pp.hx + su[0] * R.torso, pp.hy + su[1] * R.torso];
  const ha = pp.lean + pp.tilt;
  j.headAng = ha;
  j.head = [j.chest[0] + Math.sin(ha) * R.neck, j.chest[1] + Math.cos(ha) * R.neck];
  const shF = [j.chest[0] + pv[0] * 3 - su[0] * 1.5, j.chest[1] + pv[1] * 3 - su[1] * 1.5];
  const shB = [j.chest[0] - pv[0] * 3 - su[0] * 1.5, j.chest[1] - pv[1] * 3 - su[1] * 1.5];
  j.shF = shF; j.shB = shB;
  j.aF = ik(shF[0], shF[1], pp.hFx, pp.hFy, R.upper, R.fore, -1);
  j.aB = ik(shB[0], shB[1], pp.hBx, pp.hBy, R.upper, R.fore, -1);
  const hpF = [pp.hx + pv[0] * 1.5, pp.hy + pv[1] * 1.5], hpB = [pp.hx - pv[0] * 1.5, pp.hy - pv[1] * 1.5];
  j.hpF = hpF; j.hpB = hpB;
  j.lF = ik(hpF[0], hpF[1], pp.fFx, pp.fFy, R.thigh, R.shin, 1);
  j.lB = ik(hpB[0], hpB[1], pp.fBx, pp.fBy, R.thigh, R.shin, 1);
  return j;
}

// ----- drawing helpers -----
function limb(c, a, m, b, w1, w2, c1, c2, outline, flat) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  if (!flat) {
    c.strokeStyle = outline; c.lineWidth = Math.max(w1, w2) + 2;
    c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(m[0], m[1]); c.lineTo(b[0], b[1]); c.stroke();
  }
  c.strokeStyle = flat || c1; c.lineWidth = w1;
  c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(m[0], m[1]); c.stroke();
  c.strokeStyle = flat || c2; c.lineWidth = w2;
  c.beginPath(); c.moveTo(m[0], m[1]); c.lineTo(b[0], b[1]); c.stroke();
}
function seg(c, ax, ay, bx, by, w, col) {
  c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round';
  c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
}

const OUT = '#1a0b2e';

function drawArm(c, sh, arm, st, flat) {
  const hand = [arm.tx, arm.ty];
  limb(c, sh, [arm.x, arm.y], hand, 5.6, 4.6, st.jacket, st.skin, OUT, flat);
  if (!flat) {
    // hand wraps / gloves on the last third of the forearm
    const wx = lerp(arm.x, hand[0], 0.45), wy = lerp(arm.y, hand[1], 0.45);
    seg(c, wx, wy, hand[0], hand[1], 4.8, st.wrap);
    c.fillStyle = OUT; c.beginPath(); c.arc(hand[0], hand[1], 4.3, 0, 6.3); c.fill();
    c.fillStyle = st.wrap; c.beginPath(); c.arc(hand[0], hand[1], 3.3, 0, 6.3); c.fill();
    c.fillStyle = st.wrap2 || '#fff'; c.fillRect(hand[0] - 1, hand[1] - 3, 1.4, 6);
  } else { c.fillStyle = flat; c.beginPath(); c.arc(hand[0], hand[1], 3.6, 0, 6.3); c.fill(); }
}
function drawLeg(c, hp, leg, st, flat) {
  const ank = [leg.tx, leg.ty], knee = [leg.x, leg.y];
  limb(c, hp, knee, ank, 7.6, 5.4, st.pants, st.legs || st.skin, OUT, flat);
  // shoe
  let dx = ank[0] - knee[0], dy = ank[1] - knee[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
  const fx = -dy, fy = dx;
  if (!flat) {
    seg(c, ank[0] - fx * 2, ank[1] - fy * 2 + 0.5, ank[0] + fx * 6, ank[1] + fy * 6 + 0.5, 7.2, OUT);
    seg(c, ank[0] - fx * 1.5, ank[1] - fy * 1.5 + 0.5, ank[0] + fx * 5.5, ank[1] + fy * 5.5 + 0.5, 5.2, st.shoe);
    seg(c, ank[0] + fx * 1, ank[1] + fy * 1 - 0.6, ank[0] + fx * 3, ank[1] + fy * 3 - 0.6, 1.4, st.shoe2 || st.wrap);
  } else seg(c, ank[0] - fx * 1.5, ank[1] - fy * 1.5 + 0.5, ank[0] + fx * 5.5, ank[1] + fy * 5.5 + 0.5, 6, flat);
}

function drawTorso(c, j, st, flat) {
  const hip = j.hip, ch = j.chest, pv = j.pv, su = j.su;
  const pt = (b, s, k) => [b[0] + pv[0] * s + su[0] * k, b[1] + pv[1] * s + su[1] * k];
  // shorts block
  c.lineCap = 'round';
  seg(c, hip[0] - su[0] * 3, hip[1] - su[1] * 3, hip[0] + su[0] * 1.5, hip[1] + su[1] * 1.5, 13.5, flat ? flat : OUT);
  if (!flat) {
    seg(c, hip[0] - su[0] * 3, hip[1] - su[1] * 3, hip[0] + su[0] * 1.5, hip[1] + su[1] * 1.5, 11.6, st.pants);
    seg(c, hip[0] + su[0] * 1.5 + pv[0] * 0.5, hip[1] + su[1] * 1.5, hip[0] + su[0] * 1.5 - pv[0] * 0.5, hip[1] + su[1] * 1.5, 12, st.pants2);
    const a = pt(hip, 5.4, -3), b = pt(hip, 5.4, 1);
    seg(c, a[0], a[1], b[0], b[1], 1.6, st.pants2);
  }
  // jacket / torso
  const poly = [pt(hip, -5.6, 1), pt(hip, 5.6, 1), pt(ch, 6.8, -1), pt(ch, -6.8, -1)];
  c.beginPath(); poly.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath();
  if (!flat) {
    c.lineJoin = 'round'; c.strokeStyle = OUT; c.lineWidth = 2.4; c.stroke();
    c.fillStyle = st.jacket; c.fill();
    // tee in the opening of the jacket
    const A = pt(hip, 0.8, 1.5), B = pt(hip, 4.6, 1.5), C = pt(ch, 5.6, -1.5), D = pt(ch, 1.2, -1.5);
    c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.lineTo(C[0], C[1]); c.lineTo(D[0], D[1]); c.closePath();
    c.fillStyle = st.tee1; c.fill();
    for (let k = 0.2; k < 1; k += 0.27) {
      const p1 = [lerp(A[0], D[0], k), lerp(A[1], D[1], k)], p2 = [lerp(B[0], C[0], k), lerp(B[1], C[1], k)];
      seg(c, p1[0], p1[1], p2[0], p2[1], 1.7, st.tee2);
    }
    // collar + lapel shading
    const c1 = pt(ch, -6, -1.5), c2 = pt(ch, 6.4, -1.5);
    seg(c, c1[0], c1[1], c2[0], c2[1], 2.6, st.jacketDark || st.jacket);
    const s1 = pt(hip, -5.4, 2), s2 = pt(ch, -6.2, -2);
    seg(c, s1[0], s1[1], s2[0], s2[1], 1.4, st.jacketDark || st.jacket);
  } else { c.fillStyle = flat; c.fill(); }
}

// ----- heads -----
function faceFeatures(c, st, t) {
  // simple angry cartoon face pointing +x
  c.fillStyle = '#fff'; c.fillRect(3, 1.5, 4.4, 3.4); c.fillRect(-3.4, 1.5, 3.6, 3.2);
  c.fillStyle = st.eyes || '#111'; c.fillRect(5, 1.8, 2.4, 3); c.fillRect(-1.2, 1.8, 2, 3);
  seg(c, 2.5, 7.4, 8.6, 5.4, 1.8, st.brow || '#221');
  seg(c, -4.4, 6.6, 0.6, 6.4, 1.6, st.brow || '#221');
  seg(c, 3.6, -6, 9, -5.4, 1.6, '#4a1a1a');
}
function headBase(c, st, hw, hh) {
  c.fillStyle = st.skin; c.beginPath(); c.ellipse(0, 0, hw / 2, hh / 2, 0, 0, 6.3); c.fill();
}
const HEADS = {
  mohawk(c, st) {
    headBase(c, st, 24, 28); c.fillStyle = st.hair;
    for (let i = 0; i < 5; i++) { const x = -8 + i * 4; c.beginPath(); c.moveTo(x - 2.4, 11); c.lineTo(x + 0.4, 20 + (i % 2) * 4 + (i === 2 ? 3 : 0)); c.lineTo(x + 2.6, 11); c.fill(); }
    c.fillRect(-9, 9, 18, 4); faceFeatures(c, st);
  },
  cap(c, st) {
    headBase(c, st, 24, 28); faceFeatures(c, st);
    c.fillStyle = st.hat; c.beginPath(); c.ellipse(0, 7, 12.5, 9, 0, Math.PI, 0); c.fill();
    c.fillRect(2, 6.5, 16, 3); c.fillStyle = st.hair; c.fillRect(-13, -1, 4, 10);
  },
  headphones(c, st) {
    headBase(c, st, 24, 28); c.fillStyle = st.hair; c.beginPath(); c.ellipse(0, 7, 12.5, 9, 0, Math.PI, 0); c.fill();
    faceFeatures(c, st);
    c.strokeStyle = st.hat; c.lineWidth = 2.4; c.beginPath(); c.arc(0, 0, 13, 0.2, Math.PI - 0.2); c.stroke();
    c.fillStyle = st.hat; c.fillRect(-4, -3, 8, 8); c.fillStyle = st.accent; c.fillRect(-2, -1, 4, 4);
  },
  helmet(c, st) {
    headBase(c, st, 24, 28);
    c.fillStyle = st.hat; c.beginPath(); c.ellipse(0, 1, 14, 16, 0, 0, 6.3); c.fill();
    c.fillStyle = st.accent; c.fillRect(-1, 0, 16, 7);
    c.fillStyle = '#fff8'; c.fillRect(6, 4, 7, 1.6);
    c.fillStyle = st.hat; c.fillRect(-13, -12, 10, 6);
  },
  beanie(c, st) {
    headBase(c, st, 24, 28); faceFeatures(c, st);
    c.fillStyle = st.hat; c.beginPath(); c.ellipse(0, 6, 13, 10, 0, Math.PI, 0); c.fill(); c.fillRect(-13, 5, 26, 4);
    c.fillStyle = st.accent; c.fillRect(-13, 5, 26, 1.6);
  },
  bandana(c, st) {
    headBase(c, st, 24, 28); c.fillStyle = st.hair; c.beginPath(); c.ellipse(0, 6, 13, 9, 0, Math.PI, 0); c.fill();
    faceFeatures(c, st);
    c.fillStyle = st.hat; c.fillRect(-12.5, 5, 25, 4.5); c.fillRect(-18, 3, 6, 3); c.fillRect(-19, 0, 5, 3);
  },
  shades(c, st) {
    headBase(c, st, 24, 28); c.fillStyle = st.hair; c.beginPath(); c.ellipse(0, 8, 13, 8, 0, Math.PI, 0); c.fill(); c.fillRect(-13, -1, 5, 12);
    seg(c, 3.6, -6, 9, -5.4, 1.6, '#4a1a1a');
    c.fillStyle = '#0a0a12'; c.fillRect(-4.4, 0.6, 14.4, 5.4); c.fillStyle = st.accent; c.fillRect(-3, 4, 5, 1); c.fillRect(4, 4, 4, 1);
  },
  visor(c, st) {
    headBase(c, st, 24, 28); c.fillStyle = st.hair; c.beginPath(); c.ellipse(0, 7, 13, 9, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#0a0a12'; c.fillRect(-6, 0, 20, 5); c.fillStyle = st.accent; c.fillRect(-4, 2, 16, 1.6);
    seg(c, 3.6, -6, 9, -5.4, 1.6, '#4a1a1a');
  },
  robot(c, st, t) {
    c.fillStyle = st.skin; c.fillRect(-12, -13, 24, 27);
    c.fillStyle = st.hat; c.fillRect(-12, 9, 24, 5); c.fillRect(-13, -4, 3, 8);
    c.fillStyle = '#0a0a12'; c.fillRect(-4, 0, 17, 6);
    c.fillStyle = st.accent; c.fillRect(-2, 2, 14, 2.2);
    c.fillStyle = st.accent; c.fillRect(-1, 15, 1.6, 5 + (t % 20 > 10 ? 2 : 0));
    seg(c, 2, -8, 10, -8, 2, '#111');
  },
  crt(c, st, t) {
    c.fillStyle = st.skin; c.fillRect(-14, -14, 28, 30);
    c.fillStyle = '#05060c'; c.fillRect(-11, -11, 22, 24);
    const flick = (t % 30 < 3);
    c.fillStyle = flick ? '#fff' : st.accent; c.globalAlpha = flick ? 0.8 : 1;
    c.fillRect(-7, 1, 5, 6); c.fillRect(3, 1, 5, 6);            // eyes
    c.fillRect(-7, -8, 15, 2); c.fillRect(-7, -6, 2, 2); c.fillRect(6, -6, 2, 2);   // grin
    c.globalAlpha = 0.25; c.fillStyle = '#fff';
    for (let y = -11; y < 13; y += 3) c.fillRect(-11, y + (t % 6) * 0.3, 22, 1);
    c.globalAlpha = 1;
    c.fillStyle = st.hat; c.fillRect(-2, 16, 2, 8); c.fillRect(4, 16, 2, 6);   // antennae
  },
  blonde(c, st) {
    headBase(c, st, 24, 28); c.fillStyle = st.hair;
    c.beginPath(); c.ellipse(-2, 4, 14.5, 14, 0, 0, 6.3); c.fill();
    c.fillStyle = st.skin; c.beginPath(); c.ellipse(3, -2, 10, 12.5, 0, 0, 6.3); c.fill();
    c.fillStyle = st.hair; c.beginPath(); c.ellipse(2, 10, 11, 5, 0, Math.PI, 0); c.fill();
    faceFeatures(c, st);
    c.fillStyle = st.hat; c.fillRect(-11, 8, 24, 3.2);   // headband
  },
  slick(c, st) {
    headBase(c, st, 24, 28); c.fillStyle = st.hair; c.beginPath(); c.ellipse(-1, 8, 13.5, 8.5, 0, Math.PI, 0); c.fill(); c.fillRect(-13, -4, 5, 14);
    faceFeatures(c, st);
    c.fillStyle = '#0a0a12'; c.fillRect(-2, 0.5, 13, 5.2); c.fillStyle = '#5ce1ff'; c.fillRect(-1, 4, 4, 1);
  }
};

function drawHead(c, j, st, o) {
  c.save();
  c.translate(j.head[0], j.head[1]);
  c.rotate(-j.headAng);
  const hw = RIG.headW, hh = RIG.headH;
  if (o.flat) {
    c.fillStyle = o.flat; c.beginPath(); c.ellipse(0, 0, hw / 2, hh / 2, 0, 0, 6.3); c.fill();
  } else if (st.head === 'veex') {
    c.save();
    c.beginPath(); c.ellipse(0, 0, hw / 2, hh / 2, 0, 0, 6.3); c.clip();
    c.scale(1, -1);
    if (Rig.headImg) c.drawImage(Rig.headImg, -hw / 2 - 1, -hh / 2 - 1, hw + 2, hh + 2);
    else { c.fillStyle = st.skin; c.fillRect(-hw / 2, -hh / 2, hw, hh); }
    c.restore();
    c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 0, hw / 2, hh / 2, 0, 0, 6.3); c.stroke();
    if (o.hurt) { c.fillStyle = 'rgba(255,40,40,.35)'; c.beginPath(); c.ellipse(0, 0, hw / 2, hh / 2, 0, 0, 6.3); c.fill(); }
  } else {
    (HEADS[st.head] || HEADS.mohawk)(c, st, o.t || 0);
    // outline via stroke of base silhouette
    c.strokeStyle = OUT; c.lineWidth = 1.6; c.beginPath(); c.ellipse(0, 0, hw / 2, hh / 2, 0, 0, 6.3); c.stroke();
  }
  c.restore();
}

const Rig = {
  headImg: null,
  load(cb) {
    if (typeof ASSETS === 'undefined') { cb && cb(); return; }
    const img = new Image();
    img.onload = () => { Rig.headImg = img; cb && cb(); };
    img.onerror = () => { cb && cb(); };
    img.src = ASSETS.head;
  },
  // draws a full character. joints from computeJoints. o: {flat, hurt, sx (spin scaleX), sqx, sqy, rot, t}
  draw(c, j, st, x, y, facing, o) {
    o = o || {};
    c.save();
    c.translate(Math.round(x), Math.round(y));
    const sc = st.scale || 1;
    c.scale(facing * (o.sx === undefined ? 1 : o.sx) * sc * (o.sqx || 1), -sc * (o.sqy || 1));
    if (o.rot) { const pv = j.hip[1]; c.translate(0, pv); c.rotate(-o.rot); c.translate(0, -pv); }
    const flat = o.flat || null;
    drawArm(c, j.shB, j.aB, st, flat);
    drawLeg(c, j.hpB, j.lB, st, flat);
    drawTorso(c, j, st, flat);
    drawHead(c, j, st, o);
    drawLeg(c, j.hpF, j.lF, st, flat);
    drawArm(c, j.shF, j.aF, st, flat);
    if (st.prop && !flat) st.prop(c, j, o);
    c.restore();
  }
};

// Style for the hero.
const HERO_STYLE = {
  head: 'veex', skin: '#e2a887', jacket: '#3d6fb4', jacketDark: '#2b4f8a', tee1: '#f3f0f0', tee2: '#d6303c',
  pants: '#d9273f', pants2: '#2338b8', shoe: '#f4f4f8', shoe2: '#d6303c', wrap: '#e8323c', wrap2: '#fff', legs: '#e2a887', scale: PU
};

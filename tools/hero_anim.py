"""VEEX hero animation v7 - rewritten from a blank sheet.
Authoring convention (different from the old hero6_poses.py): every hand / foot target and every elbow / knee pole is given in SCREEN
space (x = forward toward the enemy, y = up from the floor, z = toward the camera), in px at scale 1. `solve()` converts them into the
pelvis frame the model (tools/hero6.py) expects, so a kick aimed at x=34 lands at x=34 whatever the hip rotation is.
Keys listed in pose['loc'] are given in the pelvis frame instead (spins: the limbs turn with the body).

Pose keys: hx, hy hip position | pitch torso lean (rad, + forward) | twist chest turn vs pelvis (deg, - brings the lead shoulder forward)
| yb pelvis yaw (deg; 0 = profile, + opens the chest to the camera, - shows the back) | yh head yaw (world) | hp head pitch (deg, - = chin up)
| hr head roll | nh / fh lead (camera side) / rear hand | ne / fe elbow poles | nf / ff lead / rear foot | nk / fk knee poles.

An animation is a list of frames F(name, pose, weight, phase). js/sprites.js spreads the frames of a phase over the game timing:
  loops (phase 'l'): weight = ticks per frame
  one-shots: 'w' fills a move's startup (st), 's' its active frames (ac), 'r' its recovery (rc); weight = share of that phase
  (hurt / getup / dash / special use their own timers, see HeroSprites.frameFor).
Secondary motion: the mullet trails the head motion between consecutive frames (see expand)."""
import math
import numpy as np

VEC = ('nh', 'fh', 'ne', 'fe', 'nf', 'ff', 'nk', 'fk')

# ------------------------------------------------------------------ helpers
def ry(v, a):
    c, s = math.cos(a), math.sin(a); return (v[0] * c - v[2] * s, v[1], v[0] * s + v[2] * c)

def P(base=None, **kw):
    d = dict(base if base is not None else GUARD); d.update(kw); return d

def ease(t, kind):
    return {'lin': t, 'in': t * t, 'out': 1 - (1 - t) ** 2, 'out3': 1 - (1 - t) ** 3, 'io': t * t * (3 - 2 * t)}[kind]

def mix(a, b, t, kind='io', **kw):
    """blend two poses (both must use the same frame for each key) then override keys"""
    if tuple(a.get('loc', ())) != tuple(b.get('loc', ())): a, b = to_world(a), to_world(b)
    t = ease(t, kind); out = {}
    for k in a:
        if k == 'loc': out[k] = a[k]; continue
        va, vb = a[k], b.get(k, a[k])
        out[k] = tuple(float(x) * (1 - t) + float(y) * t for x, y in zip(va, vb)) if isinstance(va, tuple) else va + (vb - va) * t
    out.update(kw); return out

def to_world(p):
    """express the pelvis-frame keys of a pose in screen space"""
    out = dict(p); a = math.radians(p['yb'])
    for k in p.get('loc', ()): out[k] = ry(p[k], a)
    out['loc'] = (); return out

def solve(p):
    """screen-space targets -> pelvis-frame pose for hero6.Hero6.build"""
    out = {k: v for k, v in p.items() if k != 'loc'}; a = math.radians(p['yb']); loc = p.get('loc', ())
    for k in VEC:
        if k not in loc: out[k] = ry(p[k], -a)
    return out

def head_pos(p):
    pit = p['pitch']; hp = math.radians(p['hp']) * 0.5
    return np.array([p['hx'] + math.sin(pit) * 18 + math.sin(pit + hp) * 14.5, p['hy'] + math.cos(pit) * 18 + math.cos(pit + hp) * 14.5])

def F(name, pose, w=1.0, ph='l'): return (name, pose, w, ph)

# ------------------------------------------------------------------ key poses
# Muay Thai guard: tall, weight on the rear leg, lead heel light, both fists at the brow, elbows in, chin tucked.
GUARD = dict(hx=0.0, hy=26.0, pitch=0.05, twist=4.0, yb=30.0, yh=56.0, hp=4.0, hr=0.0,
             nh=(15.0, 53.0, 7.0), fh=(10.0, 55.0, -3.0), ne=(0.5, -1.0, 0.6), fe=(0.4, -1.0, 0.2),
             nf=(10.0, 1.5, 4.0), ff=(-9.0, 1.5, -3.5), nk=(1.0, 0.2, 0.4), fk=(1.0, 0.2, -0.1))
G = GUARD
CROUCH = P(hy=16.5, hx=-1.0, pitch=0.38, twist=2, hp=-2, nh=(15, 41, 7), fh=(11, 43, -3), nf=(12, 1.5, 4.5), ff=(-11, 1.5, -3.5),
           nk=(1, 0.35, 0.5), fk=(1, 0.35, -0.2))
AIR = P(hy=29, pitch=0.08, nh=(15, 55, 7), fh=(9, 56, -3), nf=(10, 13, 4), ff=(-2, 9, -3.5), nk=(1, 0.9, 0.3), fk=(1, 0.8, -0.1))

# ------------------------------------------------------------------ loops
def idle(i, n=8):
    """rhythmic Thai bounce: the body dips on the beat, the lead foot taps, the fists lag half a beat behind (follow-through)"""
    ph = i * 2 * math.pi / n; s, c = math.sin(ph), math.cos(ph); lag = math.sin(ph - 0.9)
    return P(hy=26.0 - 0.9 * (1 - c) * 0.5 * 2 + 0.45, hx=0.5 * math.sin(ph * 0.5 + 0.3), pitch=0.05 + 0.02 * (1 - c) * 0.5, twist=4 + 2.0 * s,
             nh=(15 + 0.8 * lag, 53 - 1.3 * (1 - math.cos(ph - 0.9)) * 0.5, 7), fh=(10, 55 - 1.0 * (1 - math.cos(ph - 1.2)) * 0.5, -3),
             nf=(10 + 0.6 * s, 1.5 + 1.6 * max(0.0, s), 4), hr=1.2 * s, hp=4 + 1.5 * (1 - c) * 0.5)

def walk(i, n=8):
    """guarded forward stalk: contact (0) - down - passing (2) - up, mirrored; hips bob, chest counter-turns, fists stay home"""
    ph = i * 2 * math.pi / n; s, c = math.sin(ph), math.cos(ph)
    return P(hy=25.4 - 1.1 * math.cos(2 * ph) + 0.2 * max(0.0, math.sin(2 * ph)), hx=0.8, pitch=0.09 + 0.02 * math.cos(2 * ph),
             twist=4 - 7 * c, yb=30 + 4 * c,
             nf=(1 + 12 * c, 1.5 + 6.5 * max(0.0, -s) ** 1.3, 4.0), ff=(-1 - 12 * c, 1.5 + 6.5 * max(0.0, s) ** 1.3, -3.5),
             nk=(1, 0.3, 0.4), fk=(1, 0.3, -0.1),
             nh=(15 + 1.5 * c, 53 + 0.8 * math.cos(2 * ph - 0.6), 7), fh=(10 - 1.5 * c, 55 + 0.8 * math.cos(2 * ph - 0.6), -3), hr=-1.0 * c)

# ------------------------------------------------------------------ the table
def build_anims():
    A = {}
    A['idle'] = [F(str(i), idle(i), 7) for i in range(8)]
    A['walk'] = [F(str(i), walk(i), 3) for i in range(8)]
    A['crouch'] = [F('in', mix(G, CROUCH, 0.6, hy=18), 1, 'w'), F('0', CROUCH, 16), F('1', P(CROUCH, hy=14.4, nh=(15, 40.3, 7), fh=(11, 42.4, -3), pitch=0.40), 16)]

    # --- jump: launch stretch -> tuck -> apex -> open -> brace ; landing squash
    A['jump'] = [
        F('up0', P(hy=31, pitch=-0.02, hp=-4, nh=(17, 61, 8), fh=(12, 61, -3), nf=(7, 5, 4), ff=(-7, 0.5, -3.5), nk=(1, 0.4, 0.3), fk=(1, 0.1, -0.1))),
        F('up1', P(AIR, hy=30, nf=(10, 10, 4), ff=(-4, 5, -3.5), nh=(16, 58, 7), fh=(11, 58, -3))),
        F('top', P(AIR, hy=28, nf=(11, 15, 4), ff=(0, 11, -3.5), nk=(1, 1, 0.3), fk=(1, 0.9, -0.1))),
        F('fall0', P(AIR, hy=30, pitch=0.02, nf=(10, 7, 4), ff=(-5, 4, -3.5), nk=(1, 0.5, 0.3), nh=(18, 57, 9), fh=(6, 60, -5))),
        F('fall1', P(hy=31, pitch=0.0, hp=2, nf=(11, 2, 4), ff=(-8, 2.5, -3.5), nk=(1, 0.2, 0.3), nh=(19, 58, 10), fh=(4, 61, -6))),
    ]
    LAND = P(hy=17, hx=1, pitch=0.34, hp=0, nf=(12, 1.5, 4.5), ff=(-10, 1.5, -3.5), nh=(18, 42, 8), fh=(13, 43, -4), nk=(1, 0.3, 0.5))
    A['land'] = [F('0', LAND, 1, 'w'), F('1', mix(LAND, G, 0.55), 1, 'w')]

    # --- dash: burst (rear leg drives) -> glide (arms swept back, afterimages) -> brake
    A['dash'] = [
        F('0', P(hy=22, hx=3, pitch=0.62, yh=48, hp=-6, nf=(14, 5, 4), nk=(1, 0.5, 0.4), ff=(-18, 2, -3.5), fk=(0.2, 1, 0),
                 nh=(24, 45, 8), fh=(-6, 43, -4)), 0.3, 'w'),
        F('1', P(hy=23, hx=3, pitch=0.70, yh=46, hp=-8, nf=(14, 8, 4), nk=(1, 0.7, 0.4), ff=(-16, 11, -3.5), fk=(-0.2, 1, 0),
                 nh=(10, 40, 9), ne=(0, 0.3, 1), fh=(-12, 40, -5)), 0.5, 'w'),
        F('2', P(hy=21, hx=-2, pitch=0.18, yh=52, nf=(15, 1.5, 4.5), nk=(1, 0.2, 0.4), ff=(-10, 1.5, -3.5), nh=(17, 49, 8), fh=(12, 51, -3)), 0.2, 'w'),
    ]
    A['airdash'] = [
        F('0', P(hy=26, hx=2, pitch=0.85, yh=46, hp=-12, nf=(-6, 14, 4), nk=(0.2, 1, 0.3), ff=(-14, 19, -3.5), fk=(-0.3, 1, 0),
                 nh=(28, 48, 8), ne=(0, -1, 0.5), fh=(-8, 42, -5)), 0.4, 'w'),
        F('1', P(hy=26, hx=2, pitch=0.95, yh=46, hp=-14, nf=(-10, 18, 4), nk=(0, 1, 0.3), ff=(-17, 22, -3.5), fk=(-0.3, 1, 0),
                 nh=(14, 42, 10), ne=(0, 0.3, 1), fh=(-14, 40, -6)), 0.6, 'w'),
    ]

    # --- getting hit
    H0 = P(hx=-2, hy=25.5, pitch=-0.22, twist=-4, yb=22, yh=44, hp=-22, hr=6, nh=(11, 49, 9), fh=(2, 51, -5), ne=(0.3, -1, 0.8),
           nf=(10, 1.5, 4), ff=(-10, 1.5, -3.5))
    H1 = P(H0, hx=-4, hy=24, pitch=-0.40, hp=-28, hr=9, nh=(3, 40, 11), fh=(-6, 42, -6), nf=(9, 3, 4), ff=(-13, 1.5, -3.5))
    A['hurt'] = [F('0', H0, 0.2, 'w'), F('1', H1, 0.35, 'w'), F('2', mix(H1, G, 0.6), 0.45, 'w')]
    A['tumble'] = [
        F('0', P(hy=27, pitch=-0.45, yb=18, yh=40, hp=-20, hr=6, nh=(-2, 60, 10), fh=(-8, 56, -6), ne=(0, -1, 0.5),
                 nf=(15, 12, 4), ff=(10, 16, -3.5), nk=(1, 0.6, 0.3), fk=(1, 0.8, -0.1))),
        F('1', P(hy=24, pitch=-0.20, yb=18, yh=40, hp=-8, nh=(14, 40, 8), fh=(10, 42, -4), nf=(12, 16, 4), ff=(6, 12, -3.5),
                 nk=(1, 1, 0.3), fk=(1, 1, -0.1))),
    ]
    DOWN = P(hx=12, hy=7, pitch=-1.52, twist=0, yb=10, yh=24, hp=-6, hr=0, nh=(-10, 3, 11), fh=(-4, 2, -7), ne=(0, -0.2, 1), fe=(0, -0.2, -1),
             nf=(34, 2, 4), ff=(30, 2, -3.5), nk=(0, 1, 0.3), fk=(0, 1, -0.1))
    A['down'] = [F('0', P(DOWN, pitch=-1.35, hy=8, nf=(28, 15, 4), ff=(24, 11, -3.5), nk=(-0.3, 1, 0.3), nh=(-6, 12, 11), fh=(0, 10, -7)), 1, 'w'),
                 F('1', DOWN, 1, 'w')]
    SIT = P(hx=4, hy=7, pitch=-0.45, yb=16, yh=40, hp=-4, nh=(-10, 2, 9), fh=(-12, 2, -6), ne=(0, 0.2, 1), nf=(22, 1.5, 4), ff=(17, 1.5, -3.5),
            nk=(0, 1, 0.3), fk=(0, 1, -0.1))
    KNEEL = P(hx=0, hy=14, pitch=0.35, yb=24, yh=50, hp=0, nh=(15, 20, 8), fh=(11, 44, -3), nf=(11, 1.5, 4.5), nk=(1, 0.4, 0.4),
              ff=(-14, 1.5, -3.5), fk=(1, -0.8, -0.1))
    A['getup'] = [F('0', SIT, 0.25, 'w'), F('1', KNEEL, 0.3, 'w'), F('2', mix(KNEEL, G, 0.55, hy=21), 0.25, 'w'), F('3', mix(KNEEL, G, 0.88), 0.2, 'w')]

    # --- MUAY THAI FURY: gather -> roar -> 8-angle spin (limbs in the pelvis frame) -> double-fist ground slam -> guard
    A['fury'] = [
        F('0', P(hy=19, pitch=0.35, hp=6, yb=30, nh=(12, 44, -2), fh=(12, 46, 5), ne=(0.5, -1, 0.8), fe=(0.5, -1, -0.2),
                 nf=(12, 1.5, 4.5), ff=(-11, 1.5, -3.5), nk=(1, 0.3, 0.5)), 0.3, 'w'),
        F('1', P(hy=28, pitch=-0.18, hp=-22, yb=55, yh=70, nh=(2, 64, 22), fh=(4, 64, -16), ne=(0, -0.3, 1), fe=(0, -0.3, -1),
                 nf=(13, 1.5, 5), ff=(-12, 1.5, -3.5)), 0.5, 'w'),
        F('2', spin_pose(-45), 0.2, 'w'),
    ]
    A['spin'] = [F(str(i), spin_pose(i * 45), 2) for i in range(8)]
    SLAM = P(hx=2, hy=13, pitch=0.95, twist=0, yb=34, yh=50, hp=-18, nh=(18, 3, 7), fh=(15, 3, -2), ne=(0, 1, 0.6), fe=(0, 1, -0.2),
             nf=(14, 1.5, 5), ff=(-13, 1.5, -4), nk=(1, 0.2, 0.6), fk=(1, 0.2, -0.3))
    A['fury_end'] = [F('0', SLAM, 0.55, 'r'), F('1', mix(SLAM, G, 0.5, hy=20), 0.25, 'r'), F('2', mix(SLAM, G, 0.85), 0.2, 'r')]

    # --- moves (pw names = contract with js/fighter.js)
    for name, frames in moves().items(): A[name] = frames
    return A

def spin_pose(a):
    yb = 30 + a
    return dict(hx=0.0, hy=27.0, pitch=0.04, twist=0.0, yb=yb, yh=yb + 24, hp=-4, hr=0,
                nh=(1, 47, 28), fh=(1, 47, -28), ne=(0.2, -1, 0.3), fe=(0.2, -1, -0.3),
                nf=(5, 1.5, 6), ff=(-4, 6, -5), nk=(1, 0.2, 0.4), fk=(1, 0.6, -0.3), loc=VEC)

def moves():
    M = {}
    def seq(base, *keys):
        """keys: (name, pose, weight, phase); recovery ends near the base so the return to guard is invisible"""
        return [F(n, p, w, ph) for n, p, w, ph in keys]

    # JAB: tiny load -> lead fist snaps out, lead shoulder rolls over the chin, lead foot steps -> fast retract
    js = P(hx=3.5, hy=25.5, pitch=0.13, yb=14, twist=-38, yh=50, hp=4, nh=(35, 53, 5), ne=(0, -1, 0.1), fh=(12, 55, -2),
           nf=(15, 1.5, 4), ff=(-7, 1.5, -3.5))
    M['jab'] = seq(G, ('w0', P(hx=-0.8, twist=8, yb=32, nh=(13, 52, 7.5), nf=(10, 3.5, 4)), 1, 'w'),
                   ('s0', js, 1, 's'),
                   ('r0', mix(js, G, 0.45, nh=(24, 54, 6.5)), 0.4, 'r'), ('r1', mix(js, G, 0.82), 0.6, 'r'))
    # CROSS: load the rear hip -> hip turns first, then shoulder, rear heel pivots up -> fist lands with the chest open to the camera
    cs = P(hx=4.5, hy=25.5, pitch=0.18, yb=42, twist=40, yh=50, hp=4, fh=(37, 52, 0), fe=(0, -1, -0.1), nh=(12, 55, 8),
           ff=(-5, 5, -3), fk=(1, 0.2, 0.4), nf=(13, 1.5, 4))
    M['cross'] = seq(G, ('w0', P(hx=-1.2, twist=-10, yb=26, fh=(7, 55, -3), ff=(-10, 1.5, -3.5)), 0.5, 'w'),
                     ('w1', P(hx=1.5, twist=10, yb=36, fh=(19, 54, -2), ff=(-8, 3, -3.5), nh=(13, 54, 7.5)), 0.5, 'w'),
                     ('s0', cs, 1, 's'),
                     ('r0', mix(cs, G, 0.45, fh=(24, 54, -1)), 0.4, 'r'), ('r1', mix(cs, G, 0.82), 0.6, 'r'))
    # SPINNING BACK ELBOW: step across -> back to the camera (mullet!) -> head spots the target first -> rear elbow whips through
    TUCK = dict(nh=(9, 50, 6), fh=(8, 50, -5), ne=(0.3, -1, 0.3), fe=(0.3, -1, -0.3))
    def sp(yb, yh, **kw):
        d = P(yb=yb, yh=yh, twist=0, pitch=0.08, **TUCK); d.update(kw); d['loc'] = ('nh', 'fh', 'ne', 'fe'); return d
    es = sp(-310, -304, twist=-42, hx=4, pitch=0.14, hy=26, nh=(2, 55, -5), ne=(1, 0.15, 0.1), fh=(8, 53, -6), hp=2,
            nf=(12, 1.5, 4), ff=(-9, 1.5, -3.5))
    es.update(loc=(), twist=-62, pitch=0.24, hx=5, nh=(9, 54, -3), ne=(1, 0.05, 0.25), fh=(9, 50, -7), fe=(0.3, -1, -0.2))   # lead elbow sweeps across the face
    M['elbow'] = seq(G, ('w0', sp(8, -10, hx=-1, nf=(5, 1.5, 1.5), ff=(-9, 2.5, -3.5)), 0.2, 'w'),
                     ('w1', sp(-80, -135, hx=0, nf=(4, 1.5, 1), ff=(-3, 4, -6)), 0.25, 'w'),
                     ('w2', sp(-165, -240, hx=1, nf=(4, 1.5, 1), ff=(4, 4, -3)), 0.25, 'w'),
                     ('w3', sp(-240, -300, hx=2, twist=10, nf=(6, 1.5, 2), ff=(-4, 2.5, -3.5), fh=(4, 52, 0)), 0.3, 'w'),
                     ('s0', es, 1, 's'),
                     ('r0', mix(es, sp(-318, -304, hx=2, nf=(12, 1.5, 4), ff=(-9, 1.5, -3.5)), 0.35, nh=(11, 53, -1)), 0.3, 'r'),
                     ('r1', mix(es, P(G, yb=-330, yh=-304, loc=()), 0.65), 0.35, 'r'),
                     ('r2', P(G, yb=-330, yh=-304), 0.35, 'r'))
    # TEEP: lead knee chambers high -> sole drives straight out, torso leans back, rear fist drops for balance -> re-chamber
    ts = P(hx=-4, hy=27, pitch=-0.30, yb=22, yh=50, nf=(37, 30, 4), nk=(1, 0.4, 0.2), fh=(4, 48, -4), nh=(14, 54, 7),
           ff=(-8, 1.5, -3.5), fk=(1, 0.1, -0.1))
    M['teep'] = seq(G, ('w0', P(hx=-2, pitch=-0.04, nf=(11, 19, 4), nk=(1, 0.9, 0.3)), 0.45, 'w'),
                    ('w1', P(hx=-3, pitch=-0.12, nf=(13, 27, 4), nk=(1, 1, 0.3), fh=(8, 52, -3)), 0.55, 'w'),
                    ('s0', ts, 1, 's'),
                    ('r0', P(hx=-2, pitch=-0.10, nf=(16, 22, 4), nk=(1, 0.9, 0.3), fh=(7, 52, -3)), 0.45, 'r'),
                    ('r1', P(nf=(12, 6, 4), nk=(1, 0.5, 0.3)), 0.55, 'r'))
    # ROUNDHOUSE (rear leg): step out -> pivot on the lead ball, hips turn over, same-side arm swings down -> shin whips through high
    rs = P(hx=-3, hy=28, pitch=-0.45, yb=-58, twist=-18, yh=44, hp=0, ff=(38, 45, 5), fk=(0, 1, 0.6), fh=(-18, 36, -9), fe=(0, -1, -0.2),
           nh=(12, 56, 9), nf=(4, 1.5, 3), nk=(1, 0.2, 0.4))
    M['round'] = seq(G, ('w0', P(hx=1, twist=-4, yb=22, nf=(11, 1.5, 4), ff=(-9, 4, -3.5), fh=(6, 50, -5), nh=(16, 55, 7)), 0.3, 'w'),
                     ('w1', P(hx=0, yb=-12, twist=-10, pitch=-0.15, yh=50, ff=(-1, 18, -2), fk=(0.8, 0.6, 0.3), fh=(-9, 42, -7),
                              nh=(14, 56, 8), nf=(7, 1.5, 3.5)), 0.35, 'w'),
                     ('w2', P(hx=-1, hy=27.5, yb=-42, twist=-14, pitch=-0.3, yh=46, ff=(13, 33, 0), fk=(0.2, 1, 0.5), fh=(-15, 38, -8),
                              nh=(13, 56, 9), nf=(5, 1.5, 3)), 0.35, 'w'),
                     ('s0', rs, 1, 's'),
                     ('r0', P(rs, yb=-75, pitch=-0.32, ff=(22, 30, 6), fk=(0.3, 1, 0.5), fh=(-11, 40, -7)), 0.35, 'r'),
                     ('r1', P(hx=-1, yb=-10, twist=-6, pitch=-0.08, ff=(-5, 9, -3.5), fk=(1, 0.5, 0), fh=(4, 48, -5), nf=(8, 1.5, 3.5)), 0.35, 'r'),
                     ('r2', mix(P(yb=-10, ff=(-7, 3, -3.5)), G, 0.7), 0.3, 'r'))
    # CLINCH KNEE: hands grab the neck -> pull down while the hips thrust forward -> rear knee spears up
    kns = P(hx=5, hy=28, pitch=-0.32, yb=20, twist=0, yh=50, ff=(17, 27, -1), fk=(1, 0.9, 0), nh=(21, 46, 6), fh=(19, 46, -1),
            ne=(0.2, -1, 0.7), fe=(0.2, -1, -0.3), nf=(4, 1.5, 4), nk=(1, 0.1, 0.4))
    M['knee'] = seq(G, ('w0', P(hx=1, pitch=0.12, nh=(25, 58, 6), fh=(23, 58, -1), ff=(-9, 3, -3.5)), 0.5, 'w'),
                    ('w1', P(hx=3, pitch=0.02, nh=(22, 52, 6), fh=(20, 52, -1), ff=(-2, 12, -3), fk=(1, 0.6, -0.1), nf=(6, 1.5, 4)), 0.5, 'w'),
                    ('s0', kns, 1, 's'),
                    ('r0', mix(kns, G, 0.45), 0.45, 'r'), ('r1', mix(kns, G, 0.82), 0.55, 'r'))
    # UPPERCUT (from the crouch): dip deeper, rear fist drops -> legs extend, hip turns, fist rips up past the chin
    us = P(hx=3, hy=28.5, pitch=-0.08, yb=40, twist=30, yh=52, hp=-8, fh=(21, 68, 0), fe=(0.7, -0.7, 0.3), nh=(12, 55, 8),
           ff=(-7, 4, -3), fk=(1, 0.3, 0.3), nf=(12, 1.5, 4))
    M['upper'] = seq(CROUCH, ('w0', P(CROUCH, hy=13, pitch=0.44, twist=-12, fh=(8, 25, -4), fe=(0.3, -1, -0.2)), 0.5, 'w'),
                     ('w1', mix(P(CROUCH, hy=13, pitch=0.44, twist=-12, fh=(8, 25, -4)), us, 0.45, fh=(16, 40, -2)), 0.5, 'w'),
                     ('s0', us, 1, 's'),
                     ('r0', mix(us, CROUCH, 0.45), 0.45, 'r'), ('r1', mix(us, CROUCH, 0.82), 0.55, 'r'))
    # LOW SWEEP (from the crouch): hips turn over low, rear shin scythes along the floor, arm swings back for balance
    ls = P(CROUCH, hx=-2, hy=17, pitch=0.10, yb=-55, twist=-10, yh=46, ff=(39, 5, 2), fk=(0, 1, 0.3), fh=(-13, 32, -7), nh=(14, 40, 8),
           nf=(6, 1.5, 4), nk=(1, 0.3, 0.4))
    M['low'] = seq(CROUCH, ('w0', P(CROUCH, yb=18, twist=-8, ff=(-11, 5, -3.5), fh=(4, 38, -5)), 0.5, 'w'),
                   ('w1', P(CROUCH, hy=16, yb=-20, twist=-10, yh=50, ff=(6, 8, -2), fk=(0.4, 1, 0.3), fh=(-8, 34, -6), nf=(8, 1.5, 4)), 0.5, 'w'),
                   ('s0', ls, 1, 's'),
                   ('r0', P(ls, yb=-70, ff=(24, 5, 6), fh=(-8, 34, -6)), 0.4, 'r'),
                   ('r1', mix(P(CROUCH, yb=-10, ff=(-6, 4, -3.5)), CROUCH, 0.6), 0.6, 'r'))
    # RISING KNEE (launcher): coil low -> spring up onto the toes, lead knee drives to the chin, both fists thrown up
    rks = P(hx=2, hy=32, pitch=-0.18, yb=26, yh=54, hp=-10, nf=(14, 33, 4), nk=(0.5, 1, 0.2), ff=(-6, 4, -3.5), fk=(1, 0.2, -0.1),
            nh=(19, 64, 8), fh=(11, 64, -3), ne=(0.3, -1, 0.6))
    M['rknee'] = seq(CROUCH, ('w0', P(CROUCH, hy=12.5, pitch=0.48, nh=(15, 34, 7), fh=(10, 36, -3)), 1, 'w'),
                     ('s0', rks, 1, 's'),
                     ('r0', mix(rks, CROUCH, 0.45), 0.45, 'r'), ('r1', mix(rks, CROUCH, 0.82), 0.55, 'r'))
    # AIR moves
    aps = P(AIR, hx=2, pitch=0.12, yb=14, twist=-38, yh=50, nh=(35, 52, 5), ne=(0, -1, 0.1), nf=(8, 11, 4), ff=(-6, 7, -3.5))
    M['airp'] = seq(AIR, ('w0', P(AIR, twist=8, nh=(12, 53, 8)), 1, 'w'), ('s0', aps, 1, 's'), ('r0', mix(aps, AIR, 0.5), 0.5, 'r'), ('r1', mix(aps, AIR, 0.85), 0.5, 'r'))
    aks = P(AIR, hy=22, hx=2, pitch=0.12, yb=12, yh=46, hp=6, nf=(29, -4, 4), nk=(1, 0.2, 0.2), ff=(-3, 15, -3.5), fk=(1, 1, -0.1),
            nh=(12, 50, 9), fh=(-3, 52, -5))
    M['airk'] = seq(AIR, ('w0', P(AIR, hy=27, nf=(10, 16, 4), nk=(1, 1, 0.3), pitch=0.2), 1, 'w'), ('s0', aks, 1, 's'),
                    ('r0', mix(aks, AIR, 0.5), 0.5, 'r'), ('r1', mix(aks, AIR, 0.85), 0.5, 'r'))
    ans = P(AIR, hx=3, hy=30, pitch=-0.32, yb=22, yh=52, hp=-6, ff=(18, 27, -1), fk=(1, 0.8, 0), nf=(-9, 9, 4), nk=(1, -0.4, 0.3),
            nh=(6, 65, 11), fh=(-1, 63, -6), ne=(0, -0.5, 1))
    M['airknee'] = seq(AIR, ('w0', P(AIR, pitch=0.2, ff=(-8, 10, -3.5), fk=(1, -0.2, 0), nh=(12, 50, 8)), 1, 'w'), ('s0', ans, 1, 's'),
                       ('r0', mix(ans, AIR, 0.5), 0.5, 'r'), ('r1', mix(ans, AIR, 0.85), 0.5, 'r'))
    # RUSH moves (out of a dash, momentum forward)
    RUN = P(hy=23, hx=2, pitch=0.42, yh=50, nf=(14, 1.5, 4), ff=(-14, 4, -3.5), nk=(1, 0.3, 0.4), fk=(0.3, 1, 0))
    rps = P(RUN, hx=5, pitch=0.30, yb=46, twist=46, fh=(28, 53, 5), fe=(0, 0.5, -1), nh=(10, 54, 8))
    M['rushp'] = seq(RUN, ('w0', P(RUN, twist=-22, yb=16, fh=(-3, 51, -13), fe=(0, 0.3, -1), nh=(16, 53, 7)), 1, 'w'),
                     ('s0', rps, 1, 's'),
                     ('r0', P(rps, twist=58, fh=(18, 50, 12), fe=(0, 0.4, -1), pitch=0.34), 0.4, 'r'),
                     ('r1', mix(rps, G, 0.7, fh=(12, 54, -2)), 0.6, 'r'))
    rks2 = P(hx=-2, hy=30, pitch=-0.36, yb=20, yh=50, nf=(37, 25, 4), nk=(1, 0.3, 0.2), ff=(-4, 12, -3.5), fk=(1, 0.9, -0.1),
             nh=(14, 55, 8), fh=(6, 52, -4))
    M['rushk'] = seq(RUN, ('w0', P(RUN, hy=27, pitch=0.12, nf=(12, 20, 4), nk=(1, 1, 0.3), ff=(-6, 8, -3.5)), 1, 'w'),
                     ('s0', rks2, 1, 's'),
                     ('r0', P(rks2, nf=(18, 20, 4), nk=(1, 0.9, 0.3), pitch=-0.15), 0.45, 'r'),
                     ('r1', mix(rks2, G, 0.8, nf=(12, 5, 4)), 0.55, 'r'))
    rns = P(hx=4, hy=32, pitch=-0.30, yb=22, yh=52, hp=-4, ff=(19, 28, -1), fk=(1, 0.8, 0), nf=(-7, 10, 4), nk=(1, -0.4, 0.3),
            nh=(17, 63, 7), fh=(12, 63, -2), ne=(0.4, -1, 0.5), fe=(0.4, -1, -0.2))
    M['rushn'] = seq(RUN, ('w0', P(RUN, pitch=0.35, ff=(-10, 8, -3.5), nh=(18, 58, 7), fh=(14, 58, -2)), 1, 'w'),
                     ('s0', rns, 1, 's'),
                     ('r0', mix(rns, G, 0.45), 0.45, 'r'), ('r1', mix(rns, G, 0.82), 0.55, 'r'))
    return M

# ------------------------------------------------------------------ expansion
def expand(anim_name, frames):
    """-> [(frame_name, pose, weight, phase, wind)]; the mullet lags behind the head motion (loops wrap around)"""
    out = []; n = len(frames); loop = frames[0][3] == 'l'
    for i, (nm, pose, w, ph) in enumerate(frames):
        prev = frames[i - 1][1] if (i > 0 or loop) else pose
        v = head_pos(pose) - head_pos(prev)
        wind = (float(np.clip(-v[0] * 0.8 + pose['pitch'] * 5, -5, 5)), float(np.clip(-v[1] * 0.9, -4, 5)))
        out.append(('%s_%s' % (anim_name, nm), pose, w, ph, wind))
    return out

def build():
    """-> frames [(name, pose, wind)], tags [{name, from, to, direction}], anims {name: {f, w, ph}} (the table js/sprites.js reads)"""
    frames, tags, table = [], [], {}
    for an, fr in build_anims().items():
        start = len(frames); ex = expand(an, fr)
        for fn, pose, w, ph, wind in ex: frames.append((fn, pose, wind))
        tags.append({'name': an, 'from': start, 'to': len(frames) - 1, 'direction': 0})
        table[an] = {'f': [e[0] for e in ex], 'w': [round(e[2], 3) for e in ex], 'ph': ''.join(e[3] for e in ex)}
    return frames, tags, table

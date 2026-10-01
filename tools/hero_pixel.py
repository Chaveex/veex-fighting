"""VEEX hero v9 - hand-made 2D PIXEL ART, drawn from the reference photo (public/veex.png). No 3D rendering, no photo texture.
  mullet that stops on the shoulders, swept-back textured top, visible forehead, thick straight brows, grey-blue eyes,
  discreet sandy moustache + 3-day stubble; stone-washed denim jacket (long sleeves, popped collar) open on a white crew-neck tee
  with a red collar and red / blue horizontal stripes; dark rinse jeans with rolled cuffs, white/red hi-tops, wrapped fists.

How a frame is made:
  * only the JOINT POSITIONS come from the animation data (tools/hero_anim.py poses, solved with the same skeleton as before) so the
    sprite stays frame-for-frame compatible with the game timing (meta.anims);
  * every body part is drawn in 2D on an indexed canvas (ramp, level): limbs = tapered capsules with 4-band cel shading (light from the
    upper right), torso = hull of discs with the open jacket / striped tee drawn on top, fists and hi-tops as small shapes;
  * the HEAD and the MULLET are hand-authored pixel maps (HEAD_SIDE / HEAD_FRONT / HEAD_BACK / MULLET below): edit those strings to retouch
    the face; hair texture is shaded procedurally inside the 'H' mask (swept-back strands);
  * parts are painted back to front (depth from the skeleton), then a selective inner line (part in front darkens the part behind),
    a 1 px outer contour and a cyan neon rim on the back edge (separate 'rim' layer, as in the game).
Used by tools/make_hero_sprites.py for the 'veex' look:  python tools/hero_pixel.py [frame names...]  -> preview PNG in tools/"""
import math, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hero6
from hero6 import ID, RAMPS, ik3, unit
from hero3d import rot_y

CONTOUR = (36, 18, 48)
RIM = (122, 234, 255)
LDIR = np.array([0.55, -0.83])            # screen-space direction toward the light (x right, y DOWN)
LDIR /= np.linalg.norm(LDIR)

# ------------------------------------------------------------------ hand-authored pixel maps (face looks to the RIGHT)
# '.' empty  O contour | hair: H (shaded procedurally) h light D shadow X deep B brow | skin: S (shaded) s light K shadow k deep E ear
# eyes: W white I iris P pupil | beard: M moustache m stubble n dark stubble | L mouth | c closed eye line
HEAD_SIDE = [
    "..........OOOOOO........",
    "........OOHHHHHHOO......",
    "......OOHHHHHHHHHHO.....",
    ".....OHHHHHHHHHHHHHO....",
    "....OHHHHHHHHHHHHHHHO...",
    "...OHHHHHHHHHHHHHHHHHO..",
    "...OHHHHHHHHHHHHHHHHHO..",
    "..OHHHHHHHHHHHHHHHHHHHO.",
    "..OHHHHHHHHHHHHHhsssHHO.",
    "..OHHHHHHHHHHKsssssssSO.",
    "..OHHHHHHHHHKSBBBBsBBBSO",
    "..OHHHHHHHHHKSWIPsSWPSSO",
    "..OHHHHHHHHEKSSKSSsSSSsO",
    "..OHHHHHHHEkKSSSSSssSSsO",
    "..OHHHHHHHEKSSSSSSSsSKsO",
    "..OHHHHHHHHKSSSSSSSKKSO.",
    "..OHHHHHHHHKSSSSSSMMMMMO",
    "...OHHHHHHKSSSSSSMMMMMMO",
    "...OHHHHHHKSSSSmSSLLLLSO",
    "....OHHHHKKSSmSSmSSSSmO.",
    "....OHHHHOKmSSmSmSmSmmO.",
    ".....OHHO.OKmSmSmmSmmO..",
    "......OO...OOkmnmmnmOO..",
    ".............OOOOOOO....",
]
HEAD_FRONT = [
    "........OOOOOOOO........",
    "......OOHHHHHHHHOO......",
    ".....OHHHHHHHHHHHHO.....",
    "....OHHHHHHHHHHHHHHO....",
    "...OHHHHHHHHHHHHHHHHO...",
    "..OHHHHHHHHHHHHHHHHHHO..",
    "..OHHHHHHHHHHHHHHHHHHO..",
    ".OHHHHHHHHHHHHHHHHHHHHO.",
    ".OHHHHHHsssssssssHHHHHO.",
    ".OHHHHKssssssssssssKHHO.",
    ".OHHHKSBBBBSssSBBBBSKHO.",
    ".OHHHKSWIPWSssSWPIWSKHO.",
    ".OHHEKSSSSSSssSSSSSSKEHO",
    ".OHHEKSSSSSSssSSSSSSKEHO",
    ".OHHHKSSSSSKssKSSSSSKHHO",
    ".OHHHKSSSSSSKKSSSSSSKHO.",
    ".OHHHKSSSMMMMMMMMMSSKHO.",
    "..OHHKSSMMmSSSSmMMSSKHO.",
    "..OHHKmSSmSLLLLSmSSmKHO.",
    "...OHKKmSmSmmmmSmSmKKO..",
    "....OOKmmnmnmnmnmnmKO...",
    "......OKnmnmnmnmnmKO....",
    ".......OOknnmnnnkOO.....",
    ".........OOOOOOOO.......",
]
HEAD_BACK = [
    "........OOOOOOOO........",
    "......OOHHHHHHHHOO......",
    ".....OHHHHHHHHHHHHO.....",
    "....OHHHHHHHHHHHHHHO....",
    "...OHHHHHHHHHHHHHHHHO...",
    "..OHHHHHHHHHHHHHHHHHHO..",
    "..OHHHHHHHHHHHHHHHHHHO..",
    ".OHHHHHHHHHHHHHHHHHHHHO.",
    ".OHHHHHHHHHHHHHHHHHHHHO.",
    ".OHHHHHHHHHHHHHHHHHHHHO.",
    ".OHHHHHHHHHHHHHHHHHHHHO.",
    ".OHHHHHHHHHHHHHHHHHHHHO.",
    "OEHHHHHHHHHHHHHHHHHHHHEO",
    "OEHHHHHHHHHHHHHHHHHHHHEO",
    ".OHHHHHHHHHHHHHHHHHHHHO.",
    ".OHHHHHHHHHHHHHHHHHHHHO.",
    ".OHHHHHHHHHHHHHHHHHHHHO.",
    "..OHHHHHHHHHHHHHHHHHHO..",
    "..OHHHHHHHHHHHHHHHHHHO..",
    "...OHHHHHHHHHHHHHHHHO...",
    "....OHHHHHHHHHHHHHHO....",
    ".....OHHHHHHHHHHHHO.....",
    "......OOHHHHHHHHOO......",
    "........OOOOOOOO........",
]
HEAD_ANCHOR = (12, 13)        # pixel of the map that sits on the skull centre
# mullet hanging from the nape (anchor = top-left (2,0) on the nape point); wavy flicked ends
MULLET = [
    "OHHHHHHHO...",
    "OHHHHHHHHO..",
    "OHHHHHHHHO..",
    "OHHHHHHHHHO.",
    "OHHHHHHHHHO.",
    "OHHHHHHHHHHO",
    "OHHHHHHHHHHO",
    "OHHHHHHHHHO.",
    "OHHHOHHHHHO.",
    "OHHO.OHHHO..",
    ".OO..OHHO...",
    "......OO....",
]
MULLET_ANCHOR = (5, 0)


class PixelHero:
    """same skeleton as hero6.Hero6 (so the animation data is reused as is), but the look is drawn in 2D"""
    def __init__(self):
        self.base = hero6.Hero6(look='veex')
        self.k, self.L, self.FS, self.OX, self.OY = self.base.k, self.base.L, self.base.FS, self.base.OX, self.base.OY

    # ---------------- skeleton (mirror of Hero6.build, joints only) ----------------
    def skeleton(self, P):
        k, L = self.k, self.L; SW = 7.8
        yb, yu, yh = math.radians(P['yb']), math.radians(P['yb'] + P['twist']), math.radians(P['yh'])
        Wb = lambda v: rot_y(np.asarray(v, float) * k, yb); Wu = lambda v: rot_y(np.asarray(v, float) * k, yu)
        Vb = lambda v: rot_y(unit(v), yb)
        pit = P['pitch']; su = np.array([math.sin(pit), math.cos(pit), 0.0]); fw = np.array([math.cos(pit), -math.sin(pit), 0.0]); sd = np.array([0.0, 0.0, 1.0])
        hipL = np.array([P['hx'], P['hy'], 0.0]); chestL = hipL + su * (L['torso'] / k)
        J = {'yb': yb, 'yu': yu, 'yh': yh}
        J['pelvis'] = Wb(hipL + su * 1.6); J['belt'] = Wb(hipL + su * 3.6)
        J['ab'] = Wu(hipL + su * (L['torso'] / k) * 0.30); J['chest'] = Wu(hipL + su * (L['torso'] / k) * 0.70)
        J['neck0'] = Wu(chestL - su * 1.2)
        shL = chestL - su * 2.3
        J['shN'], J['shF'] = Wu(shL + sd * SW), Wu(shL - sd * SW)
        J['hipN'], J['hipF'] = Wb(np.array([P['hx'], P['hy'], 3.6])), Wb(np.array([P['hx'], P['hy'], -3.6]))
        J['waistN'], J['waistF'] = Wb(hipL + su * 4.5 + sd * 6.0), Wb(hipL + su * 4.5 - sd * 6.0)
        J['front'] = rot_y(fw, yu); J['up'] = rot_y(su, yu); J['side'] = rot_y(sd, yu)
        a = pit + math.radians(P['hp']); fh0 = np.array([math.cos(a), -math.sin(a), 0.0]); uh0 = np.array([math.sin(a), math.cos(a), 0.0])
        rr = math.radians(P['hr']); uh1 = uh0 * math.cos(rr) + sd * math.sin(rr)
        J['hfwd'], J['hup'] = rot_y(fh0, yh), rot_y(uh1, yh)
        neckdir = np.array([math.sin(pit + math.radians(P['hp']) * 0.5), math.cos(pit + math.radians(P['hp']) * 0.5), 0.0])
        J['head'] = Wu(chestL + neckdir * (L['neck'] / k))
        for tag, sh, hand, pole in (('N', J['shN'], P['nh'], P['ne']), ('F', J['shF'], P['fh'], P['fe'])):
            el, hd = ik3(sh, Wb(hand), L['upper'], L['fore'], Vb(pole)); J['el' + tag], J['hand' + tag] = el, hd
        J['fwd'] = rot_y(np.array([1.0, 0.0, 0.0]), yb)
        for tag, hp, foot, pole in (('N', J['hipN'], P['nf'], P['nk']), ('F', J['hipF'], P['ff'], P['fk'])):
            kn, an = ik3(hp, Wb(foot), L['thigh'], L['shin'], Vb(pole)); J['knee' + tag], J['ank' + tag] = kn, an
        return J

    def sc(self, p):
        """world (x right, y up) -> screen pixel coords (float, y down)"""
        return np.array([self.OX + p[0], self.OY - p[1]])


class Canvas:
    def __init__(self, W, H):
        self.W, self.H = W, H
        self.ramp = np.full((H, W), -1, np.int16); self.lvl = np.zeros((H, W), np.int8)
        self.part = np.full((H, W), -1, np.int16); self.order = np.full((H, W), -1, np.int16)
        self.raw = np.zeros((H, W), np.int8)          # 1 = contour pixel painted by a map (kept as is)
        yy, xx = np.mgrid[0:H, 0:W]; self.X, self.Y = xx + 0.5, yy + 0.5
        self.n = 0

    def put(self, mask, ramp, lvl, part, raw=0):
        pick = lambda v: v[mask] if isinstance(v, np.ndarray) and v.ndim == 2 else v
        self.ramp[mask] = pick(ramp); self.lvl[mask] = pick(lvl); self.part[mask] = part; self.order[mask] = self.n; self.raw[mask] = raw

    def next(self): self.n += 1


def capsule_field(cv, a, b, r0, r1):
    """mask of a tapered capsule a->b (screen coords) + shading coordinate s in [-1,1] toward the light + t along the bone"""
    ab = b - a; L2 = float(ab @ ab) + 1e-9
    t = np.clip(((cv.X - a[0]) * ab[0] + (cv.Y - a[1]) * ab[1]) / L2, 0, 1)
    cx, cy = a[0] + ab[0] * t, a[1] + ab[1] * t; dx, dy = cv.X - cx, cv.Y - cy
    r = r0 + (r1 - r0) * t; d = np.sqrt(dx * dx + dy * dy); m = d <= r
    s = (dx * LDIR[0] + dy * LDIR[1]) / np.maximum(r, 0.5)
    return m, s, t


def cel(s, far=0):
    """4-band cel shading from the light coordinate"""
    lv = np.where(s > 0.55, 0, np.where(s > -0.30, 1, np.where(s > -0.78, 2, 3)))
    return np.clip(lv + far, 0, 4).astype(np.int8)


def hull(pts):
    pts = sorted(set(map(tuple, np.round(np.asarray(pts), 2))))
    if len(pts) < 3: return pts
    def cross(o, a, b): return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, up = [], []
    for p in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0: up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]


def poly_mask(cv, poly):
    """even-odd point-in-polygon on pixel centres"""
    X, Y = cv.X, cv.Y; inside = np.zeros(X.shape, bool); n = len(poly)
    for i in range(n):
        x0, y0 = poly[i]; x1, y1 = poly[(i + 1) % n]
        cond = ((y0 > Y) != (y1 > Y)) & (X < (x1 - x0) * (Y - y0) / ((y1 - y0) if y1 != y0 else 1e-9) + x0)
        inside ^= cond
    return inside


def disc_hull(cv, centres, radii):
    pts = []
    for c, r in zip(centres, radii):
        for a in np.linspace(0, 2 * math.pi, 20, endpoint=False): pts.append((c[0] + r * math.cos(a), c[1] + r * math.sin(a)))
    return poly_mask(cv, hull(pts))


# ------------------------------------------------------------------ pixel maps -> canvas
MAPCODE = {'h': ('hair', 0), 'H': ('hair', None), 'D': ('hair', 2), 'X': ('hair', 3), 'B': ('hair', 3),
           's': ('skin', 0), 'S': ('skin', None), 'K': ('skin', 2), 'k': ('skin', 3), 'E': ('skin', 2), 'e': ('skin', 3),
           'W': ('white', 0), 'I': ('iris', 1), 'P': ('dark', 1), 'M': ('beard', 1), 'm': ('beard', 1), 'n': ('beard', 2),
           'L': ('skin', 4), 'c': ('skin', 3)}


def grid(rows):
    w = max(len(r) for r in rows); return [r.ljust(w, '.') for r in rows]


def rotate_map(rows, ang, anchor):
    """rotate a char map by ang (radians, screen, clockwise +) with nearest sampling at 4x (rotsprite-lite); returns rows, anchor"""
    rows = grid(rows); h, w = len(rows), len(rows[0])
    if abs(ang) < math.radians(9): return rows, anchor
    R = int(math.ceil(math.hypot(w, h))) + 2; ax, ay = anchor; out = []
    ca, sa = math.cos(-ang), math.sin(-ang)
    for y in range(-R, R):
        line = []
        for x in range(-R, R):
            votes = {}
            for sx in (0.25, 0.75):
                for sy in (0.25, 0.75):
                    px, py = x + sx, y + sy; u = px * ca - py * sa + ax + 0.5; v = px * sa + py * ca + ay + 0.5
                    iu, iv = int(math.floor(u)), int(math.floor(v))
                    ch = rows[iv][iu] if 0 <= iv < h and 0 <= iu < w else '.'
                    votes[ch] = votes.get(ch, 0) + 1
            best = max(votes.items(), key=lambda kv: (kv[1], kv[0] != '.'))[0]
            if votes.get('.', 0) >= 3: best = '.'
            line.append(best)
        out.append(''.join(line))
    return out, (R, R)


def hair_level(x, y, w, h, light_right=True):
    """swept-back strands: diagonal streaks, lighter toward the upper-right (light), darker low-left"""
    gx = x / max(1, w - 1) if light_right else 1 - x / max(1, w - 1); gy = y / max(1, h - 1)
    lit = gx * 0.7 - gy                              # + toward the light (upper right)
    base = 1 if lit > -0.55 else 2
    xs = x if light_right else w - 1 - x
    strand = (xs + y // 2) % 4                       # swept-back diagonal locks
    if strand == 0: base += 1
    elif strand == 2 and lit > -0.15 and y % 3 != 2: base -= 1
    return int(np.clip(base, 0, 3))


def skin_level(x, y, w, h, light_right=True):
    gx = x / max(1, w - 1) if light_right else 1 - x / max(1, w - 1)
    return 0 if gx > 0.82 and y < h * 0.7 else 1


def paint_map(cv, rows, anchor, at, part, flip=False, ang=0.0, eyes_closed=False, shear=0.0):
    rows = grid(rows)
    if eyes_closed: rows = [r.replace('W', 'S').replace('I', 'c').replace('P', 'c') for r in rows]
    if flip: rows = [r[::-1] for r in rows]; anchor = (len(rows[0]) - 1 - anchor[0], anchor[1])
    if shear:
        h = len(rows); pad = int(math.ceil(abs(shear))) + 1; out = []
        for y, r in enumerate(rows):
            off = int(round(shear * (y / max(1, h - 1)) ** 1.5)); out.append('.' * (pad + off) + r + '.' * (pad - off))
        rows = out; anchor = (anchor[0] + pad, anchor[1])
    rows, anchor = rotate_map(rows, ang, anchor)
    h, w = len(rows), len(rows[0]); x0, y0 = int(round(at[0] - anchor[0] - 0.5)), int(round(at[1] - anchor[1] - 0.5))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            X, Y = x0 + x, y0 + y
            if ch == '.' or not (0 <= X < cv.W and 0 <= Y < cv.H): continue
            m = np.zeros((cv.H, cv.W), bool); m[Y, X] = True
            if ch == 'O': cv.ramp[Y, X] = ID['dark']; cv.lvl[Y, X] = 3; cv.part[Y, X] = part; cv.order[Y, X] = cv.n; cv.raw[Y, X] = 1; continue
            ramp, lv = MAPCODE.get(ch, ('skin', 1))
            if lv is None: lv = hair_level(x, y, w, h, not flip) if ramp == 'hair' else skin_level(x, y, w, h, not flip)
            cv.ramp[Y, X] = ID[ramp]; cv.lvl[Y, X] = lv; cv.part[Y, X] = part; cv.order[Y, X] = cv.n; cv.raw[Y, X] = 0


# ------------------------------------------------------------------ the drawing
PARTS = {n: i for i, n in enumerate(['armF', 'legF', 'torso', 'mullet', 'head', 'legN', 'armN', 'fistF', 'fistN'])}


class Drawer(PixelHero):
    def render(self, pose_solved, wind=(0.0, 0.0), name=''):
        J = self.skeleton(pose_solved); cv = Canvas(self.FS, self.FS); S = self.sc
        z = lambda *ks: float(np.mean([J[k][2] for k in ks]))
        hurt = any(name.startswith(p) for p in ('hurt', 'tumble', 'down', 'getup'))
        jobs = [(z('shF', 'elF', 'handF'), 'armF'), (z('hipF', 'kneeF', 'ankF'), 'legF'), (z('chest', 'pelvis') - 0.5, 'torso'),
                (z('head') - 0.4, 'mullet'), (z('head') + 0.6, 'head'), (z('hipN', 'kneeN', 'ankN'), 'legN'), (z('shN', 'elN', 'handN'), 'armN')]
        # the torso hull must never hide the near limbs / head when they are only slightly behind its centre
        for zz, part in sorted(jobs, key=lambda j: j[0]):
            getattr(self, 'draw_' + part.rstrip('NF') if part[-1] in 'NF' else 'draw_' + part)(cv, J, part, wind, hurt)
            cv.next()
        return self.finish(cv)

    # ---- limbs ----
    def draw_arm(self, cv, J, part, wind, hurt):
        tag = part[-1]; far = 1 if tag == 'F' and J['side'][2] > -0.2 else 0; S = self.sc; pid = PARTS[part]
        sh, el, hd = S(J['sh' + tag]), S(J['el' + tag]), S(J['hand' + tag])
        d = hd - el; dn = d / (np.linalg.norm(d) + 1e-9)
        cuff = el + d * 0.62
        m, s, t = capsule_field(cv, sh, el, 4.0, 3.5); cv.put(m, ID['denim'], cel(s, far), pid)                # sleeve (upper)
        m, s, t = capsule_field(cv, el, cuff, 3.5, 3.1); cv.put(m, ID['denim'], cel(s, far), pid)              # sleeve (fore)
        m, s, t = capsule_field(cv, cuff - dn * 0.4, cuff + dn * 1.2, 3.4, 3.4); cv.put(m, ID['denim'], np.clip(cel(s, far) - 1, 0, 4).astype(np.int8), pid)  # cuff
        # elbow crease
        m, s, t = capsule_field(cv, el - dn * 0.2, el + dn * 0.6, 1.0, 0.6); cv.put(m & (s < 0), ID['denim'], np.full(m.shape, 3, np.int8), pid)
        # wrapped fist: white tape with a red band, knuckles toward the punch
        fc = hd + dn * 1.6
        m, s, t = capsule_field(cv, cuff + dn * 1.0, hd, 2.4, 2.6); cv.put(m, ID['white'], cel(s, far), pid)       # wrapped wrist
        band = m & (t > 0.40) & (t < 0.78); lv = cel(s, far); cv.ramp[band] = ID['red']; cv.lvl[band] = lv[band]
        m, s, t = capsule_field(cv, fc - dn * 0.8, fc + dn * 1.0, 3.9, 3.7); cv.put(m, ID['white'], cel(s, far), pid)
        kn = m & (((cv.X - (fc[0] + dn[0] * 2.4)) * dn[0] + (cv.Y - (fc[1] + dn[1] * 2.4)) * dn[1]) > 0); cv.lvl[kn] = np.maximum(cv.lvl[kn], 1 + far)

    def draw_leg(self, cv, J, part, wind, hurt):
        tag = part[-1]; far = 1 if tag == 'F' else 0; S = self.sc; pid = PARTS[part]
        hp, kn, an = S(J['hip' + tag]), S(J['knee' + tag]), S(J['ank' + tag])
        m, s, t = capsule_field(cv, hp, kn, 5.0, 3.9); cv.put(m, ID['jeans'], cel(s, far), pid)
        m, s, t = capsule_field(cv, kn, an, 3.8, 3.2); cv.put(m, ID['jeans'], cel(s, far), pid)
        # denim wear: lighter streak on the thigh front, knee highlight
        m, s, t = capsule_field(cv, hp + (kn - hp) * 0.25, hp + (kn - hp) * 0.8, 1.2, 1.0); cv.put(m & (s > 0), ID['jeans'], np.full(m.shape, max(0, far), np.int8), pid)
        d = an - kn; dn = d / (np.linalg.norm(d) + 1e-9)
        m, s, t = capsule_field(cv, an - dn * 3.4, an - dn * 1.2, 4.0, 4.0); cv.put(m, ID['jeans'], np.clip(cel(s, far) - 1, 0, 4).astype(np.int8), pid)   # rolled cuff
        cl = m & (np.abs((cv.X - (an - dn * 2.3)[0]) * dn[0] + (cv.Y - (an - dn * 2.3)[1]) * dn[1]) < 0.5); cv.lvl[cl] = 2 + far
        self.draw_shoe(cv, J, tag, an, dn, far, pid)

    def draw_shoe(self, cv, J, tag, an, dn, far, pid):
        V = -dn                                          # up the shin (screen)
        f3 = J['fwd']; fx = f3[0]
        U = np.array([fx, 0.0]) if abs(fx) > 0.2 else np.array([0.35 if fx >= 0 else -0.35, 0.0])
        U = U - V * float(U @ V); U = U / (np.linalg.norm(U) + 1e-9) if np.linalg.norm(U) > 1e-3 else np.array([1.0, 0.0])
        L = 7.5 * max(0.45, min(1.0, abs(fx) + 0.25))
        heel, toe = an + U * -2.2 - V * 1.6, an + U * (L - 2.2) - V * 2.2
        m, s, t = capsule_field(cv, heel, toe, 2.9, 2.5); cv.put(m, ID['shoe'], cel(s, far), pid)
        hi = an + V * 0.8
        m2, s2, t2 = capsule_field(cv, an - V * 0.5, hi, 3.2, 3.0); cv.put(m2, ID['shoe'], cel(s2, far), pid)        # hi-top shaft
        top = m2 & (((cv.X - hi[0]) * V[0] + (cv.Y - hi[1]) * V[1]) > 0.6); cv.ramp[top] = ID['red']; cv.lvl[top] = 1 + far   # thin red collar
        # sole + red toe cap
        mm, ss, tt = capsule_field(cv, heel, toe, 2.9, 2.5)
        sole = mm & (((cv.X - heel[0]) * -V[0] + (cv.Y - heel[1]) * -V[1]) > 0.9)
        cv.ramp[sole] = ID['gum']; cv.lvl[sole] = 1 + far
        cap = mm & (tt > 0.88) & ~sole; cv.ramp[cap] = ID['red']; cv.lvl[cap] = 1 + far
        lace = mm & (tt > 0.35) & (tt < 0.7) & (((cv.X - an[0]) * V[0] + (cv.Y - an[1]) * V[1]) > 0.2) & ~sole
        cv.lvl[lace & ((cv.X.astype(int) + cv.Y.astype(int)) % 2 == 0)] = 2 + far

    # ---- torso: jeans hips, belt, jacket hull, open front with the striped tee, popped collar, neck ----
    def draw_torso(self, cv, J, part, wind, hurt):
        S = self.sc; pid = PARTS[part]; k = self.k
        pel, ab, ch, n0 = S(J['pelvis']), S(J['ab']), S(J['chest']), S(J['neck0'])
        shN, shF, hN, hF, wN, wF = S(J['shN']), S(J['shF']), S(J['hipN']), S(J['hipF']), S(J['waistN']), S(J['waistF'])
        # hips (jeans)
        m = disc_hull(cv, [pel, hN, hF], [6.2, 4.8, 4.8]); ax_m, ax_s, _ = capsule_field(cv, ab, pel, 9, 7)
        cv.put(m, ID['jeans'], cel(ax_s), pid)
        # neck
        hd = S(J['head']); nm, ns, nt = capsule_field(cv, n0, n0 + (hd - n0) * 0.55, 3.6, 3.2); cv.put(nm, ID['skin'], np.clip(cel(ns) + 1, 0, 4).astype(np.int8), pid)
        # jacket body
        up = n0 - pel; upn = up / (np.linalg.norm(up) + 1e-9)
        jm = disc_hull(cv, [shN, shF, ch, ab, wN, wF], [4.6, 4.6, 6.6, 6.4, 3.4, 3.4])
        jm &= (((cv.X - pel[0]) * upn[0] + (cv.Y - pel[1]) * upn[1]) > 1.5)      # hem just above the belt
        hw = max(5.0, 0.5 * float(np.linalg.norm(shN - shF)) + 4.0)
        _, js, jt = capsule_field(cv, n0, ab, hw, hw)
        cv.put(jm, ID['denim'], cel(js), pid)
        # waistband of the jacket (darker band) + yoke stitch
        along = (cv.X - pel[0]) * upn[0] + (cv.Y - pel[1]) * upn[1]
        wb = jm & (along < 4.0); cv.lvl[wb] = np.minimum(4, cv.lvl[wb] + 1)
        # belt (only between jacket hem and jeans)
        belt = m & ~jm & (along > -0.2) & (along < 2.2); cv.ramp[belt] = ID['leather']; cv.lvl[belt] = 1
        # open front: striped tee
        f = J['front']; side = J['side']; face = f[2]                            # >0: chest turned toward the camera
        if face > -0.15:
            fx = f[0]; cx = ch + np.array([fx * (hw - 1.5) * (1 - max(0, face)) , 0.0])
            topc = n0 + np.array([fx * 1.2, 1.0]); botc = pel + up * 0.18 + np.array([fx * (hw - 2) * (1 - max(0, face)) * 0.8, 0])
            width = 1.6 + 5.0 * max(0.0, face)
            tm, tsh, tt = capsule_field(cv, topc, botc, width, width + 0.8); tm &= jm
            along_t = (cv.X - topc[0]) * (-upn[0]) + (cv.Y - topc[1]) * (-upn[1])
            band = (np.floor(along_t / 2.0).astype(int)) % 4
            col = np.where(band == 1, ID['red'], np.where(band == 3, ID['blue'], ID['white']))
            cv.ramp[tm] = col[tm]; cv.lvl[tm] = np.where(tsh[tm] > 0.2, 1, 2)
            neck = tm & (along_t > -1.0) & (along_t < 1.2) & (np.hypot(cv.X - topc[0], cv.Y - topc[1]) < width + 0.6); cv.ramp[neck] = ID['red']; cv.lvl[neck] = 1   # red crew neck
            cv.ramp[tm & (along_t <= -1.0)] = ID['skin']; cv.lvl[tm & (along_t <= -1.0)] = 2
            # lapel edges + brass buttons on the far edge
            em, es, et = capsule_field(cv, topc, botc, width + 1.2, width + 2.0); edge = em & ~tm & jm
            cv.lvl[edge] = np.where(es[edge] > 0, 0, 3)
            for tb in (0.35, 0.62):
                bp = topc + (botc - topc) * tb + np.array([-(width + 1.5) * (1 if fx >= 0 else -1), 0])
                bx, by = int(bp[0]), int(bp[1])
                if 0 <= bx < cv.W and 0 <= by < cv.H and jm[by, bx]: cv.ramp[by, bx] = ID['gold']; cv.lvl[by, bx] = 0
        # chest pocket flap on the visible side
        pk = ch + np.array([-(hw * 0.45) * (1 if f[0] >= 0 else -1), -1.5])
        pm = jm & (np.abs(cv.X - pk[0]) < 2.6) & (np.abs(cv.Y - pk[1]) < 1.1); cv.lvl[pm] = np.minimum(4, cv.lvl[pm] + 1)
        # popped collar: two raised wings framing the neck
        for sgn in (1, -1):
            base = n0 + np.array([sgn * 3.6, 1.8]); tip = n0 + np.array([sgn * 4.8 - 0.8, -3.2])
            cm, cs_, ct = capsule_field(cv, base, tip, 2.2, 1.3); cv.put(cm, ID['denim'], np.where(cs_ > 0.0, 0, 1 if sgn > 0 else 2).astype(np.int8), pid)

    # ---- head + mullet ----
    def head_view(self, J):
        f = J['hfwd']; fx, fz = f[0], f[2]
        if fx > 0.30: return 'side', False
        if fx < -0.30: return 'side', True
        return ('front' if fz >= 0 else 'back'), False

    def head_angle(self, J, flip):
        u = J['hup']; ang = math.atan2(u[0], u[1])     # clockwise tilt on screen
        return ang

    def draw_mullet(self, cv, J, part, wind, hurt):
        view, flip = self.head_view(J)
        if view == 'front': return
        hc = self.sc(J['head']); ang = self.head_angle(J, flip)
        if view == 'back':
            at = hc + np.array([0.0, 7.0]); paint_map(cv, MULLET, (5, 0), at, PARTS['mullet'], ang=ang, shear=float(wind[0]) * 0.6); return
        back = -1 if not flip else 1
        nape = hc + np.array([back * 5.5, 5.0])
        c, s_ = math.cos(ang), math.sin(ang); off = nape - hc; nape = hc + np.array([off[0] * c - off[1] * s_, off[0] * s_ + off[1] * c])
        paint_map(cv, MULLET, MULLET_ANCHOR, nape, PARTS['mullet'], flip=flip, ang=ang, shear=back * float(wind[0]) * 0.8)

    def draw_head(self, cv, J, part, wind, hurt):
        view, flip = self.head_view(J); hc = self.sc(J['head']); ang = self.head_angle(J, flip)
        rows = {'side': HEAD_SIDE, 'front': HEAD_FRONT, 'back': HEAD_BACK}[view]
        paint_map(cv, rows, HEAD_ANCHOR, hc, PARTS['head'], flip=flip, ang=ang, eyes_closed=hurt)

    # ---- finishing: selective inner lines, outer contour, rim ----
    def finish(self, cv):
        H, W = cv.H, cv.W; filled = cv.ramp >= 0
        lvl = cv.lvl.copy()
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            nb_order = np.roll(np.roll(cv.order, dy, 0), dx, 1); nb_part = np.roll(np.roll(cv.part, dy, 0), dx, 1)
            nb_fill = np.roll(np.roll(filled, dy, 0), dx, 1)
            line = filled & nb_fill & (nb_order > cv.order) & (nb_part != cv.part) & (cv.raw == 0)
            lvl[line] = np.maximum(lvl[line], 3)
        img = np.zeros((H, W, 4), np.uint8)
        for rid in np.unique(cv.ramp[filled]):
            m = filled & (cv.ramp == rid); ramp = RAMPS[rid]
            for lv in range(5):
                mm = m & (lvl == lv)
                if mm.any(): img[mm, :3] = ramp[lv]; img[mm, 3] = 255
        raw = filled & (cv.raw == 1); img[raw, :3] = CONTOUR; img[raw, 3] = 255
        # outer contour (1 px, 4-neighbour)
        out = np.zeros((H, W), bool)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)): out |= np.roll(np.roll(filled, dy, 0), dx, 1)
        out &= ~filled; img[out, :3] = CONTOUR; img[out, 3] = 255
        # neon rim: back (left) edge of the silhouette, upper body only
        rim = np.zeros((H, W, 4), np.uint8)
        rx = out & np.roll(filled, -1, 1) & ~np.roll(filled, 1, 1)          # contour pixels on the left (back) edge
        ys = np.nonzero(filled.any(1))[0]
        if len(ys):
            rx[ys.min() + int((ys.max() - ys.min()) * 0.62):] = False
            rim[rx, :3] = RIM; rim[rx, 3] = 255
        return Image.fromarray(img, 'RGBA'), Image.fromarray(rim, 'RGBA')


_D = None
def render(pose, wind=(0.0, 0.0), name=''):
    """pose = hero_anim pose (screen-space); returns (body, rim) RGBA images"""
    global _D
    if _D is None: _D = Drawer()
    import hero_anim as HA
    return _D.render(HA.solve(pose), wind, name)


if __name__ == '__main__':
    import hero_anim as HA
    frames, tags, anims = HA.build()
    want = sys.argv[1:] or ['idle_0', 'walk_2', 'jab_s0', 'cross_s0', 'elbow_s0', 'round_s0', 'hurt_0', 'fury_1']
    sel = [f for f in frames if f[0] in want]
    sc = 4; FS = 128; big = Image.new('RGBA', (len(sel) * FS * sc, FS * sc), (52, 36, 100, 255))
    for i, (n, p, w) in enumerate(sel):
        b, r = render(p, w, n); b.alpha_composite(r); big.alpha_composite(b.resize((FS * sc, FS * sc), Image.NEAREST), (i * FS * sc, 0))
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pixel_preview.png'); big.save(out); print(out, [f[0] for f in sel])

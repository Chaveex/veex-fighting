"""ROXY v2 - hand-made 2D PIXEL ART, same method and finish as VEEX (tools/hero_pixel.py), replacing the 3D -> pixel render.
  platinum 80s volume hair with a pink headband and a high ponytail (scrunchie) that trails the motion, green eyes, pink lips;
  cropped open teal windbreaker (white piping, pink chevron, sleeves rolled to the elbow), hot-pink crop top, bare midriff,
  high-waist deep-violet leggings, fuzzy pink leg warmers, white hi-tops, pink hand wraps.
Same skeleton and animation data as VEEX (only the shoulder width is narrower), so the sheet stays frame-for-frame compatible.
Head maps are derived from VEEX's hand-authored maps (no beard, lips, headband) - retouch them in ROXY_HEADS below.
Used by tools/make_hero_sprites.py for the 'roxy' look:  python tools/roxy_pixel.py [frame names...]  -> tools/roxy_preview.png"""
import math, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hero6
from hero6 import ID
from hero_pixel import (Drawer, PARTS, HEAD_SIDE, HEAD_FRONT, HEAD_BACK, HEAD_ANCHOR, capsule_field, cel, disc_hull, paint_map, grid)


def roxy_head(rows, view):
    """VEEX map -> ROXY map: beard / stubble become skin, mouth becomes lips, a 2 px pink headband crosses the hair"""
    out = []
    for y, r in enumerate(grid(rows)):
        r = list(r)
        for x, ch in enumerate(r):
            if ch in 'Mmn' or (ch == 'k' and y >= 16): r[x] = 'S'
            elif ch == 'L': r[x] = 'l'
            elif ch == 'B' and view != 'back': r[x] = 'D'                          # finer, lighter brows
        if view == 'side':     # band over the forehead, sloping down behind the ear
            for x in range(len(r)):
                yb = 7 if x >= 13 else 7 + int(round((13 - x) * 0.32))
                if y in (yb - 1, yb) and r[x] in 'HhD': r[x] = 'R' if y == yb - 1 else 'r'
        elif view == 'front':
            if y in (6, 7): r = [('R' if y == 6 else 'r') if c in 'HhD' else c for c in r]
        else:
            if y in (8, 9): r = [('R' if y == 8 else 'r') if c in 'HhD' else c for c in r]
        if view == 'side' and y == 11:                                              # lashes: one dark pixel above the eye white
            pass
        out.append(''.join(r))
    return out


ROXY_HEADS = {'side': roxy_head(HEAD_SIDE, 'side'), 'front': roxy_head(HEAD_FRONT, 'front'), 'back': roxy_head(HEAD_BACK, 'back')}
# ponytail, drawn hanging to the LEFT (= behind a head that looks right); anchor = the scrunchie
PONY = [
    "........OOO..",
    ".......ORRRO.",
    "....OOOORrRO.",
    "..OOHHHHORRO.",
    ".OHHHHHHHOO..",
    "OHHHHHHHHO...",
    "OHHHHHHHO....",
    "OHHHHHHHO....",
    ".OHHHHHHO....",
    ".OHHHHHO.....",
    "..OHHHHO.....",
    "..OHHHHO.....",
    "...OHHHO.....",
    "...OHHO......",
    "..OHHO.......",
    "..OHO........",
    "...O.........",
]
PONY_ANCHOR = (10, 2)


class RoxyDrawer(Drawer):
    def __init__(self):
        super().__init__()
        self.SW = 7.0
        self.ramps = hero6.LOOKS['roxy']

    # ---- ponytail (replaces the mullet layer) ----
    def draw_mullet(self, cv, J, part, wind, hurt):
        view, flip = self.head_view(J)
        hc = self.sc(J['head']); ang = self.head_angle(J, flip); wx = float(np.clip(wind[0], -3, 3))
        if view == 'front':
            return
        if view == 'back':
            at = hc + np.array([0.0, -6.0])
            paint_map(cv, PONY, PONY_ANCHOR, at, PARTS['mullet'], ang=ang, shear=wx * 0.8); return
        back = -1 if not flip else 1
        crown = hc + np.array([back * 6.5, -7.5])
        c, s_ = math.cos(ang), math.sin(ang); off = crown - hc; crown = hc + np.array([off[0] * c - off[1] * s_, off[0] * s_ + off[1] * c])
        # the tail swings behind with the motion (wind) and lifts a little on fast moves
        paint_map(cv, PONY, PONY_ANCHOR, crown, PARTS['mullet'], flip=flip, ang=ang - back * wx * 0.06, shear=back * wx * 1.1)

    def draw_head(self, cv, J, part, wind, hurt):
        view, flip = self.head_view(J); hc = self.sc(J['head']); ang = self.head_angle(J, flip)
        paint_map(cv, ROXY_HEADS[view], HEAD_ANCHOR, hc, PARTS['head'], flip=flip, ang=ang, eyes_closed=hurt)

    # ---- arms: windbreaker sleeve rolled to the elbow, bare forearm, pink wraps ----
    def draw_arm(self, cv, J, part, wind, hurt):
        tag = part[-1]; far = 1 if tag == 'F' and J['side'][2] > -0.2 else 0; S = self.sc; pid = PARTS[part]
        sh, el, hd = S(J['sh' + tag]), S(J['el' + tag]), S(J['hand' + tag])
        d = hd - el; dn = d / (np.linalg.norm(d) + 1e-9); u = el - sh; un = u / (np.linalg.norm(u) + 1e-9)
        m, s, t = capsule_field(cv, el, hd, 2.9, 2.5); cv.put(m, ID['skin'], cel(s, far), pid)                         # bare forearm
        m, s, t = capsule_field(cv, sh, el - un * 0.4, 3.7, 3.2); cv.put(m, ID['denim'], cel(s, far), pid)             # sleeve
        m, s, t = capsule_field(cv, el - un * 1.6, el + dn * 0.6, 3.6, 3.6); cv.put(m, ID['denim'], np.clip(cel(s, far) - 1, 0, 4).astype(np.int8), pid)  # rolled cuff
        rim_ = m & (t > 0.78); cv.ramp[rim_] = ID['white']; cv.lvl[rim_] = 1 + far                                     # piping
        fc = hd + dn * 1.5
        m, s, t = capsule_field(cv, el + d * 0.72, hd, 2.3, 2.5); cv.put(m, ID['pink'], cel(s, far), pid)             # wrapped wrist
        band = m & (t > 0.45) & (t < 0.75); cv.ramp[band] = ID['white']; cv.lvl[band] = cel(s, far)[band]
        m, s, t = capsule_field(cv, fc - dn * 0.8, fc + dn * 0.9, 3.6, 3.4); cv.put(m, ID['pink'], cel(s, far), pid)
        kn = m & (((cv.X - (fc[0] + dn[0] * 2.2)) * dn[0] + (cv.Y - (fc[1] + dn[1] * 2.2)) * dn[1]) > 0); cv.lvl[kn] = np.maximum(cv.lvl[kn], 1 + far)

    # ---- legs: leggings + fuzzy leg warmers ----
    def draw_leg(self, cv, J, part, wind, hurt):
        tag = part[-1]; far = 1 if tag == 'F' else 0; S = self.sc; pid = PARTS[part]
        hp, kn, an = S(J['hip' + tag]), S(J['knee' + tag]), S(J['ank' + tag])
        m, s, t = capsule_field(cv, hp, kn, 4.5, 3.4); cv.put(m, ID['jeans'], cel(s, far), pid)
        m, s, t = capsule_field(cv, kn, an, 3.3, 2.7); cv.put(m, ID['jeans'], cel(s, far), pid)
        m, s, t = capsule_field(cv, hp + (kn - hp) * 0.2, hp + (kn - hp) * 0.85, 1.0, 0.8); cv.put(m & (s > 0), ID['jeans'], np.full(m.shape, 0, np.int8), pid)  # sheen
        d = an - kn; dn = d / (np.linalg.norm(d) + 1e-9)
        w0 = kn + d * 0.42
        m, s, t = capsule_field(cv, w0, an + dn * 0.4, 3.9, 4.1)                                                        # leg warmer
        along = (cv.X - w0[0]) * dn[0] + (cv.Y - w0[1]) * dn[1]
        lv = cel(s, far); rib = (np.floor(along / 1.5).astype(int) % 2 == 1); lv = np.where(rib, np.minimum(4, lv + 1), lv).astype(np.int8)
        cv.put(m, ID['warmer'], lv, pid)
        # fuzzy top edge: ragged pixels
        edge = m & (along < 1.0) & (((cv.X.astype(int) * 7 + cv.Y.astype(int) * 3) % 3) == 0); cv.ramp[edge] = -1
        self.draw_shoe(cv, J, tag, an, dn, far, pid)

    # ---- torso: leggings waist, bare midriff, crop top, cropped open windbreaker ----
    def draw_torso(self, cv, J, part, wind, hurt):
        S = self.sc; pid = PARTS[part]
        pel, ab, ch, n0 = S(J['pelvis']), S(J['ab']), S(J['chest']), S(J['neck0'])
        shN, shF, hN, hF, wN, wF = S(J['shN']), S(J['shF']), S(J['hipN']), S(J['hipF']), S(J['waistN']), S(J['waistF'])
        up = n0 - pel; Lt = float(np.linalg.norm(up)); upn = up / (Lt + 1e-9)
        hw = max(4.5, 0.5 * float(np.linalg.norm(shN - shF)) + 3.6)
        _, js, _ = capsule_field(cv, n0, pel, hw, hw)
        along = (cv.X - pel[0]) * upn[0] + (cv.Y - pel[1]) * upn[1]
        f = J['front']; fx, face = f[0], f[2]
        # hips (high-waist leggings)
        m = disc_hull(cv, [pel, hN, hF], [5.6, 4.4, 4.4]); cv.put(m, ID['jeans'], cel(js), pid)
        # neck
        hd = S(J['head']); nm, ns, _ = capsule_field(cv, n0, n0 + (hd - n0) * 0.55, 3.1, 2.8); cv.put(nm, ID['skin'], np.clip(cel(ns) + 1, 0, 4).astype(np.int8), pid)
        # body: waist narrower than VEEX
        body = disc_hull(cv, [shN, shF, ch, ab, wN, wF], [4.2, 4.2, 6.0, 5.0, 3.6, 3.6]) & (along > 0.5)
        waist = body & (along < 3.2); cv.put(waist, ID['jeans'], cel(js), pid)                              # waistband
        cv.lvl[waist & (along > 2.4)] = 0
        mid = body & (along >= 3.2) & (along < Lt * 0.52); cv.put(mid, ID['skin'], cel(js), pid)              # bare midriff
        navel = mid & (np.abs(along - Lt * 0.30) < 0.5) & (np.abs(cv.X - (pel[0] + fx * hw * 0.35)) < 0.6); cv.lvl[navel] = 3
        top = body & (along >= Lt * 0.52)
        cv.put(top, ID['pink'], cel(js), pid)                                                                  # crop top
        # cropped windbreaker: covers the back / shoulders, open front leaves the crop top visible
        jk = top & (along >= Lt * 0.47)
        if face > -0.15:
            topc = n0 + np.array([fx * 1.0, 1.0]); botc = ch + np.array([fx * (hw - 2) * (1 - max(0, face)) * 0.8, Lt * 0.25])
            width = 1.8 + 4.6 * max(0.0, face)
            tm, tsh, _ = capsule_field(cv, topc, botc, width, width + 1.0)
            jk &= ~tm
            neck_cut = top & tm & (np.hypot(cv.X - topc[0], cv.Y - topc[1]) < width * 0.7); cv.ramp[neck_cut] = ID['skin']; cv.lvl[neck_cut] = 1   # scoop neckline
            bust = top & tm & (np.abs(along - Lt * 0.70) < 0.6); cv.lvl[bust] = np.minimum(4, cv.lvl[bust] + 1)
        jk |= body & (along >= Lt * 0.47) & (face <= -0.15)
        cv.put(jk, ID['denim'], cel(js), pid)
        hem = jk & (along < Lt * 0.47 + 1.2); cv.ramp[hem] = ID['white']; cv.lvl[hem] = 1                       # white piping on the hem
        if face > -0.15:
            em, es, _ = capsule_field(cv, topc, botc, width + 1.0, width + 2.0); edge = em & jk & ~capsule_field(cv, topc, botc, width, width + 1.0)[0]
            cv.ramp[edge] = ID['white']; cv.lvl[edge] = np.where(es[edge] > 0, 0, 2)                             # piping on the open front
        # pink chevron across the chest / back panel
        chev = jk & (np.abs(along - (Lt * 0.80 - np.abs(cv.X - ch[0]) * 0.45)) < 0.9); cv.ramp[chev] = ID['pink']; cv.lvl[chev] = 1
        # small stand-up collar
        for sgn in (1, -1):
            base = n0 + np.array([sgn * 3.0, 1.4]); tip = n0 + np.array([sgn * 3.6 - 0.6, -1.8])
            cm, cs_, _ = capsule_field(cv, base, tip, 1.8, 1.2); cv.put(cm, ID['denim'], np.where(cs_ > 0.0, 0, 1 if sgn > 0 else 2).astype(np.int8), pid)


_D = None
def render(pose, wind=(0.0, 0.0), name=''):
    global _D
    if _D is None: _D = RoxyDrawer()
    import hero_anim as HA
    return _D.render(HA.solve(pose), wind, name)


if __name__ == '__main__':
    import hero_anim as HA
    frames, tags, anims = HA.build()
    want = sys.argv[1:] or ['idle_0', 'walk_2', 'jab_s0', 'cross_s0', 'elbow_s0', 'round_s0', 'hurt_0', 'fury_1']
    sel = [f for f in frames if f[0] in want]
    sc = 4; FS = _D.FS if _D else 128
    big = Image.new('RGBA', (len(sel) * FS * sc, FS * sc), (52, 36, 100, 255))
    for i, (n, p, w) in enumerate(sel):
        b, r = render(p, w, n); b.alpha_composite(r); big.alpha_composite(b.resize((FS * sc, FS * sc), Image.NEAREST), (i * FS * sc, 0))
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'roxy_preview.png'); big.save(out); print(out, [f[0] for f in sel])

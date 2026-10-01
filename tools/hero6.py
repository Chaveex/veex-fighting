"""VEEX hero v6 - designed from the written description only (no photo):
  mulet prononce, textured brown hair, discreet moustache, 3-day beard; denim jacket with popped collar over a white crew-neck tee with
  horizontal red + blue stripes; 80s/90s casual (light-wash jeans with rolled cuffs, hi-top sneakers, wrapped fists).
Full 3D skeleton: two-bone IK in 3D with pole vectors (real elbow strikes, hooks, knees), torso twist, pelvis yaw, head look.
Poses are given in the PELVIS frame (x forward, y up, z toward the camera side), in px at scale 1; everything is multiplied by k."""
import math
import numpy as np
from PIL import Image
import render3d as r3
from make_enemy_sprites import mk_ramp
from hero3d import hashn, wobble, rot_y, spec

# v8: colours sampled from the reference photo (public/veex.png): stone-washed denim jacket, white tee with red / blue stripes and a red
# crew neck, dark-brown mullet, sandy moustache + stubble, grey-blue eyes. Jeans are a dark rinse so the legs read apart from the jacket.
PAL = {'skin': '#e8a888', 'hair': '#4e2a1c', 'beard': '#a08066', 'denim': '#5276a8', 'jeans': '#3a4478', 'white': '#f4f0f3', 'red': '#d23a3c', 'blue': '#3c52c0',
       'shoe': '#f3f0f7', 'gum': '#e2d6bd', 'dark': '#231b35', 'gold': '#d8c6a0', 'leather': '#7a4526', 'iris': '#8cb4d0'}
PAL.update({'pink': '#ff3fa4', 'warmer': '#f7a8d8', 'lip': '#c8325e'})           # only used by the ROXY look
NAMES = list(PAL.keys()); ID = {n: i for i, n in enumerate(NAMES)}
RAMPS = [[tuple(c[:3]) for c in mk_ramp(v)] for v in PAL.values()]
# second playable hero, same skeleton / animation: ROXY - platinum 80s volume hair with a high ponytail + headband, cropped teal windbreaker,
# hot-pink sports crop top (midriff), deep-violet leggings, fuzzy leg warmers, white hi-tops, pink hand wraps. Palette swap by ramp name.
ROXY_PAL = dict(PAL, skin='#f0b48e', hair='#f4d98a', denim='#2cbfc4', jeans='#43307a', red='#ff3fa4', blue='#ff3fa4', iris='#4fae86',
                gold='#ffffff', leather='#ff3fa4')
LOOKS = {'veex': RAMPS, 'roxy': [[tuple(c[:3]) for c in mk_ramp(v)] for v in ROXY_PAL.values()]}
STYLE = dict(bands=4, outline_w=1, colored_outline=False, rim_k=0.55, cast_shadow=True)

def unit(v): v = np.asarray(v, float); return v / (np.linalg.norm(v) + 1e-9)
def ik3(root, target, l1, l2, pole):
    d = target - root; dist = np.linalg.norm(d); mx = l1 + l2 - 0.05
    if dist > mx: target = root + d * (mx / dist); d = target - root; dist = mx
    dist = max(dist, 0.6); u = d / dist
    a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist); h = math.sqrt(max(0.0, l1 * l1 - a * a))
    p = pole - u * float(np.dot(pole, u)); n = np.linalg.norm(p)
    if n < 1e-6: p = np.cross(u, [0, 0, 1.0]); n = np.linalg.norm(p) + 1e-9
    return root + u * a + (p / n) * h, target

def sample_noise(pos, s): return hashn(pos * s)

class Hero6:
    def __init__(self, k=1.26, head=1.14, fs=128, look='veex'):
        self.k, self.hs, self.FS = k, head, fs; self.OX, self.OY = fs // 2, fs - 10
        self.look, self.fem, self.ramps = look, look == 'roxy', LOOKS[look]
        self.L = dict(thigh=16 * k, shin=16 * k, upper=11 * k, fore=10.5 * k, torso=18 * k, neck=14.5 * k)

    # ---------------- shaders ----------------
    def F(self, name, lvl=1): return r3.flat(ID[name], lvl)
    def skin(self, lvl=1):
        def sh(q, n, pos):
            N = n.shape[1]; s = spec(n, 40); return np.full(N, ID['skin'], np.int16), np.where(s > 0.72, 0, lvl).astype(np.int8), None
        return sh
    def cloth(self, name, lvl=1, fold=0.25, wash=False):
        def sh(q, n, pos):
            N = n.shape[1]; h = hashn(pos); lv = np.where(h > 0.93, max(0, lvl - 1), lvl).astype(np.int8)
            if wash:   # faded denim: lighter patches where the fabric is worn
                w = np.sin(pos[0] * 0.55 + pos[1] * 0.35) + np.sin(pos[1] * 0.8 - pos[2] * 0.5); lv = np.where((w > 1.15) & (lvl > 0), lvl - 1, lv).astype(np.int8)
            return np.full(N, ID[name], np.int16), lv, None, wobble(n, pos, fold, 0.8, 0.9, 0.9)
        return sh
    def hair(self, strand=1.0):
        def sh(q, n, pos):
            N = n.shape[1]; s = np.sin(pos[2] * 2.6 + pos[1] * 0.7) + 0.8 * np.sin(pos[1] * 2.1 - pos[0] * 0.9 + pos[2] * 1.3) + 0.5 * np.sin(pos[0] * 3.1 + pos[2] * 1.7)
            sp = spec(n, 22); lvl = np.where(s > 1.25, 0, np.where(s < -0.55, 2, 1)).astype(np.int8); lvl = np.where(sp > 0.74, 0, lvl).astype(np.int8)
            lvl = np.where(hashn(pos * 1.3) > 0.92, 0, lvl).astype(np.int8); return np.full(N, ID['hair'], np.int16), lvl, None
        return sh
    def tee(self):
        if self.fem:
            def shf(q, n, pos):
                N = q.shape[1]; rid = np.full(N, ID['red'], np.int16); lvl = np.ones(N, np.int8)
                trim = (q[1] < -0.55) | ((q[1] > 0.62) & (q[1] < 0.74)); rid[trim] = ID['white']
                rid[(q[1] >= 0.74) & (q[0] > 0.1)] = ID['skin']
                return rid, lvl, None, wobble(n, pos, 0.10, 0.8, 0.9, 0.9)
            return shf
        def sh(q, n, pos):
            N = q.shape[1]; cols = np.array([ID['white'], ID['red'], ID['white'], ID['blue']]); band = (np.floor((pos[1] + 40) / 2.4).astype(int)) % 4
            rid = cols[band].astype(np.int16); lvl = np.ones(N, np.int8)
            rim = (q[1] > 0.78) & (q[1] < 0.92) & (q[0] > 0.1); rid[rim] = ID['red']; lvl[rim] = 1            # red ribbed crew neck (photo)
            rid[(q[1] >= 0.92) & (q[0] > 0.1)] = ID['skin']
            return rid, lvl, None, wobble(n, pos, 0.12, 0.8, 0.9, 0.9)
        return sh
    def jacket(self):
        fem = self.fem
        def sh(q, n, pos):
            qf, qu, qs = q; N = qf.shape[0]; wedge = (0.30 if fem else 0.40) + 0.18 * np.clip(qu, 0, 1)
            discard = ((qf > 0.0) & (np.abs(qs) < wedge)) | (qu < (-0.25 if fem else -0.82))
            rid = np.full(N, ID['denim'], np.int16); lvl = np.ones(N, np.int8); w = np.sin(pos[0] * 0.55 + pos[1] * 0.35) + np.sin(pos[1] * 0.8 - pos[2] * 0.5); lvl[w > 1.2] = 0
            lvl[hashn(pos) > 0.94] = 0
            edge = (qf > 0) & (np.abs(np.abs(qs) - wedge) < 0.075); lvl[edge] = 0
            thread = (qf > 0) & (np.abs(np.abs(qs) - wedge - 0.11) < 0.022); rid[thread] = ID['gold']; lvl[thread] = 2
            yoke = (np.abs(qu - 0.62) < 0.03) & (qf > -0.2); rid[yoke] = ID['gold']; lvl[yoke] = 2                       # yoke stitching
            band = (qu < -0.62) & (qu > -0.82); lvl[band] = 2; hem = (qu < -0.60) & (qu > -0.64); lvl[hem] = 0             # waistband
            if fem:                                                                                                    # windbreaker: pink chevron panel + white piping
                chev = (np.abs(qu - 0.18 + 0.35 * np.abs(qs)) < 0.12) & (qf > -0.3); rid[chev] = ID['pink']; lvl[chev] = 1
                pipe = np.abs(qu + 0.18) < 0.05; rid[pipe] = ID['white']; lvl[pipe] = 1
            for sgn in (() if fem else (1, -1)):
                pk = (qf > 0.10) & (qs * sgn > 0.50) & (qs * sgn < 0.90) & (qu > 0.12) & (qu < 0.52); lvl[pk] = 0         # two chest pockets
                fl = pk & (qu > 0.42); lvl[fl] = 2
                bt = (np.abs(qs * sgn - 0.70) < 0.06) & (np.abs(qu - 0.43) < 0.05) & (qf > 0.1); rid[bt] = ID['gold']; lvl[bt] = 1
            for b in (() if fem else (-0.05, 0.22)):   # front buttons on the placket
                bt = (np.abs(np.abs(qs) - wedge - 0.02) < 0.06) & (np.abs(qu - b) < 0.05) & (qf > 0.1); rid[bt] = ID['gold']; lvl[bt] = 1
            seam = (np.abs(np.abs(qs) - 0.95) < 0.022) & (qf < 0.2); lvl[seam] = 3
            lvl = np.where(discard, -1, lvl).astype(np.int8); return rid, lvl, None, wobble(n, pos, 0.30, 0.75, 0.85, 0.9)
        return sh
    def jeans(self):
        def sh(q, n, pos):
            N = n.shape[1]; h = hashn(pos); lvl = np.where(h > 0.93, 0, 1).astype(np.int8); w = np.sin(pos[1] * 0.9 + pos[0] * 0.6) + np.sin(pos[2] * 1.3 + pos[1] * 0.4)
            lvl = np.where(w > 1.2, 0, lvl).astype(np.int8); return np.full(N, ID['jeans'], np.int16), lvl, None, wobble(n, pos, 0.22, 0.9, 1.0, 0.9)
        return sh
    def shoe(self):
        def sh(q, n, pos):
            N = q.shape[1]; rid = np.full(N, ID['shoe'], np.int16); lvl = np.ones(N, np.int8)
            cap = (q[0] > 0.52) & (q[1] < 0.42); rid[cap] = ID['red']                                                    # red toe cap (80s high-tops)
            lace = (q[1] > 0.45) & (np.abs(q[2]) < 0.55) & (np.mod(q[0] * 5.0, 1.0) < 0.34); rid[lace] = ID['dark']
            gum = q[1] < -0.52; rid[gum] = ID['gum']; lvl[gum] = 1
            return rid, lvl, None
        return sh
    def fist(self):
        def sh(q, n, pos):
            N = n.shape[1]; rid = np.full(N, ID['white'], np.int16); lvl = np.ones(N, np.int8); band = (np.floor((q[0] + 1) * 2.4).astype(int)) % 4; rid[band == 1] = ID['red']; lvl[q[1] > 0.55] = 0
            return rid, lvl, None
        return sh

    def head_shader(self, hc, ax, rad):
        fem = self.fem
        def sh(q, n, pos):
            d = pos - hc[:, None]; qf, qu, qs = np.stack([(d * ax[i][:, None]).sum(0) / rad[i] for i in range(3)]); N = qf.shape[0]
            rid = np.full(N, ID['skin'], np.int16); lvl = np.ones(N, np.int8); front = qf > 0.30
            for sg in (-1, 1):
                ex = 0.36 * sg
                wh = front & (((qs - ex) / 0.21) ** 2 + ((qu - 0.10) / 0.12) ** 2 < 1); rid[wh] = ID['white']
                ir = front & (((qs - ex * 0.93) / 0.11) ** 2 + ((qu - 0.10) / 0.11) ** 2 < 1); rid[ir] = ID['iris']
                pu = front & (((qs - ex * 0.93) / 0.055) ** 2 + ((qu - 0.10) / 0.06) ** 2 < 1); rid[pu] = ID['dark']
                lid = front & (np.abs(qu - 0.21) < 0.028) & (np.abs(qs - ex) < 0.22); rid[lid] = ID['hair']; lvl[lid] = 2
            brow = front & (np.abs(qu - (0.31 + (0.10 if fem else 0.03) * (np.abs(qs) - 0.3))) < (0.045 if fem else 0.085)) & (np.abs(qs) > 0.10) & (np.abs(qs) < 0.60); rid[brow] = ID['hair']; lvl[brow] = 2
            if fem:
                for sg in (-1, 1):   # lashes: thick upper lid flicked outward
                    lash = front & (np.abs(qu - 0.21 - 0.25 * np.clip(np.abs(qs) - 0.50, 0, 1)) < 0.04) & (np.abs(qs - 0.36 * sg) < 0.26); rid[lash] = ID['dark']; lvl[lash] = 1
                blush = front & (((np.abs(qs) - 0.50) / 0.14) ** 2 + ((qu + 0.20) / 0.10) ** 2 < 1); lvl[blush] = 2
                lips = front & (((qu + 0.50) / 0.07) ** 2 + (qs / 0.21) ** 2 < 1); rid[lips] = ID['lip']; lvl[lips] = np.where(qu[lips] > -0.50, 1, 2)
            else:
                low = front & (qu < -0.22)                                                                              # 3-day stubble: light speckle on cheeks, jaw and chin
                sp = hashn(pos * 1.9) > (0.80 - 0.35 * np.clip(-0.30 - qu, 0, 1)); st = low & sp & (qu < -0.30); rid[st] = ID['beard']; lvl[st] = 2   # light stubble, denser on the jaw
                tash = front & (qu < -0.33) & (qu > -0.47) & (np.abs(qs) < 0.36 - (-0.33 - qu) * 0.9); rid[tash] = ID['beard']; lvl[tash] = 2   # discreet sandy moustache
                mouth = front & (np.abs(qu + 0.52) < 0.035) & (np.abs(qs) < 0.20); rid[mouth] = ID['skin']; lvl[mouth] = 4
            nose_sh = front & (qu < -0.24) & (qu > -0.31) & (np.abs(qs) < 0.14); lvl[nose_sh] = 3
            return rid, lvl, None
        return sh
    def hair_shell(self, cond):
        base = self.hair()
        def sh(q, n, pos):
            r = base(q, n, pos); keep = cond(q); return r[0], np.where(keep, r[1], -1).astype(np.int8), None
        return sh

    def mullet(self, sc, hc, hax, wind):
        k, hs = self.k, self.hs
        for sg in (1, -1): sc.ell(hc + hax[2] * sg * 7.6 * k * hs + hax[1] * 1.2 * k * hs - hax[0] * 1.2 * k * hs, hax, (2.6 * k * hs, 3.4 * k * hs, 1.6 * k * hs), self.hair(), 'sideburn%d' % sg)
        wx, wy = wind
        a0 = hc - hax[0] * 5.0 * k * hs - hax[1] * 3.6 * k * hs
        # v8 (photo): the mullet stops on the shoulders in thick wavy locks whose tips flick outward / back
        a1 = hc - hax[0] * (6.8 - wx) * k * hs - hax[1] * (9.0 - wy) * k * hs
        a2 = hc - hax[0] * (7.4 - wx * 1.4) * k * hs - hax[1] * (15.5 - wy * 1.6) * k * hs
        for off, r0 in ((0.0, 4.0), (2.6, 3.3), (-2.6, 3.3), (1.3, 2.7), (-1.3, 2.7), (4.6, 2.4), (-4.6, 2.4)):
            o = hax[2] * off * k * hs; tip = a2 + o * 1.5 - hax[0] * 1.0 * k * hs + hax[1] * (0.4 + 0.15 * abs(off)) * k * hs
            sc.chain(a0 + o, a1 + o * 1.25, r0 * k * hs, r0 * 0.92 * k * hs, lambda t: self.hair(), 'm1_%s' % off)
            sc.chain(a1 + o * 1.25, tip, r0 * 0.92 * k * hs, 1.9 * k * hs, lambda t: self.hair(), 'm2_%s' % off)

    def roxy_hair(self, sc, hc, hax, wind):
        """80s volume: big side curls to the jaw, pink headband, high ponytail with a scrunchie that trails the head motion"""
        u = self.k * self.hs
        for sg in (1, -1):
            sc.ell(hc + hax[2] * sg * 7.4 * u - hax[1] * 1.2 * u - hax[0] * 2.0 * u, hax, (3.4 * u, 6.2 * u, 2.4 * u), self.hair(), 'curl%d' % sg)   # feathered side volume to the jaw
        def band_sh(q, n, pos):
            N = q.shape[1]; keep = np.abs(q[1] - 0.52 + 0.25 * q[0]) < 0.10
            return np.full(N, ID['pink'], np.int16), np.where(keep, 1, -1).astype(np.int8), None
        sc.ell(hc + hax[1] * 1.0 * u - hax[0] * 0.4 * u, hax, (9.9 * u, 12.3 * u, 9.4 * u), band_sh, 'headband')
        wx, wy = float(np.clip(wind[0], -3, 3)), float(np.clip(wind[1], -3, 4))
        a0 = hc - hax[0] * 6.4 * u + hax[1] * 7.6 * u
        sc.sphere(a0, 2.9 * u, self.F('pink', 1), 'scrunchie')
        B = unit(np.array([-1.0, 0.0, 0.0]) * 0.75 - hax[0] * 0.45); U = np.array([0.0, 1.0, 0.0])   # hangs toward the screen-back, not the head-back
        a1 = a0 + B * (9.0 - wx * 0.6) * u + U * (1.5 + wy * 0.5) * u          # springs out of the scrunchie...
        a2 = a1 + B * (3.2 - wx * 0.8) * u - U * (7.5 - wy * 1.0) * u          # ...then falls, and the tip whips last
        a3 = a2 + B * (0.6 - wx * 1.0) * u - U * (6.0 - wy * 1.1) * u
        for off, r0 in ((0.0, 3.2), (1.4, 2.4), (-1.4, 2.4)):
            o = hax[2] * off * u
            sc.chain(a0 + o * 0.5, a1 + o, r0 * u, r0 * 1.05 * u, lambda t: self.hair(), 'pt1_%s' % off)
            sc.chain(a1 + o, a2 + o, r0 * 1.05 * u, r0 * 0.8 * u, lambda t: self.hair(), 'pt2_%s' % off)
            sc.chain(a2 + o, a3 + o * 0.6, r0 * 0.8 * u, 0.9 * u, lambda t: self.hair(), 'pt3_%s' % off)

    # ---------------- skeleton + scene ----------------
    def build(self, P, wind=(0.0, 0.0)):
        k, L, hs, fem = self.k, self.L, self.hs, self.fem
        SW = 7.0 if fem else 7.8                      # shoulder half-width
        lw = 0.88 if fem else 1.0                     # limb thickness
        yb, yu, yh = math.radians(P['yb']), math.radians(P['yb'] + P['twist']), math.radians(P['yh'])
        Wb = lambda v: rot_y(np.asarray(v, float) * k, yb); Wu = lambda v: rot_y(np.asarray(v, float) * k, yu)
        Vb = lambda v: rot_y(unit(v), yb); Vu = lambda v: rot_y(unit(v), yu)
        pit = P['pitch']; su = np.array([math.sin(pit), math.cos(pit), 0.0]); fw = np.array([math.cos(pit), -math.sin(pit), 0.0]); sd = np.array([0.0, 0.0, 1.0])
        hipL = np.array([P['hx'], P['hy'], 0.0]); chestL = hipL + su * (L['torso'] / k)
        sc = r3.Scene(); axb = np.array([Vb(fw), Vb(su), Vb(sd)]); axu = np.array([Vu(fw), Vu(su), Vu(sd)])
        ab_c, ch_c = hipL + su * (L['torso'] / k) * 0.30, hipL + su * (L['torso'] / k) * 0.70
        # --- torso: jeans pelvis + belt, tee under-layer, denim jacket shell open in front ---
        if fem:   # high-waist leggings, bare midriff, crop top with a bust, cropped open windbreaker
            sc.ell(Wb(hipL + su * 1.6), axb, (5.6 * k, 5.8 * k, 6.9 * k), self.jeans(), 'pelvis')
            sc.ell(Wb(hipL + su * 4.0), axb, (5.3 * k, 1.0 * k, 6.2 * k), self.F('pink', 1), 'belt')
            sc.ell(Wu(ab_c), axu, (4.5 * k, 6.2 * k, 5.6 * k), self.skin(), 'midriff'); sc.ell(Wu(ch_c + su * 0.6), axu, (5.2 * k, 5.4 * k, 6.6 * k), self.tee(), 'tee_ch')
            for z in (2.6, -2.6): sc.ell(Wu(ch_c + fw * 3.4 + sd * z + su * 0.2), axu, (2.6 * k, 2.9 * k, 2.9 * k), self.tee(), 'bust')
            sc.ell(Wu(ch_c + su * 0.8), axu, (6.3 * k, 6.4 * k, 7.6 * k), self.jacket(), 'jk_ch')
        else:
            sc.ell(Wb(hipL + su * 1.6), axb, (5.9 * k, 5.6 * k, 6.9 * k), self.jeans(), 'pelvis')
            sc.ell(Wb(hipL + su * 3.4), axb, (6.3 * k, 1.1 * k, 7.2 * k), self.F('leather', 1), 'belt'); sc.sphere(Wb(hipL + su * 3.4 + fw * 6.0) + Vb(sd) * 0.0, 1.5 * k, self.F('gold', 1), 'buckle')
            sc.ell(Wu(ab_c), axu, (5.3 * k, 6.4 * k, 6.5 * k), self.tee(), 'tee_ab'); sc.ell(Wu(ch_c), axu, (5.9 * k, 6.6 * k, 7.9 * k), self.tee(), 'tee_ch')
            sc.ell(Wu(ab_c), axu, (6.4 * k, 7.0 * k, 7.5 * k), self.jacket(), 'jk_ab'); sc.ell(Wu(ch_c), axu, (7.0 * k, 7.2 * k, 8.8 * k), self.jacket(), 'jk_ch')
            sw = float(np.clip(wind[0] * 0.7, -3, 3))
            sc.ell(Wb(hipL - fw * (5.8 - sw * 0.6) - su * 2.4), axb, (1.8 * k, 4.4 * k, 5.8 * k), self.cloth('denim', 2), 'hem_back')
        shL = chestL - su * 2.3
        for z, part in ((SW, 'shN'), (-SW, 'shF')): sc.sphere(Wu(shL + sd * z), (4.3 if fem else 4.7) * k, self.cloth('denim', 1, 0.2, True), part)
        # --- head frame ---
        a = pit + math.radians(P['hp']) ; fh0 = np.array([math.cos(a), -math.sin(a), 0.0]); uh0 = np.array([math.sin(a), math.cos(a), 0.0])
        rr = math.radians(P['hr']); s0 = sd.copy(); uh1 = uh0 * math.cos(rr) + s0 * math.sin(rr); s1 = -uh0 * math.sin(rr) + s0 * math.cos(rr)
        hax = np.array([rot_y(fh0, yh), rot_y(uh1, yh), rot_y(s1, yh)])
        neckdir = np.array([math.sin(pit + math.radians(P['hp']) * 0.5), math.cos(pit + math.radians(P['hp']) * 0.5), 0.0])
        headL = chestL + neckdir * (L['neck'] / k); hc = Wu(headL)
        sc.chain(Wu(chestL - su * 1.2), Wu(headL - neckdir * 7.8), (3.3 if fem else 3.9) * k, (2.9 if fem else 3.4) * k, lambda t: self.skin(2), 'neck')
        for sgn in (1, -1):   # popped collar: two wings + a standing back collar
            c_ = Wu(chestL + su * 1.0 - fw * 0.4 + sd * sgn * 4.3)
            ax = np.array([Vu(fw * 0.4 + su * 0.6 + sd * sgn * 0.3), Vu(su - fw * 0.25), Vu(sd * sgn + fw * 0.45)])
            sc.ell(c_, ax, (2.6 * k, 3.9 * k, 1.0 * k), self.cloth('denim', 0 if sgn > 0 else 1, 0.15, True), 'collar%d' % sgn)
        sc.ell(Wu(chestL + su * 1.6 - fw * 3.6), axu, (1.4 * k, 3.6 * k, 5.0 * k), self.cloth('denim', 2), 'collarB')
        rad = np.array([8.4, 10.6, 8.0]) * k * hs; shade = self.head_shader(hc, hax, rad)
        sc.ell(hc, hax, tuple(rad), shade, 'head')
        if fem: sc.ell(hc + hax[0] * 1.6 * k * hs - hax[1] * 5.2 * k * hs, hax, (6.2 * k * hs, 4.6 * k * hs, 5.8 * k * hs), shade, 'jaw')     # soft pointed chin
        else: sc.ell(hc + hax[0] * 1.8 * k * hs - hax[1] * 6.0 * k * hs, hax, (6.6 * k * hs, 4.8 * k * hs, 6.9 * k * hs), shade, 'jaw')       # square jaw
        for sg in (1, -1): sc.sphere(hc + hax[0] * 4.6 * k * hs - hax[1] * 2.4 * k * hs + hax[2] * sg * 5.4 * k * hs, 2.3 * k * hs, shade, 'cheek%d' % sg)
        sc.ell(hc + hax[0] * 7.0 * k * hs + hax[1] * 3.3 * k * hs, hax, (2.6 * k * hs, 1.0 * k * hs, 6.4 * k * hs), shade, 'brow')
        nr = 0.8 if fem else 1.0
        sc.chain(hc + hax[0] * 8.0 * k * hs + hax[1] * 1.6 * k * hs, hc + hax[0] * (9.4 - 0.6 * fem) * k * hs - hax[1] * 1.3 * k * hs, 1.5 * nr * k * hs, 1.7 * nr * k * hs, lambda t: shade, 'nose')
        for sg in (1, -1): sc.ell(hc + hax[2] * sg * 7.9 * k * hs - hax[1] * 0.4 * k * hs - hax[0] * 0.8 * k * hs, hax, (1.0 * k * hs, 2.5 * k * hs, 1.4 * k * hs), self.skin(2), 'ear%d' % sg)
        # --- hair: textured top with a feathered fringe, short sides over the ears, LONG mullet at the back ---
        if fem:
            top = lambda q: ((q[1] > 0.30) & (q[0] < 0.60)) | (q[0] < -0.28) | ((np.abs(q[2]) > 0.78) & (q[1] > -0.05) & (q[0] < 0.05))
        else:   # v8 (photo): higher hairline (forehead visible), sides puffed over the ears
            top = lambda q: ((q[1] > 0.42) & (q[0] < 0.62)) | (q[0] < -0.28) | ((np.abs(q[2]) > 0.72) & (q[1] > -0.42) & (q[0] < 0.18))
        sc.ell(hc + hax[0] * -0.6 * k * hs + hax[1] * 1.0 * k * hs, hax, (9.4 * k * hs, 11.9 * k * hs, 8.9 * k * hs) if fem else (9.6 * k * hs, 12.0 * k * hs, 9.5 * k * hs),
               self.hair_shell(top), 'hairshell')
        if fem: sc.ell(hc + hax[1] * 4.6 * k * hs - hax[0] * 0.6 * k * hs, hax, (8.0 * k * hs, 7.0 * k * hs, 8.0 * k * hs), self.hair(), 'crown')
        else: sc.ell(hc + hax[1] * 6.2 * k * hs - hax[0] * 1.2 * k * hs, hax, (8.8 * k * hs, 7.4 * k * hs, 8.6 * k * hs), self.hair(), 'crown')   # textured volume on top
        for i in range(6):
            t = i / 5; sg = -1 + 2 * t
            base = hc + hax[0] * (6.6 - 1.0 * abs(sg)) * k * hs + hax[1] * (8.2 - 0.8 * abs(sg)) * k * hs + hax[2] * sg * 5.4 * k * hs
            if fem or abs(sg) > 0.9:   # fringe locks falling on the forehead / temples
                sc.chain(base, base + hax[0] * 1.6 * k * hs - hax[1] * 2.6 * k * hs + hax[2] * sg * 0.6 * k * hs, 1.9 * k * hs, 0.9 * k * hs, lambda tt: self.hair(), 'lock%d' % i)
            else:                      # v8: front swept up and back into the volume
                b2 = base + hax[1] * 0.8 * k * hs
                sc.chain(b2, b2 + hax[0] * 0.6 * k * hs + hax[1] * 2.6 * k * hs + hax[2] * sg * 0.8 * k * hs, 2.2 * k * hs, 1.0 * k * hs, lambda tt: self.hair(), 'lock%d' % i)
        if fem: self.roxy_hair(sc, hc, hax, wind)
        else: self.mullet(sc, hc, hax, wind)
        # --- arms: near (camera side, +z) and far ---
        shoulders = {'N': Wu(shL + sd * SW), 'F': Wu(shL - sd * SW)}
        for tag, hand, pole in (('F', P['fh'], P['fe']), ('N', P['nh'], P['ne'])):
            sh_w = shoulders[tag]; el, hd = ik3(sh_w, Wb(hand), L['upper'], L['fore'], Vb(pole)); dirv = unit(hd - el)
            if fem:   # rolled-up sleeves, bare forearms
                cuff = 0.60
                sc.chain(sh_w, sh_w + (el - sh_w) * cuff, 4.5 * lw * k, 3.9 * lw * k, lambda t: self.cloth('denim', 1, 0.22, True), 'sleeve' + tag)
                sc.chain(sh_w + (el - sh_w) * (cuff - 0.05), sh_w + (el - sh_w) * (cuff + 0.06), 4.1 * lw * k, 4.1 * lw * k, lambda t: self.cloth('denim', 0), 'cuff' + tag)
                sc.chain(sh_w + (el - sh_w) * (cuff + 0.03), el, 3.5 * lw * k, 3.1 * lw * k, lambda t: self.skin(), 'bicep' + tag); sc.sphere(el, 3.3 * lw * k, self.skin(), 'elbow' + tag)
            else:     # v8 (photo): full-length denim sleeves, buttoned cuff at the wrist
                sc.chain(sh_w, el, 4.6 * k, 4.0 * k, lambda t: self.cloth('denim', 1, 0.24, True), 'sleeve' + tag); sc.sphere(el, 4.0 * k, self.cloth('denim', 1, 0.24, True), 'elbow' + tag)
            w0 = 0.55 if fem else 0.50
            for i in range(14):
                t = i / 13; r_ = (3.1 + 0.55 * math.sin(math.pi * min(1, t * 1.3)) - 0.75 * t) * lw * k + (0.35 * k if t > w0 else 0)
                band = int((t - w0) / 0.12) if t > w0 else -1
                if t <= w0 and not fem: sh_ = self.cloth('denim', 0 if t > 0.36 else 1, 0.2, True); r_ += (0.9 if t > 0.36 else 0.7) * k   # sleeve + cuff
                else: sh_ = self.skin() if t <= w0 else (self.F('red', 1) if band in (1, 3) else self.F('white', 1))
                sc.sphere(el + (hd - el) * t, r_, sh_, 'fore' + tag)
            up = np.cross([0, 0, 1.0], dirv); up = unit(up) if np.linalg.norm(up) > 1e-6 else np.array([0, 1.0, 0]); third = np.cross(dirv, up)
            fc = hd + dirv * 1.3 * k; sc.ell(fc, np.array([dirv, up, third]), (4.3 * k * 1.1, 3.5 * k * 1.1, 3.7 * k * 1.1), self.fist(), 'fist' + tag)
            for j in range(4): sc.sphere(fc + dirv * 3.6 * k * 1.1 + up * (1.9 - j * 1.25) * k * 1.1, 1.25 * k * 1.1, self.F('white', 0 if j % 2 else 1), 'kn%s%d' % (tag, j))
            sc.chain(fc + up * 2.6 * k + dirv * 0.8 * k, fc + up * 3.0 * k + dirv * 2.8 * k, 1.5 * k * 1.1, 1.2 * k * 1.1, lambda t: self.F('white', 1), 'thumb' + tag)
        # --- legs: jeans with a rolled cuff, hi-top sneakers ---
        fwd_world = rot_y(np.array([1.0, 0.0, 0.0]), yb)
        for tag, zh, foot, pole in (('F', -3.6, P['ff'], P['fk']), ('N', 3.6, P['nf'], P['nk'])):
            hp_w = Wb(np.array([P['hx'], P['hy'], zh])); kn, an = ik3(hp_w, Wb(foot), L['thigh'], L['shin'], Vb(pole))
            sc.sphere(hp_w, 5.0 * k, self.jeans(), 'glute' + tag)
            lg = 0.86 if fem else 1.0
            for i in range(16):
                t = i / 15; sc.sphere(hp_w + (kn - hp_w) * t, (5.5 - 1.5 * t) * lg * k, self.jeans(), 'thigh' + tag)
            sc.sphere(kn, 3.9 * lg * k, self.cloth('jeans', 1 if fem else 0), 'knee' + tag)
            for i in range(14):
                t = i / 13
                if fem and t > 0.42:   # slouchy fuzzy leg warmers
                    sc.sphere(kn + (an - kn) * t, (3.9 + 0.5 * math.sin(t * 19.0)) * k, self.cloth('warmer', 1, 0.45), 'warmer' + tag)
                else: sc.sphere(kn + (an - kn) * t, (4.0 - 0.7 * t + 0.35 * math.sin(math.pi * min(1, t * 1.6))) * lg * k, self.jeans(), 'shin' + tag)
            if not fem: sc.chain(kn + (an - kn) * 0.86, an + unit(kn - an) * 1.5 * k, 3.9 * k, 3.9 * k, lambda t: self.cloth('jeans', 0, 0.1), 'cuff' + tag)   # rolled cuff
            V = unit(kn - an); U = unit(fwd_world - V * float(np.dot(fwd_world, V))); S3 = np.cross(U, V); ax = np.array([U, V, S3])
            P3 = lambda du, dv: an + U * du * k + V * dv * k
            sc.ell(P3(1.6, -2.7), ax, (7.2 * k, 1.05 * k, 3.7 * k), self.F('gum', 1), 'sole' + tag)
            sc.ell(P3(-2.4, -0.8), ax, (3.1 * k, 3.1 * k, 3.4 * k), self.shoe(), 'heel' + tag); sc.ell(P3(1.4, -0.7), ax, (4.6 * k, 3.0 * k, 3.6 * k), self.shoe(), 'mid' + tag)
            sc.ell(P3(5.2, -1.1), ax, (3.8 * k, 2.5 * k, 3.4 * k), self.shoe(), 'toe' + tag)
            sc.chain(P3(0.0, 1.0), P3(-0.3, 5.6), 3.4 * k, 3.2 * k, lambda t: self.F('shoe', 1), 'shaft' + tag); sc.sphere(P3(-0.3, 6.0), 3.3 * k, self.F('red', 2), 'collarS' + tag)
        return sc

    def render(self, P, wind=(0.0, 0.0)):
        sc = self.build(P, wind); body, rim, _ = r3.render(sc, self.ramps, self.FS, self.FS, self.OX, self.OY, style=STYLE)
        return Image.fromarray(body, 'RGBA'), Image.fromarray(rim, 'RGBA')

"""3D characters for the 24 enemies / bosses, same engine + look as the hero (tools/hero3d.py, render3d.py), driven by the ROSTER specs
of tools/make_enemy_sprites.py: body type (jacket / suit / tank / varsity / armor), legs (pants / shorts / tights / robot), sleeves, shoes,
procedural 3D heads (mohawk, cap, headphones, helmet, beanie, bandana, shades, slick, visor, robot, crt, blonde) with painted faces."""
import math
import numpy as np
from PIL import Image
import render3d as r3
from make_enemy_sprites import mk_ramp
from hero3d import spec, hashn, wobble, rot_y, ik, LIGHT

STYLE_B = dict(bands=4, outline_w=1, colored_outline=False, rim_k=0.55, cast_shadow=True)
RAMP_KEYS = ['skin', 'hair', 'jacket', 'sleeve', 'tee0', 'tee1', 'pants', 'trim', 'shoe', 'wrap', 'accent', 'hat', 'metal', 'dark', 'white', 'gold']

class Char3D:
    def __init__(self, sp, eu):
        self.sp = sp; self.S = sp.get('S', 1.0); self.k = self.S * eu; k = self.k
        self.FS = 128 if k <= 1.40 else 160 if k <= 1.85 else 192
        self.OX, self.OY = self.FS // 2, self.FS - 10
        src = {'skin': sp.get('skin', '#e2a887'), 'hair': sp.get('hair', '#2a1a12'), 'jacket': sp.get('jacket', '#333344'), 'sleeve': sp.get('sleeve', sp.get('jacket', '#333344')),
               'tee0': sp.get('tee0', '#dddddd'), 'tee1': sp.get('tee1', '#888888'), 'pants': sp.get('pants', '#223355'), 'trim': sp.get('trim', '#ff2fd0'),
               'shoe': sp.get('shoe', '#eeeeee'), 'wrap': sp.get('wrap', '#dd3344'), 'accent': sp.get('accent', '#ff2fd0'), 'hat': sp.get('hat', '#ff2fd0'),
               'metal': sp.get('metal', sp.get('skin', '#8a94a8')), 'dark': '#1c1830', 'white': '#f4eef6', 'gold': '#ffd44a'}
        self.ID = {n: i for i, n in enumerate(RAMP_KEYS)}; self.ramps = [[tuple(c[:3]) for c in mk_ramp(src[n])] for n in RAMP_KEYS]
        big = sp.get('bulk', 1.0); self.big = big
        self.R = {'thigh': 16 * k, 'shin': 16 * k, 'upper': 11 * k, 'fore': 10.5 * k, 'torso': 18 * k, 'neck': 14.5 * k}

    # ---------------- shader factories ----------------
    def F(self, name, lvl=1): return r3.flat(self.ID[name], lvl)
    def skin_sh(self, lvl=1):
        ID = self.ID
        def sh(q, n, pos): N = n.shape[1]; return np.full(N, ID['skin'], np.int16), np.full(N, lvl, np.int8), None
        return sh
    def cloth(self, name, lvl=1, fold=0.25):
        ID = self.ID
        def sh(q, n, pos):
            N = n.shape[1]; h = hashn(pos); lv = np.where(h > 0.94, max(0, lvl - 1), lvl).astype(np.int8)
            return np.full(N, ID[name], np.int16), lv, None, wobble(n, pos, fold, 0.8, 0.9, 0.9)
        return sh
    def metal_sh(self, name='metal', lvl=1):
        ID = self.ID
        def sh(q, n, pos):
            N = n.shape[1]; s = np.clip((n * np.array([0.3, 0.72, 0.62])[:, None] / 1.0).sum(0), 0, 1)
            return np.full(N, ID[name], np.int16), np.full(N, lvl, np.int8), None
        return sh

    def tee_shader(self):
        ID, sp = self.ID, self.sp
        def sh(q, n, pos):
            N = q.shape[1]; band = (np.floor((pos[1] + 40) / 2.6).astype(int)) % 2
            rid = np.where(band == 0, ID['tee0'], ID['tee1']).astype(np.int16); lvl = np.ones(N, np.int8)
            if sp.get('top') == 'suit':
                tie = (np.abs(q[2]) < 0.085) & (q[0] > 0.25) & (q[1] < 0.88); rid[tie] = ID['tee1']; lvl[tie] = 1
                rid[~tie] = ID['tee0']
            rid[(q[1] >= 0.92) & (q[0] > 0.15)] = ID['skin']
            return rid, lvl, None
        return sh

    def jacket_shader(self):
        ID, sp = self.ID, self.sp; suit = sp.get('top') == 'suit'
        def sh(q, n, pos):
            qf, qu, qs = q; N = qf.shape[0]
            wedge = (0.22 if suit else 0.30) + (0.26 if suit else 0.17) * np.clip(qu, 0, 1)
            discard = ((qf > 0.0) & (np.abs(qs) < wedge)) | (qu < -0.80)
            rid = np.full(N, ID['jacket'], np.int16); lvl = np.ones(N, np.int8); h = hashn(pos); lvl[h > 0.94] = 0
            edge = (qf > 0) & (np.abs(np.abs(qs) - wedge) < 0.08); lvl[edge] = 0
            if sp.get('top') == 'varsity': lvl[(np.abs(qs) < 0.05) & (qf < 0)] = 0
            pocket = (qf > 0.10) & (qs > 0.52) & (qs < 0.88) & (qu > -0.05) & (qu < 0.34); lvl[pocket] = 0; lvl[pocket & (qu > 0.26)] = 2
            if 'studs' in sp.get('extras', ()):
                st = (np.abs(np.abs(qs) - 0.80) < 0.07) & (np.abs(qu - 0.72) < 0.05); rid[st] = ID['accent']; lvl[st] = 0
            lvl = np.where(discard, -1, lvl).astype(np.int8)
            return rid, lvl, None, wobble(n, pos, 0.30, 0.75, 0.85, 0.9)
        return sh

    def armor_shader(self):
        ID = self.ID
        def sh(q, n, pos):
            qf, qu, qs = q; N = qf.shape[0]; rid = np.full(N, ID['jacket'], np.int16); lvl = np.ones(N, np.int8)
            seam = (np.abs(np.mod(qu * 3.2 + 0.3, 1.0) - 0.5) > 0.46) | ((np.abs(qs) < 0.045) & (qf > 0)); lvl[seam] = 3
            core = ((qs / 0.22) ** 2 + ((qu - 0.25) / 0.22) ** 2 < 1) & (qf > 0.3); rid[core] = ID['accent']; lvl[core] = 0
            ring = (((qs / 0.30) ** 2 + ((qu - 0.25) / 0.30) ** 2 < 1) & ~core) & (qf > 0.3); rid[ring] = ID['metal']; lvl[ring] = 2
            rim = (qu < -0.6); rid[rim] = ID['metal']
            return rid, lvl, None
        return sh

    def tank_shader(self):
        ID = self.ID
        def sh(q, n, pos):
            qf, qu, qs = q; N = qf.shape[0]; rid = np.full(N, ID['tee0'], np.int16); lvl = np.ones(N, np.int8)
            hem = qu < -0.55; rid[hem] = ID['tee1']
            lvl = np.where(((qu > 0.55) & (np.abs(qs) > 0.52)) | ((qf > 0.3) & (qu > 0.78) & (np.abs(qs) < 0.4)), -1, lvl).astype(np.int8)   # straps + neckline
            return rid, lvl, None, wobble(n, pos, 0.2, 0.8, 0.9, 0.9)
        return sh

    def pelvis_shader(self):
        ID, sp = self.ID, self.sp
        def sh(q, n, pos):
            N = q.shape[1]; rid = np.full(N, ID['pants'], np.int16); lvl = np.ones(N, np.int8)
            wb = q[1] > 0.50; rid[wb] = ID['trim']
            if sp.get('legs') == 'shorts': side = (np.abs(q[2]) > 0.80) & (q[1] <= 0.30); rid[side] = ID['trim']; lvl[side] = 0
            if sp.get('legs') == 'robot': rid[:] = ID['metal']; rid[wb] = ID['dark']
            return rid, lvl, None, wobble(n, pos, 0.18, 0.9, 1.1, 0.8)
        return sh

    def fist_shader(self):
        ID, sp = self.ID, self.sp; robot = sp.get('sleeves') == 'robot'
        def sh(q, n, pos):
            N = n.shape[1]
            if robot: return np.full(N, ID['metal'], np.int16), np.where(q[0] > 0.6, 0, 1).astype(np.int8), None
            rid = np.full(N, ID['wrap'], np.int16); lvl = np.ones(N, np.int8); band = (np.floor((q[0] + 1) * 2.2).astype(int)) % 4; rid[band == 1] = ID['trim']; lvl[q[1] > 0.55] = 0
            return rid, lvl, None
        return sh

    def shoe_shader(self):
        ID, sp = self.ID, self.sp; st = sp.get('shoe_type', 'sneaker')
        def sh(q, n, pos):
            N = q.shape[1]
            if st == 'barefoot': return np.full(N, ID['skin'], np.int16), np.where(q[1] < -0.5, 2, 1).astype(np.int8), None
            base = ID['metal'] if st in ('robot', 'hover') else ID['shoe']; rid = np.full(N, base, np.int16); lvl = np.ones(N, np.int8)
            stripe = (q[2] > 0.45) & (np.abs(q[1] + 0.05) < 0.40); rid[stripe] = ID['accent'] if st in ('robot', 'hover') else ID['trim']
            lvl[(q[1] < -0.55)] = 2
            return rid, lvl, None
        return sh

    def hair_sh(self, name='hair'):
        ID = self.ID
        def sh(q, n, pos):
            N = n.shape[1]; s = np.sin(pos[1] * 1.5 + pos[2] * 2.3) + 0.7 * np.sin(pos[1] * 3.3 - pos[0] * 1.9)
            return np.full(N, ID[name], np.int16), np.where(s > 1.05, 0, np.where(s < -0.45, 2, 1)).astype(np.int8), None
        return sh

    def face_shader(self, hc, axes, radii):
        ID, sp = self.ID, self.sp; hs = sp['head']; shades = hs in ('shades',) or sp.get('shades'); visor = hs == 'visor'
        robot = hs == 'robot'; crt = hs == 'crt'
        def sh(q, n, pos):
            d = pos - hc[:, None]; ql = np.stack([(d * axes[i][:, None]).sum(0) / radii[i] for i in range(3)]); qf, qu, qs = ql; N = qf.shape[0]
            rid = np.full(N, ID['skin'], np.int16); lvl = np.ones(N, np.int8); front = qf > 0.30
            if robot or crt:
                rid[:] = ID['metal'] if robot else ID['hat']
                if robot:
                    vs = front & (np.abs(qu - 0.10) < 0.22) & (np.abs(qs) < 0.78); rid[vs] = ID['dark']; lvl[vs] = 2
                    gl = vs & (np.abs(qu - 0.10) < 0.06); rid[gl] = ID['accent']; lvl[gl] = 0
                    jaw = front & (qu < -0.30) & (np.mod(np.floor(qu * 14), 2) == 0); lvl[jaw] = 2
                else:
                    sc_ = (qf > 0.12) & (np.abs(qs) < 0.88) & (np.abs(qu) < 0.84); rid[sc_] = ID['dark']; lvl[sc_] = 4
                    for sg in (-1, 1):
                        eye = sc_ & (np.abs(qs - sg * 0.32) < 0.14) & (np.abs(qu - 0.18) < 0.16); rid[eye] = ID['accent']; lvl[eye] = 0
                    grin = sc_ & (np.abs(qu + 0.32 + 0.10 * (np.mod(np.floor(qs * 9), 2))) < 0.07) & (np.abs(qs) < 0.5); rid[grin] = ID['accent']; lvl[grin] = 0
                    lvl[sc_ & (np.mod(np.floor(pos[1] * 1.1), 3) == 0) & ~(rid == ID['accent'])] = 3
                return rid, lvl, None
            for sg in (-1, 1):
                ex = 0.36 * sg
                if visor or shades: continue
                w = front & (((qs - ex) / 0.20) ** 2 + ((qu - 0.08) / 0.12) ** 2 < 1); rid[w] = ID['white']; lvl[w] = 1
                pu = front & (((qs - ex * 0.92) / 0.09) ** 2 + ((qu - 0.07) / 0.10) ** 2 < 1); rid[pu] = ID['dark']; lvl[pu] = 1
            if visor or shades:
                plate = front & (np.abs(qu - 0.08) < 0.17) & (np.abs(qs) < 0.66); rid[plate] = ID['dark']; lvl[plate] = 2
                gl = plate & (np.abs(qu - 0.11) < 0.05) & ((np.abs(qs) < 0.6) if visor else (np.abs(np.abs(qs) - 0.3) < 0.14)); rid[gl] = ID['accent']; lvl[gl] = 0
            else:
                brow = front & (np.abs(qu - (0.28 + 0.24 * (np.abs(qs) - 0.3))) < 0.055) & (np.abs(qs) > 0.10) & (np.abs(qs) < 0.58); rid[brow] = ID['hair']; lvl[brow] = 2
            mouth = front & (np.abs(qu + 0.42) < 0.05) & (np.abs(qs) < 0.24); rid[mouth] = ID['skin']; lvl[mouth] = 4
            if hs == 'blonde':
                lips = front & (np.abs(qu + 0.42) < 0.08) & (np.abs(qs) < 0.22); rid[lips] = ID['accent']; lvl[lips] = 1
            return rid, lvl, None
        return sh

    # ---------------- scene ----------------
    def build(self, p, yaw_b, yaw_h, twist, wind):
        k, sp, ID, R, big = self.k, self.sp, self.ID, self.R, self.big
        P = {a: (v * k if a not in ('lean', 'tilt') else v) for a, v in p.items()}
        yb, yu, yh = math.radians(yaw_b), math.radians(yaw_b + twist), math.radians(yaw_h)
        hx, hy = P['hx'], P['hy']
        su = np.array([math.sin(P['lean']), math.cos(P['lean']), 0.0]); fw = np.array([math.cos(P['lean']), -math.sin(P['lean']), 0.0]); sd = np.array([0.0, 0.0, 1.0])
        def Wb(x, y, z=0.0): v = rot_y(np.array([x - hx, y, z]), yb); return np.array([hx + v[0], v[1], v[2]])
        def Wu(x, y, z=0.0): v = rot_y(np.array([x - hx, y, z]), yu); return np.array([hx + v[0], v[1], v[2]])
        def Vb(v): return rot_y(np.asarray(v, float), yb)
        def Vu(v): return rot_y(np.asarray(v, float), yu)
        sc = r3.Scene(); hip = np.array([hx, hy, 0.0]); chest2 = hip + su * R['torso']
        top, legs, sleeves, shoe_t = sp.get('top', 'jacket'), sp.get('legs', 'pants'), sp.get('sleeves', 'long'), sp.get('shoe_type', 'sneaker')
        axb = np.array([Vb(fw), Vb(su), Vb(sd)]); axu = np.array([Vu(fw), Vu(su), Vu(sd)])
        at_b = lambda b, z=0.0: Wb(b[0], b[1], z); at_u = lambda b, z=0.0: Wu(b[0], b[1], z)
        sc.ell(at_b(hip + su * 1.6 * k), axb, (5.9 * k * big ** 0.5, 5.6 * k, 6.9 * k * big ** 0.6), self.pelvis_shader(), 'pelvis')
        ab_c, ch_c = hip + su * (R['torso'] * 0.30), hip + su * (R['torso'] * 0.70)
        wide = 0.85 + 0.15 * big
        if top in ('jacket', 'suit', 'varsity'):
            sc.ell(at_u(ab_c), axu, (5.3 * k, 6.4 * k, 6.5 * k * wide), self.tee_shader(), 'tee_ab'); sc.ell(at_u(ch_c), axu, (5.9 * k, 6.6 * k, 7.9 * k * wide), self.tee_shader(), 'tee_ch')
            sc.ell(at_u(ab_c), axu, (6.3 * k, 7.0 * k, 7.4 * k * wide), self.jacket_shader(), 'jk_ab'); sc.ell(at_u(ch_c), axu, (6.9 * k, 7.2 * k, 8.7 * k * wide), self.jacket_shader(), 'jk_ch')
        elif top == 'tank':
            sc.ell(at_u(ab_c), axu, (5.6 * k, 6.6 * k, 6.9 * k * wide), self.skin_sh(), 'sk_ab'); sc.ell(at_u(ch_c), axu, (6.3 * k, 6.8 * k, 8.5 * k * wide), self.skin_sh(), 'sk_ch')
            sc.ell(at_u(ab_c), axu, (5.9 * k, 6.9 * k, 7.1 * k * wide), self.tank_shader(), 'tk_ab'); sc.ell(at_u(ch_c), axu, (6.6 * k, 7.1 * k, 8.7 * k * wide), self.tank_shader(), 'tk_ch')
        else:   # armor
            sc.ell(at_u(ab_c), axu, (6.0 * k, 6.9 * k, 7.2 * k * wide), self.armor_shader(), 'ar_ab'); sc.ell(at_u(ch_c), axu, (7.2 * k, 7.3 * k, 9.0 * k * wide), self.armor_shader(), 'ar_ch')
        sw = float(np.clip(wind[0] * 0.7, -3, 3))
        if top in ('jacket', 'suit', 'varsity'): sc.ell(at_b(hip - fw * (5.6 - sw * 0.6) * k - su * 2.2 * k), axb, (1.7 * k, 4.2 * k, 5.6 * k), self.cloth('jacket', 2), 'hem_back')
        shoulder = chest2 - su * 2.3 * k
        for z, part in ((7.6 * k * wide, 'shF'), (-7.6 * k * wide, 'shB')):
            sc.sphere(at_u(shoulder, z), (5.4 if top == 'armor' else 4.6) * k * (big ** 0.4), self.metal_sh('metal', 1) if top == 'armor' else (self.skin_sh() if top == 'tank' else self.cloth('sleeve' if top != 'jacket' else 'jacket', 1)), part)
        ha = P['lean'] + P['tilt']; head2 = np.array([chest2[0] + math.sin(ha) * R['neck'], chest2[1] + math.cos(ha) * R['neck']])
        sc.chain(at_u(chest2 - su * 1.2 * k), at_u(head2 - np.array([math.sin(ha), math.cos(ha)]) * 7.4 * k), 3.8 * k, 3.4 * k, lambda t: (self.metal_sh('metal', 2) if sp['head'] in ('robot', 'crt') else self.skin_sh(2)), 'neck')
        if top in ('jacket', 'suit', 'varsity'):
            for sgn_ in (1, -1):
                c_ = at_u(chest2 + su * 0.9 * k - fw * 0.6 * k, sgn_ * 4.0 * k)
                ax = np.array([Vu(fw * 0.5 + su * 0.5 + sd * sgn_ * 0.35), Vu(su - fw * 0.3), Vu(sd * sgn_ + fw * 0.4)]); ax = ax / np.linalg.norm(ax, axis=1)[:, None]
                sc.ell(c_, ax, (2.4 * k, 3.3 * k, 1.0 * k), self.cloth('jacket', 0 if sgn_ > 0 else 1), 'collar%d' % sgn_)
        if 'chain' in sp.get('extras', ()):
            for ang in np.linspace(-1.1, 1.1, 7):
                sc.sphere(at_u(chest2 - su * (3.0 + 4.5 * (1 - abs(ang) / 1.1)) * k + fw * 6.2 * k * math.cos(ang) * 0.5, 7.0 * k * math.sin(ang) * 0.9), 0.95 * k, self.F('gold', 1), 'chain')
        if 'belt' in sp.get('extras', ()): sc.ell(at_b(hip + su * 3.2 * k), axb, (6.3 * k, 1.3 * k, 7.1 * k), self.F('gold', 1), 'belt')
        if 'scarf' in sp.get('extras', ()):
            wx, wy = wind; a0 = at_u(chest2 + su * 1.5 * k)
            sc.chain(a0, a0 - Vu(fw) * (9 - wx) * k - Vu(su) * (2 - wy * 0.4) * k, 2.4 * k, 1.8 * k, lambda t: self.F('accent', 1), 'scarf1')
            sc.chain(a0 - Vu(fw) * (9 - wx) * k - Vu(su) * (2 - wy * 0.4) * k, a0 - Vu(fw) * (17 - wx * 2) * k - Vu(su) * (6 - wy) * k, 1.8 * k, 1.0 * k, lambda t: self.F('accent', 1), 'scarf2')
        # ---------------- head ----------------
        self.head(sc, P, at_u, head2, ha, sd, yh, k, wind)
        # ---------------- arms ----------------
        for tag, zsh, zh, (tx, ty) in (('B', -7.6 * k * wide, -6.9 * k * wide, (P['hBx'], P['hBy'])), ('F', 7.6 * k * wide, 6.9 * k * wide, (P['hFx'], P['hFy']))):
            e = ik(shoulder[0], shoulder[1], tx, ty, R['upper'], R['fore'], -1); el = np.array([e[0], e[1]]); h2 = np.array([e[2], e[3]])
            S0, E, Hd = at_u(shoulder, zsh), at_u(el, zsh + (zh - zsh) * 0.5), at_u(h2, zh)
            dirv = Hd - E; dirv = dirv / (np.linalg.norm(dirv) + 1e-9)
            if sleeves == 'robot':
                sc.chain(S0, E, 4.0 * k * big ** 0.4, 3.4 * k * big ** 0.4, lambda t: self.metal_sh('metal', 1), 'rua' + tag); sc.sphere(E, 3.6 * k, self.F('dark', 2), 'relb' + tag)
                sc.chain(E, Hd, 3.4 * k * big ** 0.4, 2.7 * k, lambda t: self.metal_sh('jacket', 1) if 0.25 < t < 0.75 else self.metal_sh('metal', 2), 'rfa' + tag)
            else:
                cuff = 0.60 if sleeves in ('short', 'long') else 0.0
                if sleeves == 'long':
                    sc.chain(S0, E, 4.3 * k * big ** 0.3, 3.6 * k, lambda t: self.cloth('sleeve', 1), 'sleeve' + tag); sc.sphere(E, 3.6 * k, self.cloth('sleeve', 1), 'elbow' + tag)
                    sc.chain(E, Hd - dirv * 3.0 * k, 3.6 * k, 3.0 * k, lambda t: self.cloth('sleeve', 1), 'sleeveF' + tag)
                    sc.chain(Hd - dirv * 4.6 * k, Hd - dirv * 2.4 * k, 3.4 * k, 3.4 * k, lambda t: self.F('trim', 1), 'cuffw' + tag)
                elif sleeves == 'short':
                    sc.chain(S0, S0 + (E - S0) * 0.65, 4.4 * k * big ** 0.4, 3.9 * k * big ** 0.4, lambda t: self.cloth('sleeve', 1), 'sleeve' + tag)
                    sc.chain(S0 + (E - S0) * 0.6, E, 3.5 * k * big ** 0.4, 3.1 * k, lambda t: self.skin_sh(), 'bicep' + tag); sc.sphere(E, 3.2 * k, self.skin_sh(), 'elbow' + tag)
                    for i in range(12): t = i / 11; sc.sphere(E + (Hd - E) * t, (3.05 + 0.5 * math.sin(math.pi * min(1, t * 1.3)) - 0.75 * t) * k, self.skin_sh() if t < 0.3 else self.F('wrap', 1), 'fore' + tag)
                else:  # bare / muscular
                    sc.chain(S0, E, 4.5 * k * big ** 0.5, 3.6 * k * big ** 0.4, lambda t: self.skin_sh(), 'bicep' + tag); sc.sphere(E, 3.6 * k * big ** 0.4, self.skin_sh(), 'elbow' + tag)
                    for i in range(12): t = i / 11; sc.sphere(E + (Hd - E) * t, (3.3 + 0.5 * math.sin(math.pi * min(1, t * 1.3)) - 0.85 * t) * k * big ** 0.4, self.skin_sh() if t < 0.3 else self.F('wrap', 1), 'fore' + tag)
            up = np.cross(sd, dirv); up = up / (np.linalg.norm(up) + 1e-9); third = np.cross(dirv, up); fist_ax = np.array([dirv, up, third]); fist_c = Hd + dirv * 1.3 * k
            fs = 1.0 + 0.25 * (big - 1)
            sc.ell(fist_c, fist_ax, (4.3 * k * fs, 3.5 * k * fs, 3.7 * k * fs), self.fist_shader(), 'fist' + tag)
            for j in range(4): sc.sphere(fist_c + dirv * 3.6 * k * fs + up * (1.9 - j * 1.25) * k * fs, 1.25 * k * fs, self.F('metal', 1) if sleeves == 'robot' else self.F('wrap', 0 if j % 2 else 1), 'knuckle%s%d' % (tag, j))
            if 'boombox' in sp.get('extras', ()) and tag == 'F': self.boombox(sc, at_u(shoulder + su * 4.6 * k - fw * 2.5 * k, 9.0 * k * wide), Vu(fw), Vu(su), Vu(sd), k)
        # ---------------- legs ----------------
        for tag, zh, zo, (tx, ty) in (('B', -3.6 * k, -4.0 * k, (P['fBx'], P['fBy'])), ('F', 3.6 * k, 4.0 * k, (P['fFx'], P['fFy']))):
            l = ik(hx, hy, tx, ty, R['thigh'], R['shin'], 1); kn = np.array([l[0], l[1]]); an = np.array([l[2], l[3]])
            Hp, K_, A = at_b(np.array([hx, hy]), zh), at_b(kn, (zh + zo) / 2), at_b(an, zo); w = 0.86 if legs == 'tights' else 1.0
            if legs == 'robot':
                sc.sphere(Hp, 4.8 * k, self.metal_sh('metal', 1), 'hipj' + tag)
                sc.chain(Hp, K_, 5.0 * k, 3.8 * k, lambda t: self.metal_sh('pants', 1) if 0.2 < t < 0.7 else self.metal_sh('metal', 1), 'thigh' + tag); sc.sphere(K_, 3.8 * k, self.F('dark', 2), 'knee' + tag)
                sc.chain(K_, A, 3.8 * k, 2.8 * k, lambda t: self.metal_sh('metal', 1) if t < 0.3 else self.metal_sh('pants', 1), 'shin' + tag)
            else:
                nn = 16
                for i in range(nn):
                    t = i / (nn - 1); pos_ = Hp + (K_ - Hp) * t
                    if legs == 'shorts':
                        if t < 0.52: sc.sphere(pos_, (5.1 - 1.3 * t + 0.9 * math.sin(math.pi * t / 0.52)) * k * big ** 0.3, self.cloth('pants', 1, 0.28), 'short' + tag)
                        elif t < 0.60: sc.sphere(pos_, 4.9 * k, self.F('trim', 1), 'hem' + tag)
                        else: sc.sphere(pos_, (4.6 - 1.1 * (t - 0.6) / 0.4) * k * big ** 0.3, self.skin_sh(), 'quad' + tag)
                    else: sc.sphere(pos_, (5.3 - 1.4 * t) * k * w * big ** 0.3, self.cloth('pants', 1, 0.22), 'thigh' + tag)
                sc.sphere(K_, 3.6 * k * w, self.skin_sh() if legs == 'shorts' else self.cloth('pants', 1), 'knee' + tag)
                for i in range(14):
                    t = i / 13; r_ = (3.6 - 1.25 * t + 1.0 * math.sin(math.pi * min(1.0, t * 1.7))) * k * w
                    sc.sphere(K_ + (A - K_) * t, r_ if legs == 'shorts' else r_ * (0.94 if legs != 'tights' else 0.9), self.skin_sh() if legs == 'shorts' else (self.F('trim', 1) if t > 0.82 else self.cloth('pants', 1, 0.2)), 'shin' + tag)
            dx, dy = an[0] - kn[0], an[1] - kn[1]; nr = math.hypot(dx, dy) or 1; dx, dy = dx / nr, dy / nr
            U = np.array([-dy, dx]); V = np.array([-dx, -dy])
            if U[0] < 0: U = -U
            U3, V3 = np.array([U[0], U[1], 0.0]), np.array([V[0], V[1], 0.0]); ax = np.array([Vb(U3), Vb(V3), Vb(sd)])
            P3 = lambda du, dv, z=zo: at_b(an + U * du * k + V * dv * k, z)
            self.shoe(sc, P3, ax, k, shoe_t)
        return sc

    def shoe(self, sc, P3, ax, k, st):
        sole = 'gum' if st == 'sneaker' else ('dark' if st != 'barefoot' else 'skin')
        if st != 'barefoot': sc.ell(P3(1.6, -2.7), ax, (7.2 * k, 1.05 * k, 3.7 * k), self.F('dark', 2) if st in ('boot', 'robot', 'hover') else self.F('shoe', 3), 'sole')
        sc.ell(P3(-2.4, -0.8), ax, (3.1 * k, 3.1 * k, 3.4 * k), self.shoe_shader(), 'heel'); sc.ell(P3(1.4, -0.7), ax, (4.6 * k, 3.0 * k, 3.6 * k), self.shoe_shader(), 'mid')
        sc.ell(P3(5.2, -1.1), ax, (3.8 * k, 2.5 * k, 3.4 * k), self.shoe_shader(), 'toe')
        if st in ('boot', 'robot', 'hover', 'sneaker'):
            hi = 7.4 if st in ('boot', 'robot', 'hover') else 5.6
            nm = 'metal' if st in ('robot', 'hover') else ('dark' if st == 'boot' else 'shoe')
            sc.chain(P3(0.0, 1.0), P3(-0.3, hi), 3.5 * k, 3.3 * k, lambda t: self.F(nm, 1), 'shaft')
            if st in ('robot', 'hover'): sc.sphere(P3(-0.3, hi + 0.4), 3.3 * k, self.F('accent', 0), 'collarS')
        if st == 'skate':
            for u in (-1.4, 5.6): sc.sphere(P3(u, -4.4), 1.9 * k, self.F('dark', 1), 'wheel%.1f' % u)
        if st == 'hover':
            for u in (-0.5, 3.0): sc.sphere(P3(u, -4.2), 1.7 * k, self.F('accent', 0), 'jet%.1f' % u)

    def boombox(self, sc, c, dirv, up, third, k):
        ax = np.array([dirv, up, third])
        sc.ell(c, ax, (9.5 * k, 5.6 * k, 4.4 * k), self.metal_sh('metal', 1), 'bb')
        for s_ in (-1, 1): sc.sphere(c + dirv * s_ * 4.2 * k + third * 4.3 * k, 2.6 * k, self.F('dark', 2), 'bbspk'); sc.sphere(c + dirv * s_ * 4.2 * k + third * 4.9 * k, 1.1 * k, self.F('accent', 0), 'bbcone')

    def head(self, sc, P, at_u, head2, ha, sd, yh, k, wind):
        sp, hs = self.sp, self.sp['head']; hsz = 1.0
        f0 = np.array([math.cos(ha), -math.sin(ha), 0.0]); u0 = np.array([math.sin(ha), math.cos(ha), 0.0])
        ax = np.array([rot_y(f0, yh), rot_y(u0, yh), rot_y(sd, yh)]); hc = at_u(head2)
        rad = np.array([8.0, 10.0, 7.6]) * k * (1.12 if hs in ('robot', 'crt') else 1.0) * (1.12 if hs == 'crt' else 1.0)
        shader = self.face_shader(hc, ax, rad); sc.ell(hc, ax, tuple(rad), shader, 'head')
        if hs not in ('robot', 'crt'):
            sc.ell(hc + ax[0] * 1.5 * k - ax[1] * 5.6 * k, ax, (5.8 * k, 4.2 * k, 6.0 * k), shader, 'jaw')
            sc.sphere(hc + ax[0] * 7.8 * k - ax[1] * 1.2 * k, 1.7 * k, shader, 'nose')
            for sg in (1, -1): sc.ell(hc + ax[2] * sg * 7.3 * k - ax[1] * 0.4 * k - ax[0] * 0.7 * k, ax, (1.0 * k, 2.2 * k, 1.2 * k), self.skin_sh(2), 'ear%d' % sg)
        H = lambda name, lvl=1: self.cloth(name, lvl, 0.12)
        def shell(radii, off, shader_, part): sc.ell(hc + ax[0] * off[0] * k + ax[1] * off[1] * k, ax, tuple(np.array(radii) * k), shader_, part)
        def keep_shader(base, cond):
            def sh(q, n, pos):
                r = base(q, n, pos); keep = cond(q); return r[0], np.where(keep, r[1], -1).astype(np.int8), r[2]
            return sh
        hairs = self.hair_sh('hair'); hats = self.hair_sh('hat')
        if hs == 'mohawk':
            for i in range(7):
                t = i / 6; base = hc + ax[0] * (5.6 - 10.4 * t) * k + ax[1] * (9.0 - 1.6 * abs(t - 0.45)) * k; tip = base + ax[1] * (5.6 + 1.6 * math.sin(t * 3.1)) * k - ax[0] * 0.9 * k
                sc.chain(base, tip, 2.3 * k, 0.8 * k, lambda tt: hairs, 'spike%d' % i)
            shell((8.4, 10.4, 7.9), (-0.4, 0.4), keep_shader(self.hair_sh('skin'), lambda q: (q[1] > 0.55) & (np.abs(q[2]) < 0.6)), 'scalp')
        elif hs in ('cap',):
            shell((9.1, 10.8, 8.5), (-0.5, 0.8), keep_shader(hats, lambda q: (q[1] > 0.22) & (q[0] < 0.92)), 'dome')
            sc.ell(hc + ax[0] * 8.8 * k + ax[1] * 2.6 * k, np.array([ax[0], ax[1], ax[2]]), (5.0 * k, 0.9 * k, 5.6 * k), self.cloth('hat', 0), 'visor')
            sc.sphere(hc + ax[0] * 7.6 * k + ax[1] * 6.0 * k + ax[2] * 0.0, 1.3 * k, self.F('accent', 0), 'logo')
        elif hs == 'headphones':
            shell((8.9, 10.7, 8.3), (-0.4, 0.7), keep_shader(hairs, lambda q: (q[1] > 0.45) | (q[0] < -0.2)), 'hairs')
            for sg in (1, -1):
                sc.sphere(hc + ax[2] * sg * 7.8 * k - ax[1] * 0.6 * k, 3.4 * k, self.cloth('hat', 1), 'cup%d' % sg); sc.sphere(hc + ax[2] * sg * 10.2 * k - ax[1] * 0.6 * k, 1.6 * k, self.F('accent', 0), 'cupc%d' % sg)
            for t in np.linspace(-1.0, 1.0, 9): sc.sphere(hc + ax[2] * 8.6 * k * math.sin(t * 1.4) + ax[1] * (10.4 * math.cos(t * 1.4)) * k, 1.0 * k, self.cloth('hat', 2), 'band')
        elif hs == 'helmet':
            shell((9.4, 11.0, 8.9), (-0.3, 0.3), keep_shader(hats, lambda q: (q[1] > -0.30)), 'helm')
            sc.ell(hc + ax[0] * 6.4 * k + ax[1] * 1.0 * k, ax, (3.4 * k, 2.4 * k, 6.2 * k), self.F('dark', 2), 'visorH'); sc.ell(hc + ax[0] * 8.6 * k + ax[1] * 1.2 * k, ax, (1.0 * k, 0.7 * k, 5.6 * k), self.F('accent', 0), 'visorG')
        elif hs == 'beanie':
            shell((9.0, 10.6, 8.4), (-0.4, 1.0), keep_shader(hats, lambda q: (q[1] > 0.28)), 'beanieD'); shell((9.3, 2.1, 8.7), (-0.4, 4.4), self.cloth('accent', 1), 'cuffB')
            sc.sphere(hc + ax[1] * 12.2 * k - ax[0] * 0.6 * k, 2.2 * k, self.cloth('hat', 0), 'pom'); shell((8.6, 10.0, 8.0), (-1.0, -0.2), keep_shader(hairs, lambda q: (q[0] < -0.1) | (np.abs(q[2]) > 0.8)), 'hairB')
        elif hs == 'bandana':
            shell((8.9, 10.6, 8.3), (-0.4, 0.6), keep_shader(hairs, lambda q: (q[1] > 0.30) | (q[0] < -0.2)), 'hairs')
            shell((8.7, 1.9, 8.1), (-0.2, 4.4), self.cloth('hat', 1), 'band')
            sc.chain(hc - ax[0] * 8.2 * k + ax[1] * 3.4 * k, hc - ax[0] * (12.0 - wind[0]) * k + ax[1] * (1.0 + wind[1] * 0.3) * k, 1.8 * k, 1.0 * k, lambda t: self.cloth('hat', 1), 'knot')
        elif hs in ('shades', 'slick'):
            shell((8.9, 10.7, 8.3), (-0.4, 0.7), keep_shader(hairs, lambda q: (q[1] > 0.40) | (q[0] < -0.3)), 'slickH')
            if sp['kind'] == 'boss1': shell((10.8, 12.4, 10.4), (-1.0, 1.4), keep_shader(hairs, lambda q: (q[1] > 0.30) | (q[0] < -0.12) | (np.abs(q[2]) > 0.82)), 'afro')
        elif hs == 'visor':
            shell((8.9, 10.7, 8.3), (-0.4, 0.7), keep_shader(hairs, lambda q: (q[1] > 0.40) | (q[0] < -0.25)), 'hairV')
        elif hs == 'blonde':
            shell((9.8, 11.6, 9.4), (-0.6, 1.0), keep_shader(hairs, lambda q: (q[1] > 0.18) | (q[0] < -0.25) | (np.abs(q[2]) > 0.7)), 'big')
            shell((9.4, 2.0, 8.8), (-0.3, 4.6), self.cloth('hat', 1), 'headband')
            a0 = hc - ax[0] * 6.4 * k - ax[1] * 2.0 * k; a1 = a0 - ax[0] * (3.4 - wind[0] * 0.3) * k - ax[1] * 9.0 * k
            sc.chain(a0, a1, 4.6 * k, 3.4 * k, lambda t: hairs, 'curls')
        elif hs == 'robot':
            sc.chain(hc + ax[1] * 9.8 * k * 1.12, hc + ax[1] * 15.5 * k - ax[0] * 1.0 * k, 0.8 * k, 0.7 * k, lambda t: self.F('metal', 2), 'antenna'); sc.sphere(hc + ax[1] * 16.2 * k - ax[0] * 1.0 * k, 1.5 * k, self.F('accent', 0), 'ant_tip')
            for sg in (1, -1): sc.sphere(hc + ax[2] * sg * 8.6 * k * 1.12, 1.9 * k, self.F('accent', 1), 'bolt%d' % sg)
            sc.ell(hc + ax[1] * 6.4 * k * 1.12, ax, (8.4 * k * 1.12, 2.4 * k, 7.9 * k * 1.12), self.cloth('hat', 1, 0.05), 'brow')
        elif hs == 'crt':
            for sg in (-1, 1): sc.chain(hc + ax[1] * 10.2 * k * 1.2 + ax[2] * sg * 2.0 * k, hc + ax[1] * 16.0 * k * 1.2 + ax[2] * sg * 5.5 * k, 0.8 * k, 0.6 * k, lambda t: self.F('hat', 2), 'ant%d' % sg); sc.sphere(hc + ax[1] * 16.6 * k * 1.2 + ax[2] * sg * 5.7 * k, 1.4 * k, self.F('accent', 0), 'anttip%d' % sg)

    def render(self, pose, yaw_b, yaw_h, twist, wind):
        sc = self.build(pose, yaw_b, yaw_h, twist, wind)
        body, rim, info = r3.render(sc, self.ramps, self.FS, self.FS, self.OX, self.OY, style=STYLE_B)
        return Image.fromarray(body, 'RGBA'), Image.fromarray(rim, 'RGBA')

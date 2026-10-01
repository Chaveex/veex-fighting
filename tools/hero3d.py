"""Detailed semi-realistic hero model (3D -> pixel art) with switchable styles.  Used by tools/hero_styles_preview.py and make_hero_sprites.py
What makes it less "cardboard puppet" than v4:
  * real layers: denim jacket is a shell OPEN at the front over the striped tee (lapels have thickness + stitching), sleeves rolled with a cuff ring
  * torso twist (chest turns against the pelvis), head tracking, secondary motion (mullet / jacket hem follow through)
  * proper hands (fist block, knuckles, thumb, layered wraps) and sneakers (heel, midfoot, toe box, gum sole plate, hi-top shaft, tongue, laces)
  * head = photo projected on a skull + jaw + nose + ears, with a hair shell for volume and a mullet made of 3 strands
  * materials: twill denim with folds, satin shorts with specular streaks, skin with small speculars, hair strand shading
"""
import math, os
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
import render3d as r3
from make_enemy_sprites import mk_ramp

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ------------------------------------------------------------------ styles
BASE = {'skin': '#e3a682', 'hair': '#4d2c1c', 'denim': '#4a78c0', 'white': '#f1ebf3', 'red': '#dc2840', 'blue': '#3447c8',
        'shoe': '#f0ecf7', 'gold': '#ffd04a', 'gum': '#d2ae7e', 'dark': '#221a34'}
STYLES = {
    'A': dict(name='A - Rotoscope realiste', k=1.32, fs=128, head=1.00, fist=1.00, contrast=1.15,
              palette=dict(BASE, skin='#d08f76', hair='#4a271b', denim='#44639a', white='#e9e0da', red='#c4453f', blue='#3a4d95'),
              render=dict(smooth=True, outline_w=1, colored_outline=True, rim_k=0.40, cast_shadow=True)),
    'B': dict(name='B - Arcade 16-bit net', k=1.26, fs=128, head=1.14, fist=1.10, contrast=1.30,
              palette=dict(BASE, skin='#eeb08a', hair='#5a2f1d', denim='#3f78d0', red='#e8263c', blue='#2f43d8'),
              render=dict(bands=4, outline_w=1, colored_outline=False, rim_k=0.55, cast_shadow=True)),
    'C': dict(name='C - Heroique Metal Slug', k=1.20, fs=128, head=1.26, fist=1.30, contrast=1.45,
              palette=dict(BASE, skin='#f4ae84', hair='#623220', denim='#3a7be6', red='#ff2a48', blue='#2a3fee', white='#ffffff'),
              render=dict(bands=3, outline_w=2, colored_outline=True, rim_k=0.65, cast_shadow=False)),
}

def ramps_for(style):
    order = list(BASE.keys()); ramps = [[tuple(c[:3]) for c in mk_ramp(style['palette'][k])] for k in order]
    return order, {k: i for i, k in enumerate(order)}, ramps

# ------------------------------------------------------------------ the photo on the head
def head_map(contrast):
    ph = Image.open(os.path.join(ROOT, 'public', 'veex.png')).convert('RGB').crop((215, 70, 895, 1065))
    ph = ImageEnhance.Color(ph).enhance(1.25); ph = ImageEnhance.Contrast(ph).enhance(contrast); ph = ImageEnhance.Brightness(ph).enhance(1.26)
    ph = ph.resize((96, 140), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.0, percent=160, threshold=2))
    ph = ph.quantize(colors=48, method=Image.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    return np.asarray(ph, float)

def sample(mp, u, v):
    h, w, _ = mp.shape; x = np.clip(u * (w - 1), 0, w - 1.001); y = np.clip(v * (h - 1), 0, h - 1.001)
    x0, y0 = x.astype(int), y.astype(int); fx, fy = (x - x0)[:, None], (y - y0)[:, None]
    return (mp[y0, x0] * (1 - fx) * (1 - fy) + mp[y0, x0 + 1] * fx * (1 - fy) + mp[y0 + 1, x0] * (1 - fx) * fy + mp[y0 + 1, x0 + 1] * fx * fy)

# ------------------------------------------------------------------ shading helpers
LIGHT = np.array([0.30, 0.72, 0.62]); LIGHT /= np.linalg.norm(LIGHT)
HALF = LIGHT + np.array([0, 0, 1.0]); HALF /= np.linalg.norm(HALF)
def spec(n, power=24): return np.clip((n * HALF[:, None]).sum(0), 0, 1) ** power
def hashn(pos): return np.mod(np.sin(pos[0] * 12.9898 + pos[1] * 78.233 + pos[2] * 37.719) * 43758.5453, 1.0)
def wobble(n, pos, amp, fx, fy, fz):
    """fabric folds: perturb the normal with smooth waves"""
    d = np.stack([np.sin(pos[1] * fy + pos[2] * fz), 0.6 * np.sin(pos[0] * fx + pos[2] * 0.7), 0.4 * np.sin(pos[0] * fx * 0.8 + pos[1] * fy * 0.6)])
    m = n + amp * d; return m / (np.linalg.norm(m, axis=0) + 1e-9)
def rot_y(v, a):
    c, s = math.cos(a), math.sin(a); return np.array([v[0] * c - v[2] * s, v[1], v[0] * s + v[2] * c])
def ik(rx, ry, tx, ty, l1, l2, bend):
    dx, dy = tx - rx, ty - ry; d = math.hypot(dx, dy); mx = l1 + l2 - 0.05
    if d > mx: dx *= mx / d; dy *= mx / d; d = mx
    if d < 0.6:
        d = 0.6
        if dx == 0 and dy == 0: dy = -0.6
    a = (l1 * l1 - l2 * l2 + d * d) / (2 * d); h = math.sqrt(max(0, l1 * l1 - a * a)); ux, uy = dx / d, dy / d
    return (rx + ux * a - uy * h * bend, ry + uy * a + ux * h * bend, rx + dx, ry + dy)

class Hero:
    def __init__(self, style_key):
        self.S = STYLES[style_key]; self.key = style_key
        self.order, self.ID, self.ramps = ramps_for(self.S); self.MAP = head_map(self.S['contrast']); self.k = self.S['k']
        self.R = {'thigh': 16 * self.k, 'shin': 16 * self.k, 'upper': 11 * self.k, 'fore': 10.5 * self.k, 'torso': 18 * self.k, 'neck': (14 + 2.2 * (self.S['head'] - 1) * 4) * self.k}
        self.FS = self.S['fs']; self.OX = self.FS // 2; self.OY = self.FS - 10

    # ---- tiny material factories ----
    def flat(self, name, lvl=1): return r3.flat(self.ID[name], lvl)
    def skin_sh(self):
        ID = self.ID
        def sh(q, n, pos):
            N = n.shape[1]; s = spec(n, 40); return np.full(N, ID['skin'], np.int16), np.where(s > 0.7, 0, 1).astype(np.int8), None
        return sh

    def build(self, p, yaw_b, yaw_h, twist, wind):
        k, S, ID, R = self.k, self.S, self.ID, self.R; hsz = S['head']
        P = {a: (v * k if a not in ('lean', 'tilt') else v) for a, v in p.items()}
        yb, yu, yh = math.radians(yaw_b), math.radians(yaw_b + twist), math.radians(yaw_h)
        hx, hy = P['hx'], P['hy']
        su = np.array([math.sin(P['lean']), math.cos(P['lean']), 0.0]); fw = np.array([math.cos(P['lean']), -math.sin(P['lean']), 0.0]); sd = np.array([0.0, 0.0, 1.0])
        def Wb(x, y, z=0.0): v = rot_y(np.array([x - hx, y, z]), yb); return np.array([hx + v[0], v[1], v[2]])       # pelvis / legs
        def Wu(x, y, z=0.0): v = rot_y(np.array([x - hx, y, z]), yu); return np.array([hx + v[0], v[1], v[2]])       # chest / arms
        def Vb(v): return rot_y(np.asarray(v, float), yb)
        def Vu(v): return rot_y(np.asarray(v, float), yu)
        sc = r3.Scene(); hip = np.array([hx, hy, 0.0]); chest2 = hip + su * R['torso']
        # ---------------- torso: tee under-layer, jacket shell (open in front), shorts ----------------
        axb = np.array([Vb(fw), Vb(su), Vb(sd)]); axu = np.array([Vu(fw), Vu(su), Vu(sd)])
        def at_b(b, z=0.0): return Wb(b[0], b[1], z)
        def at_u(b, z=0.0): return Wu(b[0], b[1], z)
        sc.ell(at_b(hip + su * 1.6 * k), axb, (5.9 * k, 5.6 * k, 6.9 * k), self.pelvis_shader(), 'pelvis')
        ab_c, ch_c = hip + su * (R['torso'] * 0.30), hip + su * (R['torso'] * 0.70)
        sc.ell(at_u(ab_c), axu, (5.3 * k, 6.4 * k, 6.5 * k), self.tee_shader(), 'tee_ab')
        sc.ell(at_u(ch_c), axu, (5.9 * k, 6.6 * k, 7.9 * k), self.tee_shader(), 'tee_ch')
        sc.ell(at_u(ab_c), axu, (6.3 * k, 7.0 * k, 7.4 * k), self.jacket_shader(), 'jk_ab')
        sc.ell(at_u(ch_c), axu, (6.9 * k, 7.2 * k, 8.7 * k), self.jacket_shader(), 'jk_ch')
        sw = float(np.clip(wind[0] * 0.7, -3, 3))
        sc.ell(at_b(hip - fw * (5.6 - sw * 0.6) * k - su * 2.2 * k), axb, (1.7 * k, 4.2 * k, 5.6 * k), self.denim_flat(2), 'hem_back')
        shoulder = chest2 - su * 2.3 * k
        for z, part in ((7.6 * k, 'shF'), (-7.6 * k, 'shB')): sc.sphere(at_u(shoulder, z), 4.6 * k, self.denim_flat(1), part)
        ha = P['lean'] + P['tilt']
        head2 = np.array([chest2[0] + math.sin(ha) * R['neck'], chest2[1] + math.cos(ha) * R['neck']])
        sc.chain(at_u(chest2 - su * 1.2 * k), at_u(head2 - np.array([math.sin(ha), math.cos(ha)]) * 7.4 * k), 3.8 * k, 3.4 * k, lambda t: self.skin_sh(), 'neck')
        for sgn_ in (1, -1):                                                   # popped collar wings
            c_ = at_u(chest2 + su * 0.9 * k - fw * 0.6 * k, sgn_ * 4.0 * k)
            ax = np.array([Vu(fw * 0.5 + su * 0.5 + sd * sgn_ * 0.35), Vu(su - fw * 0.3), Vu(sd * sgn_ + fw * 0.4)]); ax = ax / np.linalg.norm(ax, axis=1)[:, None]
            sc.ell(c_, ax, (2.4 * k, 3.3 * k, 1.0 * k), self.denim_flat(0 if sgn_ > 0 else 1), 'collar%d' % sgn_)
        # ---------------- head ----------------
        f0 = np.array([math.cos(ha), -math.sin(ha), 0.0]); u0 = np.array([math.sin(ha), math.cos(ha), 0.0])
        haxes = np.array([rot_y(f0, yh), rot_y(u0, yh), rot_y(sd, yh)]); hc = at_u(head2)
        rad = np.array([8.6, 11.2, 8.2]) * k * hsz
        shader_head = self.head_shader(hc, haxes, rad)
        sc.ell(hc, haxes, tuple(rad), shader_head, 'head')
        sc.ell(hc + haxes[0] * 1.6 * k * hsz - haxes[1] * 6.2 * k * hsz, haxes, (6.4 * k * hsz, 4.6 * k * hsz, 6.6 * k * hsz), shader_head, 'jaw')
        sc.sphere(hc + haxes[0] * 8.6 * k * hsz - haxes[1] * 1.4 * k * hsz, 1.9 * k * hsz, shader_head, 'nose')
        for sg in (1, -1): sc.ell(hc + haxes[2] * sg * 8.0 * k * hsz - haxes[1] * 0.6 * k * hsz - haxes[0] * 0.8 * k * hsz, haxes, (1.0 * k * hsz, 2.4 * k * hsz, 1.3 * k * hsz), self.skin_sh(), 'ear%d' % sg)
        sc.ell(hc + haxes[1] * 0.9 * k * hsz - haxes[0] * 0.6 * k * hsz, haxes, (9.3 * k * hsz, 11.7 * k * hsz, 8.8 * k * hsz), self.hair_shell(), 'hairshell')
        sc.ell(hc - haxes[0] * 5.0 * k * hsz + haxes[1] * 0.4 * k * hsz, haxes, (6.0 * k * hsz, 9.8 * k * hsz, 7.6 * k * hsz), self.hair_flat(), 'hairback')
        wx, wy = wind
        a0 = hc - haxes[0] * 5.6 * k * hsz - haxes[1] * 4.4 * k * hsz
        a1 = hc - haxes[0] * (9.2 - wx) * k * hsz - haxes[1] * (10.5 - wy) * k * hsz
        a2 = hc - haxes[0] * (10.8 - wx * 1.3) * k * hsz - haxes[1] * (19.0 - wy * 1.6) * k * hsz
        for off, r0 in ((0.0, 3.4), (1.9, 2.6), (-1.9, 2.6)):
            o = haxes[2] * off * k
            sc.chain(a0 + o, a1 + o * 1.3, r0 * k * hsz, r0 * 0.85 * k * hsz, lambda t: self.hair_flat(), 'tail1_%s' % off)
            sc.chain(a1 + o * 1.3, a2 + o * 1.7, r0 * 0.85 * k * hsz, 1.4 * k * hsz, lambda t: self.hair_flat(), 'tail2_%s' % off)
        # ---------------- arms ----------------
        for tag, zsh, zh, (tx, ty) in (('B', -7.6 * k, -6.9 * k, (P['hBx'], P['hBy'])), ('F', 7.6 * k, 6.9 * k, (P['hFx'], P['hFy']))):
            e = ik(shoulder[0], shoulder[1], tx, ty, R['upper'], R['fore'], -1); el = np.array([e[0], e[1]]); h2 = np.array([e[2], e[3]])
            S0, E, Hd = at_u(shoulder, zsh), at_u(el, zsh + (zh - zsh) * 0.5), at_u(h2, zh)
            cuff = 0.60
            sc.chain(S0, S0 + (E - S0) * cuff, 4.4 * k, 3.9 * k, lambda t: self.denim_flat(1 if t < 0.85 else 0), 'sleeve' + tag)
            sc.chain(S0 + (E - S0) * (cuff - 0.06), S0 + (E - S0) * (cuff + 0.06), 4.0 * k, 4.0 * k, lambda t: self.denim_flat(0), 'cuff' + tag)
            sc.chain(S0 + (E - S0) * (cuff + 0.03), E, 3.4 * k, 3.1 * k, lambda t: self.skin_sh(), 'bicep' + tag)
            sc.sphere(E, 3.2 * k, self.skin_sh(), 'elbow' + tag)
            dirv = Hd - E; dirv = dirv / (np.linalg.norm(dirv) + 1e-9)
            def fore(t):
                if t < 0.28: return self.skin_sh()
                b = int((t - 0.28) / 0.12)
                return self.flat('red', 1) if b in (1, 4) else self.flat('white', 1)
            n = 14
            for i in range(n):
                t = i / (n - 1); r_ = (3.05 + 0.5 * math.sin(math.pi * min(1, t * 1.3)) - 0.75 * t) * k + (0.4 * k if t > 0.28 else 0)
                sc.sphere(E + (Hd - E) * t, r_, fore(t), 'fore' + tag)
            up = np.cross(sd, dirv); up = up / (np.linalg.norm(up) + 1e-9); third = np.cross(dirv, up)
            fist_ax = np.array([dirv, up, third]); fist_c = Hd + dirv * 1.3 * k
            sc.ell(fist_c, fist_ax, (4.3 * k * S['fist'], 3.5 * k * S['fist'], 3.7 * k * S['fist']), self.fist_shader(), 'fist' + tag)
            for j in range(4): sc.sphere(fist_c + dirv * 3.6 * k * S['fist'] + up * (1.9 - j * 1.25) * k * S['fist'] + third * 0.2 * k, 1.25 * k * S['fist'], self.flat('white', 0 if j % 2 else 1), 'knuckle%s%d' % (tag, j))
            sc.chain(fist_c + up * 2.6 * k + dirv * 0.8 * k, fist_c + up * 3.0 * k + dirv * 2.8 * k, 1.5 * k * S['fist'], 1.2 * k * S['fist'], lambda t: self.flat('white', 1), 'thumb' + tag)
        # ---------------- legs ----------------
        for tag, zh, zo, (tx, ty) in (('B', -3.6 * k, -4.0 * k, (P['fBx'], P['fBy'])), ('F', 3.6 * k, 4.0 * k, (P['fFx'], P['fFy']))):
            l = ik(hx, hy, tx, ty, R['thigh'], R['shin'], 1); kn = np.array([l[0], l[1]]); an = np.array([l[2], l[3]])
            Hp, K_, A = at_b(np.array([hx, hy]), zh), at_b(kn, (zh + zo) / 2), at_b(an, zo)
            sc.sphere(Hp, 4.9 * k, self.satin(), 'glute' + tag)
            nn = 16
            for i in range(nn):
                t = i / (nn - 1); pos_ = Hp + (K_ - Hp) * t
                if t < 0.52: sc.sphere(pos_, (5.1 - 1.3 * t + 0.9 * math.sin(math.pi * t / 0.52)) * k, self.satin(), 'short' + tag)
                elif t < 0.60: sc.sphere(pos_, 4.9 * k, self.flat('blue', 1), 'hem' + tag)
                else: sc.sphere(pos_, (4.6 - 1.1 * (t - 0.6) / 0.4) * k, self.skin_sh(), 'quad' + tag)
            sc.sphere(K_, 3.5 * k, self.skin_sh(), 'knee' + tag)
            for i in range(14):
                t = i / 13; sc.sphere(K_ + (A - K_) * t, (3.6 - 1.25 * t + 1.05 * math.sin(math.pi * min(1.0, t * 1.7))) * k, self.skin_sh(), 'shin' + tag)
            dx, dy = an[0] - kn[0], an[1] - kn[1]; nr = math.hypot(dx, dy) or 1; dx, dy = dx / nr, dy / nr
            U = np.array([-dy, dx]); V = np.array([-dx, -dy])
            if U[0] < 0: U = -U
            U3, V3 = np.array([U[0], U[1], 0.0]), np.array([V[0], V[1], 0.0]); ax = np.array([Vb(U3), Vb(V3), Vb(sd)])
            def P3(du, dv): return at_b(an + U * du * k + V * dv * k, zo)
            sc.ell(P3(1.6, -2.7), ax, (7.2 * k, 1.05 * k, 3.7 * k), self.flat('gum', 1), 'sole' + tag)
            sc.ell(P3(-2.4, -0.8), ax, (3.1 * k, 3.1 * k, 3.4 * k), self.shoe_shader(), 'heel' + tag)
            sc.ell(P3(1.4, -0.7), ax, (4.6 * k, 3.0 * k, 3.6 * k), self.shoe_shader(), 'mid' + tag)
            sc.ell(P3(5.2, -1.1), ax, (3.8 * k, 2.5 * k, 3.4 * k), self.shoe_shader(), 'toe' + tag)
            sc.chain(P3(0.0, 1.0), P3(-0.3, 6.6), 3.4 * k, 3.2 * k, lambda t: self.flat('shoe', 1), 'shaft' + tag)
            sc.sphere(P3(-0.3, 7.0), 3.3 * k, self.flat('dark', 2), 'collarS' + tag)
            sc.sphere(P3(1.8, 6.0), 1.7 * k, self.flat('shoe', 0), 'tongue' + tag)
        return sc

    # ---- shaders ----
    def pelvis_shader(self):
        ID = self.ID
        def sh(q, n, pos):
            N = q.shape[1]; rid = np.full(N, ID['red'], np.int16); lvl = np.ones(N, np.int8)
            rid[q[1] > 0.5] = ID['blue']; wt = (q[1] > 0.30) & (q[1] <= 0.50); rid[wt] = ID['white']; lvl[wt] = 0
            side = (np.abs(q[2]) > 0.80) & (q[1] <= 0.30) & (q[1] > -0.8); rid[side] = ID['white']; lvl[side] = 0
            n2 = wobble(n, pos, 0.22, 0.9, 1.1, 0.8); s = spec(n2, 18); hi = (s > 0.55) & (rid == ID['red']); lvl[hi] = 0
            return rid, lvl, None, n2
        return sh

    def satin(self):
        ID = self.ID
        def sh(q, n, pos):
            N = n.shape[1]; n2 = wobble(n, pos, 0.28, 0.9, 1.0, 0.9); s = spec(n2, 16)
            rid = np.full(N, ID['red'], np.int16); lvl = np.where(s > 0.5, 0, 1).astype(np.int8)
            rid = np.where(s > 0.86, ID['white'], rid).astype(np.int16); lvl = np.where(s > 0.86, 1, lvl).astype(np.int8)
            return rid, lvl, None, n2
        return sh

    def tee_shader(self):
        ID = self.ID
        def sh(q, n, pos):
            N = q.shape[1]; cols = np.array([ID['white'], ID['red'], ID['white'], ID['blue'], ID['white'], ID['red']])
            band = (np.floor((pos[1] + 40) / 2.3).astype(int)) % 6; rid = cols[band].astype(np.int16); lvl = np.ones(N, np.int8)
            rim = (q[1] > 0.80) & (q[1] < 0.90) & (q[0] > 0.2); rid[rim] = ID['red']
            neck = (q[1] >= 0.90) & (q[0] > 0.15); rid[neck] = ID['skin']
            return rid, lvl, None
        return sh

    def denim_flat(self, lvl):
        ID = self.ID
        def sh(q, n, pos):
            N = n.shape[1]; h = hashn(pos); lv = np.where(h > 0.93, max(0, lvl - 1), lvl).astype(np.int8); n2 = wobble(n, pos, 0.25, 0.8, 0.9, 0.9)
            return np.full(N, ID['denim'], np.int16), lv, None, n2
        return sh

    def jacket_shader(self):
        ID = self.ID
        def sh(q, n, pos):
            qf, qu, qs = q; N = qf.shape[0]
            wedge = 0.30 + 0.17 * np.clip(qu, 0, 1)
            discard = ((qf > 0.0) & (np.abs(qs) < wedge)) | (qu < -0.80)
            rid = np.full(N, ID['denim'], np.int16); lvl = np.ones(N, np.int8)
            h = hashn(pos); lvl[h > 0.94] = 0
            edge = (qf > 0) & (np.abs(np.abs(qs) - wedge) < 0.07); lvl[edge] = 0
            thread = (qf > 0) & (np.abs(np.abs(qs) - wedge - 0.12) < 0.022); rid[thread] = ID['gold']; lvl[thread] = 2
            hemline = (qu < -0.66) & (qu > -0.72); lvl[hemline] = 0
            pocket = (qf > 0.10) & (qs > 0.52) & (qs < 0.88) & (qu > -0.05) & (qu < 0.36); lvl[pocket] = 0
            flap = pocket & (qu > 0.26); lvl[flap] = 2
            btn = (np.abs(qs - 0.70) < 0.06) & (np.abs(qu - 0.26) < 0.05) & (qf > 0.1); rid[btn] = ID['gold']; lvl[btn] = 1
            seam = (np.abs(np.abs(qs) - 0.95) < 0.025) & (qf < 0.2); lvl[seam] = 3
            n2 = wobble(n, pos, 0.30, 0.75, 0.85, 0.9)
            lvl = np.where(discard, -1, lvl).astype(np.int8)
            return rid, lvl, None, n2
        return sh

    def fist_shader(self):
        ID = self.ID
        def sh(q, n, pos):
            N = n.shape[1]; rid = np.full(N, ID['white'], np.int16); lvl = np.ones(N, np.int8)
            band = (np.floor((q[0] + 1) * 2.2).astype(int)) % 4; rid[band == 1] = ID['red']
            rid[band == 1] = ID['red']; lvl[(q[1] > 0.55)] = 0
            return rid, lvl, None
        return sh

    def shoe_shader(self):
        ID = self.ID
        def sh(q, n, pos):
            N = q.shape[1]; rid = np.full(N, ID['shoe'], np.int16); lvl = np.ones(N, np.int8)
            stripe = (q[2] > 0.45) & (np.abs(q[1] + 0.05) < 0.40); rid[stripe] = ID['red']
            laces = (q[1] > 0.45) & (np.abs(q[2]) < 0.55) & (np.mod(q[0] * 5.0, 1.0) < 0.34); rid[laces] = ID['dark']; lvl[laces] = 1
            lvl[(q[1] < -0.55)] = 2
            return rid, lvl, None
        return sh

    def skin_dark(self):
        ID = self.ID
        def sh(q, n, pos): N = n.shape[1]; return np.full(N, ID['skin'], np.int16), np.full(N, 2, np.int8), None
        return sh

    def hair_flat(self):
        ID = self.ID
        def sh(q, n, pos):
            N = n.shape[1]; s = np.sin(pos[1] * 1.5 + pos[2] * 2.3) + 0.7 * np.sin(pos[1] * 3.3 - pos[0] * 1.9); sp = spec(n, 22)
            lvl = np.where(s > 1.05, 0, np.where(s < -0.45, 2, 1)).astype(np.int8); lvl = np.where(sp > 0.78, 0, lvl).astype(np.int8)
            return np.full(N, ID['hair'], np.int16), lvl, None
        return sh

    def hair_shell(self):
        """hair volume: only on top, back and above the ears (front = the photo's own fringe)"""
        base = self.hair_flat()
        def sh(q, n, pos):
            qf, qu, qs = q; r = base(q, n, pos)
            keep = ((qu > 0.48) & (qf < 0.72)) | (qf < -0.25) | ((np.abs(qs) > 0.84) & (qu > 0.05) & (qf < -0.02))
            lvl = np.where(keep, r[1], -1).astype(np.int8); return r[0], lvl, None
        return sh

    def head_shader(self, hc, axes, radii):
        ID, MAP = self.ID, self.MAP
        hair = self.hair_flat()
        def sh(q, n, pos):
            d = pos - hc[:, None]; ql = np.stack([(d * axes[i][:, None]).sum(0) / radii[i] for i in range(3)])      # head-local unit coords
            front = ql[0] > 0.02
            u = 0.5 - ql[2] * 0.47; v = 0.5 - ql[1] * 0.495
            rgb = sample(MAP, np.clip(u, 0, 1), np.clip(v, 0, 1))
            hr = hair(ql, n, pos); ramp_c = np.array(self.ramps[ID['hair']], float)[np.clip(hr[1].astype(int), 0, 4)]
            out = np.where(front[:, None], rgb, ramp_c); N = n.shape[1]
            return np.zeros(N, np.int16), np.ones(N, np.int8), out
        return sh

    # ---- render ----
    def render(self, pose, yaw_b, yaw_h, twist, wind):
        sc = self.build(pose, yaw_b, yaw_h, twist, wind)
        body, rim, info = r3.render(sc, self.ramps, self.FS, self.FS, self.OX, self.OY, style=self.S['render'])
        return Image.fromarray(body, 'RGBA'), Image.fromarray(rim, 'RGBA')

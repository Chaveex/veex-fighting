"""2D PIXEL ART renderer for the 24 enemies / bosses, same look as the hero (tools/hero_pixel.py): tapered limbs with 4-band cel
shading (light from the upper right), selective inner lines, 1 px outer contour and the cyan neon rim layer. No 3D any more.
Only the JOINT POSITIONS come from the old rig (same skeleton maths as tools/enemy3d.py, same poses / frame plan), so the
sheets stay frame-for-frame compatible with the game.
Heads are rasterised from simple rules in head space (u to the face, v down), so they stay crisp at any size / tilt:
skull + jaw, eyes, brows, nose, ear, mouth, then the head type on top: mohawk, cap, headphones, helmet, beanie, bandana, shades,
slick (+ boss1 afro), visor, blonde, robot, crt.  Bodies: top jacket / suit / varsity / tank / armor, legs pants / shorts / tights /
robot, sleeves long / short / bare / robot, shoes sneaker / boot / skate / barefoot / robot / hover, extras chain / belt / studs /
scarf / boombox.
usage: python tools/enemy_pixel.py [keys...]   -> tools/enemy_pixel_preview.png (a few poses per enemy)"""
import math, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hero_pixel import Canvas, capsule_field, cel, disc_hull, LDIR
from hero3d import rot_y, ik
from make_enemy_sprites import mk_ramp

CONTOUR = (36, 18, 48)
RIM = (122, 234, 255)
KEYS = ['skin', 'hair', 'jacket', 'sleeve', 'tee0', 'tee1', 'pants', 'trim', 'shoe', 'wrap', 'accent', 'hat', 'metal', 'dark', 'white', 'gold']


class PixelEnemy:
    def __init__(self, sp, eu):
        self.sp = sp; self.S = sp.get('S', 1.0); self.k = self.S * eu; k = self.k
        self.FS = 128 if k <= 1.40 else 160 if k <= 1.85 else 192
        self.OX, self.OY = self.FS // 2, self.FS - 10
        src = {'skin': sp.get('skin', '#e2a887'), 'hair': sp.get('hair', '#2a1a12'), 'jacket': sp.get('jacket', '#333344'), 'sleeve': sp.get('sleeve', sp.get('jacket', '#333344')),
               'tee0': sp.get('tee0', '#dddddd'), 'tee1': sp.get('tee1', '#888888'), 'pants': sp.get('pants', '#223355'), 'trim': sp.get('trim', '#ff2fd0'),
               'shoe': sp.get('shoe', '#eeeeee'), 'wrap': sp.get('wrap', '#dd3344'), 'accent': sp.get('accent', '#ff2fd0'), 'hat': sp.get('hat', '#ff2fd0'),
               'metal': sp.get('metal', sp.get('skin', '#8a94a8')), 'dark': '#1c1830', 'white': '#f4eef6', 'gold': '#ffd44a'}
        self.ID = {n: i for i, n in enumerate(KEYS)}
        self.ramps = [[tuple(c[:3]) for c in mk_ramp(src[n])] for n in KEYS]
        self.big = sp.get('bulk', 1.0)
        self.R = {'thigh': 16 * k, 'shin': 16 * k, 'upper': 11 * k, 'fore': 10.5 * k, 'torso': 18 * k, 'neck': 14.5 * k}

    # ------------------------------------------------------------------ skeleton (mirror of enemy3d.Char3D.build, joints only)
    def skeleton(self, p, yaw_b, yaw_h, twist):
        k, R, big = self.k, self.R, self.big
        P = {a: (v * k if a not in ('lean', 'tilt') else v) for a, v in p.items()}
        yb, yu = math.radians(yaw_b), math.radians(yaw_b + twist)
        hx, hy = P['hx'], P['hy']
        su = np.array([math.sin(P['lean']), math.cos(P['lean']), 0.0]); fw = np.array([math.cos(P['lean']), -math.sin(P['lean']), 0.0])
        def Wb(b, z=0.0): v = rot_y(np.array([b[0] - hx, b[1], z]), yb); return np.array([hx + v[0], v[1], v[2]])
        def Wu(b, z=0.0): v = rot_y(np.array([b[0] - hx, b[1], z]), yu); return np.array([hx + v[0], v[1], v[2]])
        wide = 0.85 + 0.15 * big
        hip = np.array([hx, hy, 0.0]); chest2 = hip + su * R['torso']; shoulder = chest2 - su * 2.3 * k
        J = {'k': k, 'wide': wide, 'lean': P['lean'], 'yh': yaw_h, 'yb': yaw_b, 'front': rot_y(np.array([1.0, 0, 0]), yu), 'fw': fw, 'su': su}
        J['pelvis'] = Wb(hip + su * 1.6 * k); J['ab'] = Wu(hip + su * R['torso'] * 0.30); J['chest'] = Wu(hip + su * R['torso'] * 0.70)
        J['neck0'] = Wu(chest2 - su * 1.2 * k); J['belt'] = Wb(hip + su * 3.2 * k)
        J['waistF'], J['waistB'] = Wb(hip + su * 4.5 * k, 6.2 * k * wide), Wb(hip + su * 4.5 * k, -6.2 * k * wide)
        J['shF'], J['shB'] = Wu(shoulder, 7.6 * k * wide), Wu(shoulder, -7.6 * k * wide)
        ha = P['lean'] + P['tilt']; head2 = np.array([chest2[0] + math.sin(ha) * R['neck'], chest2[1] + math.cos(ha) * R['neck']])
        J['head'] = Wu(head2); J['ha'] = ha
        for tag, zsh, zh, (tx, ty) in (('B', -7.6 * k * wide, -6.9 * k * wide, (P['hBx'], P['hBy'])), ('F', 7.6 * k * wide, 6.9 * k * wide, (P['hFx'], P['hFy']))):
            e = ik(shoulder[0], shoulder[1], tx, ty, R['upper'], R['fore'], -1)
            J['el' + tag] = Wu((e[0], e[1]), zsh + (zh - zsh) * 0.5); J['hand' + tag] = Wu((e[2], e[3]), zh)
        for tag, zh, zo, (tx, ty) in (('B', -3.6 * k, -4.0 * k, (P['fBx'], P['fBy'])), ('F', 3.6 * k, 4.0 * k, (P['fFx'], P['fFy']))):
            l = ik(hx, hy, tx, ty, R['thigh'], R['shin'], 1)
            J['hip' + tag] = Wb((hx, hy), zh); J['knee' + tag] = Wb((l[0], l[1]), (zh + zo) / 2); J['ank' + tag] = Wb((l[2], l[3]), zo)
        return J

    def sc(self, p): return np.array([self.OX + p[0], self.OY - p[1]])

    # ------------------------------------------------------------------ drawing
    def render(self, pose, yaw_b, yaw_h, twist, wind, name=''):
        J = self.skeleton(pose, yaw_b, yaw_h, twist); cv = Canvas(self.FS, self.FS)
        z = lambda *ks: float(np.mean([J[q][2] for q in ks]))
        jobs = [(z('shB', 'elB', 'handB'), 'armB'), (z('hipB', 'kneeB', 'ankB'), 'legB'), (z('chest', 'pelvis') - 0.5, 'torso'),
                (z('head') + 0.6, 'head'), (z('hipF', 'kneeF', 'ankF'), 'legF'), (z('shF', 'elF', 'handF'), 'armF')]
        self.hurt = name.startswith(('hurt', 'tumble', 'down', 'getup'))
        for i, (_z, part) in enumerate(sorted(jobs, key=lambda j: j[0])):
            getattr(self, 'draw_' + part[:-1] if part[-1] in 'FB' else 'draw_' + part)(cv, J, part, i, wind)
            cv.next()
        return self.finish(cv)

    def put_cel(self, cv, mask, key, s, part, far=0, shift=0):
        cv.put(mask, self.ID[key], np.clip(cel(s, far) + shift, 0, 4).astype(np.int8), part)

    # ---- legs + shoes ----
    def draw_leg(self, cv, J, part, pid, wind):
        tag = part[-1]; far = 1 if tag == 'B' else 0; S = self.sc; k = self.k; sp = self.sp; big = self.big
        legs = sp.get('legs', 'pants'); hp, kn, an = S(J['hip' + tag]), S(J['knee' + tag]), S(J['ank' + tag])
        th = (1.0 if legs != 'tights' else 0.82) * big ** 0.3
        if legs == 'robot':
            m, s, t = capsule_field(cv, hp, kn, 4.4 * k, 3.4 * k); self.put_cel(cv, m, 'metal', s, pid, far)
            band = m & (t > 0.25) & (t < 0.7); cv.ramp[band] = self.ID['pants']
            m, s, t = capsule_field(cv, kn, an, 3.4 * k, 2.6 * k); self.put_cel(cv, m, 'pants', s, pid, far)
            m, s, t = capsule_field(cv, kn - (an - kn) * 0.05, kn + (an - kn) * 0.08, 2.9 * k, 2.9 * k); self.put_cel(cv, m, 'dark', s, pid, far, 1)
        elif legs == 'shorts':
            mid = hp + (kn - hp) * 0.55
            m, s, t = capsule_field(cv, hp, mid, 4.7 * k * th, 4.4 * k * th); self.put_cel(cv, m, 'pants', s, pid, far)
            m, s, t = capsule_field(cv, mid, mid + (kn - hp) * 0.08, 4.5 * k * th, 4.5 * k * th); self.put_cel(cv, m, 'trim', s, pid, far)
            m, s, t = capsule_field(cv, mid + (kn - hp) * 0.08, kn, 3.7 * k * th, 3.2 * k * th); self.put_cel(cv, m, 'skin', s, pid, far)
            m, s, t = capsule_field(cv, kn, an, 3.2 * k * th, 2.5 * k * th); self.put_cel(cv, m, 'skin', s, pid, far)
        else:
            m, s, t = capsule_field(cv, hp, kn, 4.6 * k * th, 3.6 * k * th); self.put_cel(cv, m, 'pants', s, pid, far)
            m, s, t = capsule_field(cv, kn, an, 3.5 * k * th, 2.9 * k * th); self.put_cel(cv, m, 'pants', s, pid, far)
            stripe = m & (s > 0.15) & (s < 0.45) & (legs == 'tights'); cv.ramp[stripe] = self.ID['trim']
            d = an - kn; dn = d / (np.linalg.norm(d) + 1e-9)
            if legs == 'pants': m, s, t = capsule_field(cv, an - dn * 2.6 * k, an - dn * 1.2 * k, 3.3 * k, 3.3 * k); self.put_cel(cv, m, 'pants', s, pid, far, 1)
        self.draw_shoe(cv, J, an, kn, far, pid)

    def draw_shoe(self, cv, J, an, kn, far, pid):
        k = self.k; st = self.sp.get('shoe_type', 'sneaker')
        V = (kn - an); V = V / (np.linalg.norm(V) + 1e-9)
        fx = J['front'][0]; U = np.array([1.0 if fx >= -0.2 else -1.0, 0.0]); U = U - V * float(U @ V); U = U / (np.linalg.norm(U) + 1e-9)
        L = 7.0 * k * max(0.45, min(1.0, abs(fx) + 0.25))
        heel, toe = an - U * 1.9 * k - V * 1.3 * k, an + U * (L - 1.9 * k) - V * 1.8 * k
        if st == 'barefoot':
            m, s, t = capsule_field(cv, heel, toe, 1.9 * k, 1.5 * k); self.put_cel(cv, m, 'skin', s, pid, far); return
        if st == 'robot' or st == 'hover':
            m, s, t = capsule_field(cv, heel, toe, 2.6 * k, 2.4 * k); self.put_cel(cv, m, 'metal', s, pid, far)
            sole = m & (((cv.X - heel[0]) * -V[0] + (cv.Y - heel[1]) * -V[1]) > 1.0 * k); cv.ramp[sole] = self.ID['dark']
            if st == 'hover':
                g = an - V * 4.2 * k; m2, s2, t2 = capsule_field(cv, g - U * 3 * k, g + U * 3 * k, 1.3 * k, 1.3 * k); cv.put(m2, self.ID['accent'], np.zeros(m2.shape, np.int8), pid)
            return
        r = 2.5 * k if st != 'boot' else 2.7 * k
        m, s, t = capsule_field(cv, heel, toe, r, r * 0.9); self.put_cel(cv, m, 'shoe', s, pid, far)
        if st == 'boot':
            m2, s2, t2 = capsule_field(cv, an - V * 0.6 * k, an + V * 2.6 * k, 2.8 * k, 2.6 * k); self.put_cel(cv, m2, 'shoe', s2, pid, far)
        sole = m & (((cv.X - heel[0]) * -V[0] + (cv.Y - heel[1]) * -V[1]) > 0.8 * k); cv.ramp[sole] = self.ID['dark' if st == 'boot' else 'white']; cv.lvl[sole] = 1 + far
        if st == 'skate':
            for w in (heel + U * 0.5 * k, toe - U * 0.8 * k):
                p = w - V * 2.4 * k; m3, s3, t3 = capsule_field(cv, p, p + U * 0.2, 1.1 * k, 1.1 * k); cv.put(m3, self.ID['accent'], np.ones(m3.shape, np.int8), pid)
        else:
            cap = m & (t > 0.85) & ~sole; cv.ramp[cap] = self.ID['trim']

    # ---- arms + fists ----
    def draw_arm(self, cv, J, part, pid, wind):
        tag = part[-1]; far = 1 if tag == 'B' else 0; S = self.sc; k = self.k; big = self.big; sl = self.sp.get('sleeves', 'long')
        sh, el, hd = S(J['sh' + tag]), S(J['el' + tag]), S(J['hand' + tag]); d = hd - el; dn = d / (np.linalg.norm(d) + 1e-9)
        b4 = big ** 0.4
        if sl == 'robot':
            m, s, t = capsule_field(cv, sh, el, 3.6 * k * b4, 3.0 * k * b4); self.put_cel(cv, m, 'metal', s, pid, far)
            m, s, t = capsule_field(cv, el, hd, 3.0 * k * b4, 2.5 * k); self.put_cel(cv, m, 'metal', s, pid, far)
            mid = m & (t > 0.25) & (t < 0.75); cv.ramp[mid] = self.ID['jacket']
            m, s, t = capsule_field(cv, el - dn * 0.3, el + dn * 0.3, 2.9 * k, 2.9 * k); self.put_cel(cv, m, 'dark', s, pid, far, 1)
            fist_key = 'metal'
        else:
            if sl == 'long':
                m, s, t = capsule_field(cv, sh, el, 3.9 * k * big ** 0.3, 3.3 * k); self.put_cel(cv, m, 'sleeve', s, pid, far)
                m, s, t = capsule_field(cv, el, hd - dn * 2.6 * k, 3.3 * k, 2.8 * k); self.put_cel(cv, m, 'sleeve', s, pid, far)
                m, s, t = capsule_field(cv, hd - dn * 3.4 * k, hd - dn * 2.0 * k, 3.1 * k, 3.1 * k); self.put_cel(cv, m, 'trim', s, pid, far)
            elif sl == 'short':
                mid = sh + (el - sh) * 0.6
                m, s, t = capsule_field(cv, sh, mid, 4.0 * k * b4, 3.6 * k * b4); self.put_cel(cv, m, 'sleeve', s, pid, far)
                m, s, t = capsule_field(cv, mid, el, 3.2 * k * b4, 2.8 * k); self.put_cel(cv, m, 'skin', s, pid, far)
                m, s, t = capsule_field(cv, el, hd, 2.8 * k, 2.4 * k); self.put_cel(cv, m, 'skin', s, pid, far)
            else:
                m, s, t = capsule_field(cv, sh, el, 4.1 * k * big ** 0.5, 3.3 * k * b4); self.put_cel(cv, m, 'skin', s, pid, far)
                m, s, t = capsule_field(cv, el, hd, 3.2 * k * b4, 2.5 * k * b4); self.put_cel(cv, m, 'skin', s, pid, far)
            fist_key = 'wrap'
        fs = 1.0 + 0.25 * (big - 1); fc = hd + dn * 1.3 * k
        m, s, t = capsule_field(cv, fc - dn * 1.0 * k, fc + dn * 1.0 * k, 3.0 * k * fs, 2.8 * k * fs); self.put_cel(cv, m, fist_key, s, pid, far)
        kn_ = m & (((cv.X - fc[0]) * dn[0] + (cv.Y - fc[1]) * dn[1]) > 1.2 * k); cv.lvl[kn_] = np.minimum(4, cv.lvl[kn_] + 1)
        if 'boombox' in self.sp.get('extras', ()) and tag == 'B':   # carried on the shoulder, behind the head (drawn with the back arm)
            c = S(J['shB']) + np.array([-6.5 * k, -9.5 * k]); w, h = 9 * k, 5.5 * k
            box = (np.abs(cv.X - c[0]) < w) & (np.abs(cv.Y - c[1]) < h); cv.put(box, self.ID['metal'], np.where(cv.Y < c[1] - h * 0.4, 0, 1).astype(np.int8), pid)
            for sx in (-w * 0.5, w * 0.5):
                spk = ((cv.X - c[0] - sx) ** 2 + (cv.Y - c[1] - 0.6) ** 2) < (2.6 * k) ** 2; cv.ramp[spk] = self.ID['dark']; cv.lvl[spk] = 1
                ctr = ((cv.X - c[0] - sx) ** 2 + (cv.Y - c[1] - 0.6) ** 2) < (1.0 * k) ** 2; cv.ramp[ctr] = self.ID['accent']; cv.lvl[ctr] = 0
            hdl = (np.abs(cv.X - c[0]) < w * 0.6) & (np.abs(cv.Y - (c[1] - h - 1.2 * k)) < 0.7 * k); cv.put(hdl, self.ID['metal'], np.full(hdl.shape, 2, np.int8), pid)

    # ---- torso ----
    def draw_torso(self, cv, J, part, pid, wind):
        S = self.sc; k = self.k; sp = self.sp; wide = J['wide']; big = self.big; top = sp.get('top', 'jacket')
        pel, ab, ch, n0 = S(J['pelvis']), S(J['ab']), S(J['chest']), S(J['neck0'])
        shF, shB, wF, wB = S(J['shF']), S(J['shB']), S(J['waistF']), S(J['waistB'])
        up = n0 - pel; upn = up / (np.linalg.norm(up) + 1e-9)
        hw = max(5.0, 0.5 * float(np.linalg.norm(shF - shB)) + 3.5 * k)
        _, js, jt = capsule_field(cv, n0, pel, hw, hw)
        along = (cv.X - pel[0]) * upn[0] + (cv.Y - pel[1]) * upn[1]
        # pelvis
        m = disc_hull(cv, [pel, pel + (wF - wB) * 0.3, pel - (wF - wB) * 0.3], [5.4 * k * big ** 0.5, 4.2 * k, 4.2 * k]); self.put_cel(cv, m, 'pants' if sp.get('legs') != 'robot' else 'metal', js, pid)
        # neck
        hdp = S(J['head']); nm, ns, _ = capsule_field(cv, n0, n0 + (hdp - n0) * 0.5, 3.2 * k, 2.8 * k)
        self.put_cel(cv, nm, 'metal' if sp['head'] in ('robot', 'crt') else 'skin', ns, pid, 0, 1)
        # body hull
        body = disc_hull(cv, [shF, shB, ch, ab, wF, wB], [4.2 * k * big ** 0.4, 4.2 * k * big ** 0.4, 5.8 * k * wide, 5.6 * k * wide, 3.0 * k, 3.0 * k])
        body &= along > 1.0 * k
        face = J['front'][2]; fx = J['front'][0]
        topc = n0 + np.array([fx * 1.0, 0.8 * k]); botc = pel + up * 0.2 + np.array([fx * hw * 0.4, 0])
        width = (1.4 + 4.2 * max(0.0, face)) * k
        if top in ('jacket', 'suit', 'varsity'):
            self.put_cel(cv, body, 'jacket', js, pid)
            if top == 'varsity':   # varsity: contrasting sleeves cap the shoulders, striped hem
                for shp in (shF, shB):
                    cap = body & ((cv.X - shp[0]) ** 2 + (cv.Y - shp[1]) ** 2 < (4.4 * k) ** 2); cv.ramp[cap] = self.ID['sleeve']
                hem = body & (along < 2.6 * k); cv.ramp[hem] = self.ID['trim']
            if face > -0.2:   # open front with the tee (suit: shirt + lapels)
                tm, tsh, tt = capsule_field(cv, topc, botc, width, width + 0.8 * k); tm &= body
                cv.ramp[tm] = self.ID['tee0']; cv.lvl[tm] = np.where(tsh[tm] > 0.2, 0, 1)
                along_t = (cv.X - topc[0]) * (-upn[0]) + (cv.Y - topc[1]) * (-upn[1])
                print_ = tm & (along_t > 3.5 * k) & (along_t < 7.5 * k); cv.ramp[print_] = self.ID['tee1']
                if top == 'suit':
                    tie = tm & (np.abs((cv.X - topc[0]) * upn[1] - (cv.Y - topc[1]) * upn[0]) < 0.9 * k) & (along_t < 9 * k); cv.ramp[tie] = self.ID['accent']; cv.lvl[tie] = 1
                em, es, et = capsule_field(cv, topc, botc, width + 1.1 * k, width + 1.9 * k); edge = em & ~tm & body
                cv.lvl[edge] = np.where(es[edge] > 0, 0, 3)
            # popped collar
            for sgn in (1, -1):
                base = n0 + np.array([sgn * 3.0 * k, 1.4 * k]); tip = n0 + np.array([sgn * 3.8 * k - 0.6 * k, -2.0 * k])
                cm, cs_, ct = capsule_field(cv, base, tip, 1.8 * k, 1.1 * k); cv.put(cm, self.ID['jacket'], np.where(cs_ > 0, 0, 1 if sgn > 0 else 2).astype(np.int8), pid)
        elif top == 'tank':
            self.put_cel(cv, body, 'skin', js, pid)
            tank = body & (along < (along.max() if body.any() else 0) - 0) & (along > 1.0 * k)
            tank &= ((cv.X - n0[0]) ** 2 + (cv.Y - n0[1]) ** 2) > (4.6 * k) ** 2
            strap_cut = body & ~tank
            cv.ramp[tank] = self.ID['jacket']; cv.lvl[tank] = cel(js, 0)[tank]
            stripe = tank & (np.abs(along - (along[tank].mean() if tank.any() else 0)) < 1.1 * k); cv.ramp[stripe] = self.ID['tee1']
        else:   # armor: plated torso with accent seams
            self.put_cel(cv, body, 'metal', js, pid)
            plate = body & (np.abs(js) < 0.55); cv.ramp[plate] = self.ID['jacket']
            for a0 in (4.0 * k, 8.5 * k):
                seam = body & (np.abs(along - a0) < 0.6 * k); cv.ramp[seam] = self.ID['dark']; cv.lvl[seam] = 2
            core = body & ((cv.X - ch[0] - fx * 2 * k) ** 2 + (cv.Y - ch[1]) ** 2 < (1.6 * k) ** 2); cv.ramp[core] = self.ID['accent']; cv.lvl[core] = 0
        belt = body & (along > 1.0 * k) & (along < 2.8 * k) & ('belt' in sp.get('extras', ()))
        cv.ramp[belt] = self.ID['dark']; cv.lvl[belt] = 1
        if belt.any():
            bk = belt & (np.abs(cv.X - (pel[0] + fx * hw * 0.6)) < 1.6 * k); cv.ramp[bk] = self.ID['gold']; cv.lvl[bk] = 0
        if 'chain' in sp.get('extras', ()):
            for a in np.linspace(-1.0, 1.0, 9):
                c = n0 + np.array([a * 4.0 * k + fx * 1.5 * k, (3.0 + 2.6 * (1 - a * a)) * k])
                d = (cv.X - c[0]) ** 2 + (cv.Y - c[1]) ** 2 < (0.9 * k) ** 2; cv.put(d & body, self.ID['gold'], np.ones(d.shape, np.int8), pid)
        if 'studs' in sp.get('extras', ()):
            for shp in (shF, shB):
                for a in (-1.6, 0.0, 1.6):
                    c = shp + np.array([a * k, -2.6 * k]); d = (cv.X - c[0]) ** 2 + (cv.Y - c[1]) ** 2 < (0.7 * k) ** 2; cv.put(d, self.ID['white'], np.zeros(d.shape, np.int8), pid)
        if 'scarf' in sp.get('extras', ()):
            wx, wy = wind; a0 = n0 + np.array([0, 0.5 * k]); a1 = a0 + np.array([-(9 - wx) * k, (1 - wy * 0.3) * k]); a2 = a1 + np.array([-(7 - wx) * k, (2 - wy * 0.5) * k])
            for p0, p1, r0, r1 in ((a0, a1, 2.0 * k, 1.6 * k), (a1, a2, 1.6 * k, 0.9 * k)):
                m, s, t = capsule_field(cv, p0, p1, r0, r1); self.put_cel(cv, m, 'accent', s, pid)

    # ---- head: rule-based raster in head space ----
    def draw_head(self, cv, J, part, pid, wind):
        k = self.k; sp = self.sp; hs = sp['head']; c = self.sc(J['head'])
        robo = hs in ('robot', 'crt'); sz = 1.12 if robo else 1.0
        rx, ry = 7.6 * k * sz, 9.2 * k * sz
        face_dir = 1.0 if math.cos(math.radians(J['yh'])) >= -0.15 else -1.0
        ang = -J['ha'] * 0.8; ca, sa = math.cos(ang), math.sin(ang)
        R = int(max(rx, ry) * 2.2) + 4
        for py in range(int(c[1]) - R, int(c[1]) + R):
            if py < 0 or py >= cv.H: continue
            for px_ in range(int(c[0]) - R, int(c[0]) + R):
                if px_ < 0 or px_ >= cv.W: continue
                dx, dy = px_ + 0.5 - c[0], py + 0.5 - c[1]
                x, y = dx * ca - dy * sa, dx * sa + dy * ca
                u, v = face_dir * x / rx, y / ry
                ch = self.head_rule(hs, u, v, wind)
                if ch is None: continue
                key, lvl = ch
                cv.ramp[py, px_] = self.ID[key]; cv.lvl[py, px_] = lvl; cv.part[py, px_] = pid; cv.order[py, px_] = cv.n; cv.raw[py, px_] = 0

    def head_rule(self, hs, u, v, wind):
        """(ramp key, level) for the head pixel at (u to the face, v down) in skull-radius units, or None"""
        sp = self.sp
        skull = u * u + v * v <= 1.0
        jaw = ((u - 0.12) / 0.80) ** 2 + ((v - 0.42) / 0.62) ** 2 <= 1.0
        nose = ((u - 1.02) / 0.13) ** 2 + ((v - 0.08) / 0.15) ** 2 <= 1.0
        shade = lambda base: (0 if (u > 0.45 and v < 0.15) else 2 if (u < -0.45 or v > 0.75) else 1) + base
        lit = lambda: 0 if (u > 0.1 and v < -0.5) else 2 if (u < -0.55 or v > 0.45) else 1
        def hair(key='hair'):
            l = lit(); return (key, min(3, l + (1 if (int((u + v) * 9) % 3 == 0 and key == 'hair') else 0)))
        # ---------- machines ----------
        if hs == 'robot':
            box = abs(u) <= 0.98 and -1.0 <= v <= 0.95
            if -0.22 <= v <= -0.05 and 0.15 <= u <= 0.98: return ('accent', 0)                      # LED eye strip
            if 0.45 <= v <= 0.55 and 0.25 <= u <= 0.85 and int(u * 12) % 2 == 0: return ('dark', 1)  # grill
            if abs(u + 0.95) < 0.12 and abs(v - 0.05) < 0.12: return ('accent', 1)                   # bolt
            if abs(v + 0.55) < 0.07 and box: return ('hat', 1)                                         # brow band
            if abs(u + 0.05) < 0.06 and -1.55 <= v < -1.0: return ('metal', 2)                        # antenna
            if (u + 0.05) ** 2 + (v + 1.62) ** 2 < 0.02: return ('accent', 0)
            if box: return ('metal', 0 if (u > 0.4 and v < -0.4) else 2 if u < -0.5 else 1)
            return None
        if hs == 'crt':
            box = abs(u) <= 1.0 and -1.0 <= v <= 0.95
            scr = -0.05 <= u <= 0.85 and -0.75 <= v <= 0.6
            if scr:
                if (abs(u - 0.2) < 0.08 or abs(u - 0.62) < 0.08) and abs(v + 0.32) < 0.08: return ('accent', 0)    # eyes on the screen
                if abs(v - 0.25) < 0.05 and 0.15 <= u <= 0.7: return ('accent', 0)                                  # mouth
                return ('dark', 1 if int((v + 1) * 14) % 2 else 2)                                                   # scanlines
            for sg in (-0.35, 0.35):
                t = (-1.0 - v) / 0.6
                if 0 <= t <= 1 and abs(u - (sg + sg * t * 0.6)) < 0.06: return ('hat', 2)
            if box: return ('hat', 0 if v < -0.7 else 2 if u < -0.6 else 1)
            return None
        # ---------- head types drawn ABOVE the face ----------
        if hs == 'mohawk':
            for i in range(6):
                bu = 0.55 - i * 0.28; top_v = -math.sqrt(max(0, 1 - bu * bu)); h = 0.75 + 0.2 * math.sin(i * 2.1)
                if abs(u - bu) < 0.13 * (1 - (top_v - v) / h) and top_v - h <= v <= top_v + 0.15: return hair()
            if skull and v < -0.55 and abs(u) < 0.95: return ('skin', 2)                                  # shaved sides
        elif hs == 'cap':
            if skull and v < -0.25: return ('hat', 0 if (u > 0.1 and v < -0.7) else 1 if u > -0.5 else 2)
            if -0.32 <= v <= -0.2 and 0.6 <= u <= 1.55: return ('hat', 2)                                  # visor
            if (u - 0.25) ** 2 + (v + 0.6) ** 2 < 0.02: return ('accent', 0)
        elif hs == 'headphones':
            if ((u + 0.15) / 0.36) ** 2 + ((v - 0.05) / 0.38) ** 2 <= 1: return ('hat', 1 if u > -0.2 else 2)
            if abs(u + 0.15) < 0.09 and -1.12 <= v <= -0.3 and (u * u + v * v) > 0.8: return ('hat', 2)
            if skull and (v < -0.4 or u < -0.35): return hair()
        elif hs == 'helmet':
            if -0.25 <= v <= 0.0 and 0.25 <= u <= 1.0 and skull: return ('dark', 1)
            if abs(v + 0.12) < 0.03 and 0.3 <= u <= 1.0: return ('accent', 0)
            if (u * u + v * v <= 1.1) and v < 0.35: return ('hat', 0 if (u > 0.2 and v < -0.55) else 2 if u < -0.5 else 1)
        elif hs == 'beanie':
            if (u + 0.05) ** 2 + (v + 1.22) ** 2 < 0.06: return ('hat', 0)
            if skull and -0.5 <= v <= -0.32: return ('accent', 1)
            if skull and v < -0.32: return ('hat', 0 if (u > 0.1 and v < -0.75) else 1 if u > -0.4 else 2)
            if skull and u < -0.45 and v < 0.4: return hair()
        elif hs == 'bandana':
            if skull and -0.62 <= v <= -0.42: return ('hat', 1)
            t = -u - 0.85
            if 0 <= t <= 0.55 and abs(v - (-0.5 + t * 0.4 + wind[1] * 0.02)) < 0.1 - t * 0.08: return ('hat', 1)
            if skull and (v < -0.42 or u < -0.4): return hair()
        elif hs in ('shades', 'slick'):
            if sp['kind'] == 'boss1':   # afro
                if (((u + 0.15) / 1.3) ** 2 + ((v + 0.45) / 1.1) ** 2 <= 1) and (v < -0.3 or u < -0.35): return hair()
            elif skull and (v < -0.5 or u < -0.45): return ('hair', 0 if (v < -0.8 and u > 0) else 1 if (int(u * 8) % 3) else 2)
        elif hs == 'visor':
            if -0.22 <= v <= -0.04 and 0.18 <= u <= 1.05: return ('accent', 0 if u > 0.6 else 1)
            if skull and (v < -0.45 or u < -0.4): return hair()
        elif hs == 'blonde':
            if skull and -0.7 <= v <= -0.55: return ('hat', 1)
            big = ((u + 0.1) / 1.18) ** 2 + ((v + 0.1) / 1.16) ** 2 <= 1
            curls = ((u + 0.75) / 0.45) ** 2 + ((v - 0.55) / 0.75) ** 2 <= 1
            if (big and (v < -0.45 or u < -0.3)) or curls: return hair()
        # shades on top of the face
        if (hs == 'shades' or sp.get('shades')) and -0.24 <= v <= -0.02 and 0.25 <= u <= 1.0:
            return ('white', 0) if (abs(u - 0.5) < 0.05 and v < -0.15) else ('dark', 1)
        # ---------- face ----------
        if not (skull or jaw or nose): return None
        if ((u + 0.22) / 0.14) ** 2 + ((v - 0.08) / 0.22) ** 2 <= 1: return ('skin', 2)                     # ear
        if not self.hurt:
            if abs(u - 0.40) < 0.10 and abs(v + 0.08) < 0.08: return ('white', 0)
            if abs(u - 0.53) < 0.05 and abs(v + 0.08) < 0.08: return ('dark', 1)
        elif abs(v + 0.06) < 0.04 and 0.32 <= u <= 0.58: return ('dark', 1)                                    # eyes shut when hurt
        if abs(u - 0.85) < 0.05 and abs(v + 0.08) < 0.08 and not self.hurt: return ('dark', 1)                 # far eye
        if -0.28 <= v <= -0.19 and (0.30 <= u <= 0.62 or 0.76 <= u <= 0.95): return ('hair', 3)              # brows
        if abs(v - 0.5) < 0.05 and 0.45 <= u <= 0.78: return ('skin', 4)                                       # mouth
        if u < -0.4 and not jaw: return ('skin', 2)
        return ('skin', shade(0) if not nose else 1)

    # ------------------------------------------------------------------ finishing (same as the hero)
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
            m = filled & (cv.ramp == rid); ramp = self.ramps[rid]
            for lv in range(5):
                mm = m & (np.clip(lvl, 0, 4) == lv)
                if mm.any(): img[mm, :3] = ramp[lv]; img[mm, 3] = 255
        out = np.zeros((H, W), bool)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)): out |= np.roll(np.roll(filled, dy, 0), dx, 1)
        out &= ~filled; img[out, :3] = CONTOUR; img[out, 3] = 255
        rim = np.zeros((H, W, 4), np.uint8)
        rx = out & np.roll(filled, -1, 1) & ~np.roll(filled, 1, 1)
        ys = np.nonzero(filled.any(1))[0]
        if len(ys):
            rx[ys.min() + int((ys.max() - ys.min()) * 0.62):] = False
            rim[rx, :3] = RIM; rim[rx, 3] = 255
        return Image.fromarray(img, 'RGBA'), Image.fromarray(rim, 'RGBA')


if __name__ == '__main__':
    from make_enemy_sprites import ROSTER, frame_plan
    from build_enemy_sheets import enemy_yaws, EU
    keys = sys.argv[1:]; roster = [s for s in ROSTER if not keys or s['key'] in keys]
    want = ('idle0', 'walk2', 'hurt', 'jab_s', 'hay_s', 'throw_s', 'flykick_s', 'charge_s', 'slam_s', 'point_s')
    rows = []
    for sp in roster:
        ch = PixelEnemy(sp, EU); plan = [f for f in frame_plan(sp) if f[0] in want][:4]
        row = Image.new('RGBA', (len(plan) * ch.FS, ch.FS), (52, 36, 100, 255))
        for i, (name, pose, wind) in enumerate(plan):
            yb, yh, tw = enemy_yaws(name); w = (max(-4, min(5, pose['lean'] * 8 + wind[0])), wind[1])
            b, r = ch.render(pose, yb, yh, tw, w, name); b.alpha_composite(r); row.alpha_composite(b, (i * ch.FS, 0))
        rows.append(row)
    W_ = max(r.width for r in rows); H_ = sum(r.height for r in rows)
    sheet = Image.new('RGBA', (W_, H_), (52, 36, 100, 255)); y = 0
    for r in rows: sheet.alpha_composite(r, (0, y)); y += r.height
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'enemy_pixel_preview.png'); sheet.save(out); print(out, sheet.size)

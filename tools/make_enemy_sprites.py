"""Enemy + boss spritesheets, same pixel-art pipeline as the hero (tools/make_hero_sprites.py):
hue-shifted ramps per colour, ramp-index shading (light top-left), selective outlines, hand-built heads.
24 characters (4 levels x 5 enemies + 4 bosses). Outputs assets/enemies/*.png + .json and js/enemySprites.js.
usage: python tools/make_enemy_sprites.py [preview]"""
import base64, colorsys, io, json, math, os, re, sys
from multiprocessing import Pool
from PIL import Image, ImageDraw, ImageChops, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PK = ['hx', 'hy', 'lean', 'tilt', 'hFx', 'hFy', 'hBx', 'hBy', 'fFx', 'fFy', 'fBx', 'fBy']
R0 = dict(thigh=14, shin=14, upper=10, fore=10, torso=17, neck=12)
OUT = (36, 18, 48, 255)

def H(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)

REV = {}
def mk_ramp(hexc, base_lift=0.0):
    """5-step ramp: 0 light, 1 base, 2..4 shadows. lights drift warm, shadows drift violet."""
    r, g, b = [v / 255 for v in H(hexc)[:3]]; h, s, v = colorsys.rgb_to_hsv(r, g, b)
    def toward(h0, tgt, f):
        d = ((tgt - h0 + 0.5) % 1) - 0.5; return (h0 + d * f) % 1
    steps = [(+0.16, -0.10, 0.12, 0.10), (0.0, 0.0, 0.0, 0.0), (-0.13, 0.05, 0.72, 0.10), (-0.26, 0.09, 0.72, 0.22), (-0.38, 0.12, 0.72, 0.32)]
    out = []
    for dv, ds, tgt, f in steps:
        hh = toward(h, 0.12 if dv > 0 else tgt, f) if f else h
        vv = min(1, max(0.07, v + dv * (1.0 if v > 0.25 else 0.75))); ss = min(1, max(0, s + ds))
        rr, gg, bb = colorsys.hsv_to_rgb(hh, ss, vv); c = (int(rr * 255), int(gg * 255), int(bb * 255), 255)
        out.append(c)
    for i, c in enumerate(out): REV[c] = (out, i)
    return out

def ramp_shift(c, d):
    k = REV.get(c)
    if k:
        rp, i = k; return rp[max(0, min(len(rp) - 1, i + d))]
    f = 1.18 if d < 0 else 0.72 ** d
    return (min(255, int(c[0] * f)), min(255, int(c[1] * f)), min(255, int(c[2] * f)), c[3])
def deep_of(c):
    k = REV.get(c); return k[0][-1] if k else OUT

# ---------------- poses ----------------
src = open(os.path.join(ROOT, 'js', 'rig.js'), encoding='utf8').read()
block = src[src.index('const POSES = {'):src.index('// ----- procedural cycles')]
POSES = {m.group(1): dict(zip(PK, [float(x) for x in m.group(2).split(',')])) for m in re.finditer(r'(\w+):\s+P\(([^)]*)\)', block)}
def lerp_pose(a, b, t): return {k: a[k] + (b[k] - a[k]) * t for k in PK}
def idle_pose(b, hfx, base):
    p = dict(base); p['hy'] += b * 0.9; p['hFy'] += b * 1.4; p['hBy'] += b * 1.1; p['hFx'] += hfx * 1.2; p['lean'] += b * 0.012; return p
def walk_pose(ph, base, amp=1.0):
    p = dict(base); s, c = math.sin(ph), math.cos(ph)
    p['fFx'] += s * 11 * amp; p['fFy'] += max(0, c) * 6 * amp; p['fBx'] -= s * 11 * amp; p['fBy'] += max(0, -c) * 6 * amp
    p['hy'] -= abs(c) * 1.6 * amp; p['hx'] += s * 0.6; p['hFy'] += math.sin(ph * 2) * 1.2; p['hBy'] -= math.sin(ph * 2) * 1.2; return p

def stance_for(spec):
    """mirror of Enemy.enemyStance() in js/enemies.js"""
    st = dict(POSES['stance']); k = spec['kind']
    if k in ('heavy', 'boss1', 'boss3'): st['hFy'] -= 6; st['hBy'] -= 4; st['hFx'] -= 2; st['lean'] = 0.02; st['fFx'] += 3; st['fBx'] -= 3
    if k == 'thrower': st['hFy'] -= 12; st['hBy'] -= 12; st['lean'] = 0
    if k in ('fast', 'boss2'): st['hy'] -= 2; st['fFx'] += 3; st['fBx'] -= 3
    if spec.get('robotic'): st['lean'] = 0
    return st

def ik(rx, ry, tx, ty, l1, l2, bend):
    dx, dy = tx - rx, ty - ry; d = math.hypot(dx, dy); mx = l1 + l2 - 0.05
    if d > mx: dx *= mx / d; dy *= mx / d; d = mx
    if d < 0.6:
        d = 0.6
        if dx == 0 and dy == 0: dy = -0.6
    a = (l1 * l1 - l2 * l2 + d * d) / (2 * d); h = math.sqrt(max(0, l1 * l1 - a * a)); ux, uy = dx / d, dy / d
    return (rx + ux * a - uy * h * bend, ry + uy * a + ux * h * bend, rx + dx, ry + dy)

def joints(p, S):
    R = {k: v * S for k, v in R0.items()}
    q = {k: (v * S if k not in ('lean', 'tilt') else v) for k, v in p.items()}
    j = {}
    su = (math.sin(q['lean']), math.cos(q['lean'])); pv = (math.cos(q['lean']), -math.sin(q['lean']))
    j['hip'] = (q['hx'], q['hy']); j['su'] = su; j['pv'] = pv
    j['chest'] = (q['hx'] + su[0] * R['torso'], q['hy'] + su[1] * R['torso'])
    ha = q['lean'] + q['tilt']; j['ha'] = ha
    j['head'] = (j['chest'][0] + math.sin(ha) * R['neck'], j['chest'][1] + math.cos(ha) * R['neck'])
    shF = (j['chest'][0] + pv[0] * 3 * S - su[0] * 1.5 * S, j['chest'][1] + pv[1] * 3 * S - su[1] * 1.5 * S)
    shB = (j['chest'][0] - pv[0] * 3 * S - su[0] * 1.5 * S, j['chest'][1] - pv[1] * 3 * S - su[1] * 1.5 * S)
    j['shF'], j['shB'] = shF, shB
    j['aF'] = ik(shF[0], shF[1], q['hFx'], q['hFy'], R['upper'], R['fore'], -1)
    j['aB'] = ik(shB[0], shB[1], q['hBx'], q['hBy'], R['upper'], R['fore'], -1)
    j['hpF'] = (q['hx'] + pv[0] * 1.5 * S, q['hy'] + pv[1] * 1.5 * S); j['hpB'] = (q['hx'] - pv[0] * 1.5 * S, q['hy'] - pv[1] * 1.5 * S)
    j['lF'] = ik(j['hpF'][0], j['hpF'][1], q['fFx'], q['fFy'], R['thigh'], R['shin'], 1)
    j['lB'] = ik(j['hpB'][0], j['hpB'][1], q['fBx'], q['fBy'], R['thigh'], R['shin'], 1)
    return j

# ---------------- shading / compositing ----------------
def hard(im):
    a = im.getchannel('A').point(lambda v: 255 if v > 110 else 0); im.putalpha(a); return a
def recolor(layer, mask, d):
    pl, pm = layer.load(), mask.load()
    for y in range(layer.height):
        for x in range(layer.width):
            if pm[x, y] and pl[x, y][3]: pl[x, y] = ramp_shift(pl[x, y], d)
def shade(layer, thick=1):
    a = layer.getchannel('A')
    hi = ImageChops.subtract(a, ImageChops.offset(a, 1, 1))
    lo1 = ImageChops.subtract(a, ImageChops.offset(a, -1, -1))
    lo2 = ImageChops.subtract(a, ImageChops.offset(a, -2, -2)) if thick > 1 else lo1
    out = layer.copy(); recolor(out, lo2, 1); recolor(out, lo1, 1); recolor(out, hi, -1); return out
def add_part(frame, fn, thick=1, do_shade=True, outline=True):
    layer = Image.new('RGBA', frame.size, (0, 0, 0, 0)); fn(ImageDraw.Draw(layer), layer)
    a = hard(layer)
    if do_shade: layer = shade(layer, thick)
    fa = frame.getchannel('A')
    cast = ImageChops.multiply(ImageChops.subtract(ImageChops.offset(a, 1, 1), a), fa)
    recolor(frame, cast, 1)
    if outline:
        ring = ImageChops.multiply(ImageChops.subtract(a.filter(ImageFilter.MaxFilter(3)), a), fa)
        pl, pr, pf = layer.load(), ring.load(), frame.load(); dom = {}
        for y in range(frame.height):
            for x in range(frame.width):
                if pl[x, y][3]: dom[pl[x, y]] = dom.get(pl[x, y], 0) + 1
        dc = deep_of(max(dom, key=dom.get)) if dom else OUT
        for y in range(frame.height):
            for x in range(frame.width):
                if pr[x, y]: pf[x, y] = dc
    frame.alpha_composite(layer)
def silhouette(frame):
    a = frame.getchannel('A'); ring = ImageChops.subtract(a.filter(ImageFilter.MaxFilter(3)), a)
    ol = Image.new('RGBA', frame.size, OUT); ol.putalpha(ring); frame.alpha_composite(ol)

# ---------------- character painter ----------------
class Char:
    def __init__(self, spec):
        self.sp = spec; self.S = spec.get('S', 1.0)
        S = self.S
        self.fs = 96 if S <= 1.05 else 128 if S <= 1.3 else 144 if S <= 1.45 else 160
        self.ox, self.oy = self.fs // 2, self.fs - 8
        g = lambda k, dflt: mk_ramp(spec.get(k, dflt))
        self.skin = g('skin', '#e2a887'); self.hair = g('hair', '#2a1a12'); self.jk = g('jacket', '#333344')
        self.tee = g('tee0', '#dddddd'); self.tee2 = g('tee1', '#888888'); self.pants = g('pants', '#223355'); self.trim = g('trim', '#ff2fd0')
        self.shoe = g('shoe', '#eeeeee'); self.wrap = g('wrap', '#dd3344'); self.acc = g('accent', '#ff2fd0'); self.hat = g('hat', '#ff2fd0')
        self.sleeve = g('sleeve', spec.get('jacket', '#333344')); self.metal = g('metal', spec.get('skin', '#8a94a8'))
        self.white = mk_ramp('#f4eef6'); self.gold = mk_ramp('#ffd44a'); self.dark = mk_ramp('#1c1830')
        self.head_img = self.make_head()

    def px(self, pt): return (int(round(self.ox + pt[0])), int(round(self.oy - pt[1])))
    def circ(self, d, c, r, col): d.ellipse([c[0] - r + 0.5, c[1] - r + 0.5, c[0] + r - 0.5, c[1] + r - 0.5], fill=col)
    def tapered(self, d, a, b, r1, r2, col, caps=True):
        a, b = self.px(a), self.px(b); dx, dy = b[0] - a[0], b[1] - a[1]; n = math.hypot(dx, dy) or 1; nx, ny = -dy / n, dx / n
        d.polygon([(a[0] + nx * r1, a[1] + ny * r1), (b[0] + nx * r2, b[1] + ny * r2), (b[0] - nx * r2, b[1] - ny * r2), (a[0] - nx * r1, a[1] - ny * r1)], fill=col)
        if caps: self.circ(d, a, r1, col); self.circ(d, b, r2, col)
    def poly(self, d, pts, col): d.polygon([self.px(p) for p in pts], fill=col)
    def lerp(self, a, b, t): return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)

    # ---------- head ----------
    def make_head(self):
        S, sp = self.S, self.sp; hs = sp['head']
        HC = int(round(48 * S)); im = Image.new('RGBA', (HC, HC), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        T = lambda x, y: ((x + 6) * S, (y + 6) * S)
        def poly(pts, col): d.polygon([T(*p) for p in pts], fill=col)
        def box(x, y, w, h, col):
            x0, y0 = int(round((x + 6) * S)), int(round((y + 6) * S)); x1, y1 = max(x0, int(round((x + w + 6) * S)) - 1), max(y0, int(round((y + h + 6) * S)) - 1)
            d.rectangle([x0, y0, x1, y1], fill=col)
        def line(a, b, col, w=1): d.line([T(*a), T(*b)], fill=col, width=max(1, int(round(w * S))))
        def ell(x0, y0, x1, y1, col): d.ellipse([T(x0, y0), T(x1, y1)], fill=col)
        sk, hr, hat, acc = self.skin, self.hair, self.hat, self.acc
        eyec = H('#1c1830')
        if hs in ('robot', 'crt'):
            m = self.metal
            if hs == 'robot':
                poly([(10, 6), (26, 5), (30, 9), (31, 24), (28, 31), (14, 32), (9, 26)], m[1])
                poly([(9, 24), (30, 24), (28, 31), (14, 32)], m[2])                                  # jaw plate
                poly([(9, 6), (16, 5), (16, 12), (9, 12)], hat[1])                                   # brow plate
                box(14, 14, 16, 6, self.dark[3]); box(15, 16, 14, 2, acc[0]); box(17, 15, 2, 4, acc[1])   # visor slit
                box(19, 25, 9, 1, m[3]); box(19, 27, 9, 1, m[3]); box(9, 15, 3, 6, hat[2]); box(6, 14, 3, 3, acc[1])
                line((15, 5), (15, -2), m[3], 1); box(14, -4, 3, 3, acc[0])                          # antenna
            else:
                poly([(6, 4), (30, 3), (33, 8), (33, 31), (29, 34), (8, 33), (5, 28)], m[1]); box(8, 6, 22, 24, self.dark[4])   # CRT casing + dead screen
                box(8, 6, 22, 24, self.dark[4])
                box(11, 12, 5, 6, acc[0]); box(22, 12, 5, 6, acc[0]); box(13, 14, 2, 2, self.dark[4]); box(24, 14, 2, 2, self.dark[4])   # eyes
                for x in range(11, 27, 2): box(x, 23 + (x % 4 == 1), 2, 2, acc[0])                    # zig-zag grin
                for y in range(8, 30, 3): box(8, y, 22, 1, acc[3])                                   # scanlines
                line((12, 3), (8, -4), m[3], 1); line((22, 3), (28, -4), m[3], 1); box(7, -6, 3, 3, acc[0]); box(27, -6, 3, 3, acc[0])
        else:
            # ---- back hair mass (behind the face) ----
            back = Image.new('RGBA', (HC, HC), (0, 0, 0, 0)); bd = ImageDraw.Draw(back)
            def bell(x0, y0, x1, y1, col): bd.ellipse([T(x0, y0), T(x1, y1)], fill=col)
            if hs in ('mohawk', 'slick', 'shades', 'visor', 'headphones', 'cap', 'beanie', 'bandana'): bell(4, 3, 25, 24, hr[2])
            if hs == 'blonde': bell(-1, -3, 26, 30, hr[1]); poly([(0, 20), (10, 22), (9, 34), (1, 36), (-2, 28)], hr[2])
            # ---- face ----
            face = [(11, 11), (15, 9), (22, 10), (26, 13), (27, 17), (28, 20), (28, 23), (26, 26), (24, 29), (19, 31), (14, 29), (12, 22)]
            poly(face, sk[1])
            fm = im.getchannel('A').copy()
            if S <= 1.05:
                px_ = im.load(); pm = fm.load()
                for y in range(HC):
                    for x in range(HC):
                        if pm[x, y]:
                            below = pm[x, y + 1] if y + 1 < HC else 0; right = pm[x + 1, y] if x + 1 < HC else 0
                            above = pm[x, y - 1] if y else 0; left = pm[x - 1, y] if x else 0
                            if not below or not right: px_[x, y] = sk[2]
                            if not below and not right: px_[x, y] = sk[3]
                            if not above or not left: px_[x, y] = sk[0]
            poly([(24, 18), (27, 20), (29, 22), (28, 24), (24, 24)], sk[1]); line((24, 18), (24, 23), sk[2]); box(28, 21, 1, 1, sk[0]); box(25, 24, 3, 1, sk[3])
            ell(11, 16, 15, 22, sk[2]); box(13, 18, 1, 2, sk[3])                                     # ear
            eye = self.sp.get('eyes', '#1c1830'); ecol = H(eye)
            if hs not in ('shades', 'visor', 'slick_shades'):
                for (ex, ey, w) in [(17, 17, 4), (24, 17, 3)]:
                    box(ex, ey, w + 1, 2, H('#f6f4ff')); box(ex + w - 2, ey, 2, 2, ecol)
                    box(ex - 1, ey - 2, w + 3, 1, hr[3] if hs != 'blonde' else self.dark[3])
                line((16, 14), (21, 13), hr[3], 2); line((23, 13), (28, 14), hr[3], 2)
            box(21, 28, 5, 1, H('#a84e5a')) if hs != 'blonde' else box(21, 27, 5, 2, H('#e0405a'))
            # ---- front headgear / hair ----
            front = Image.new('RGBA', (HC, HC), (0, 0, 0, 0)); fd = ImageDraw.Draw(front)
            def fpoly(pts, col): fd.polygon([T(*p) for p in pts], fill=col)
            def fbox(x, y, w, h, col):
                x0, y0 = int(round((x + 6) * S)), int(round((y + 6) * S)); x1, y1 = max(x0, int(round((x + w + 6) * S)) - 1), max(y0, int(round((y + h + 6) * S)) - 1)
                fd.rectangle([x0, y0, x1, y1], fill=col)
            def fline(a, b, col, w=1): fd.line([T(*a), T(*b)], fill=col, width=max(1, int(round(w * S))))
            def fell(x0, y0, x1, y1, col): fd.ellipse([T(x0, y0), T(x1, y1)], fill=col)
            fringe = [(8, 5), (25, 6), (28, 11), (25, 10), (24, 13), (21, 11), (18, 13), (15, 10), (11, 12), (8, 12)]
            if hs == 'mohawk':
                fpoly([(7, 10), (13, 9), (14, 16), (12, 22), (8, 20)], sk[3])                              # shaved side
                for i in range(6):
                    x = 6 + i * 4; hgt = 12 + (i % 2) * 3 + (2 if i in (2, 3) else 0)
                    fpoly([(x - 2, 9), (x + 1, 9 - hgt), (x + 3, 9)], hr[1 if i % 2 else 2])
                fpoly([(7, 6), (27, 8), (27, 10), (7, 10)], hr[2]); fline((8, 8), (26, 9), hr[0])
            elif hs == 'cap':
                fell(6, 0, 27, 18, hat[1]); fpoly([(8, 8), (27, 9), (29, 12), (8, 13)], hat[1]); fpoly([(24, 10), (36, 13), (35, 16), (24, 14)], hat[2])   # dome + brim
                fbox(15, 4, 4, 4, acc[0]); fline((9, 8), (26, 9), hat[0])
                fpoly([(6, 14), (11, 14), (10, 24), (4, 22)], hr[2])
            elif hs == 'headphones':
                fpoly(fringe, hr[2]); fell(7, 0, 27, 14, hr[2]); fline((8, 6), (26, 6), hr[0])
                fd.arc([T(8, 0), T(26, 22)], 200, 350, fill=hat[2], width=max(1, int(2 * S)))
                fell(10, 13, 17, 23, hat[1]); fell(12, 15, 15, 21, acc[0]); fline((10, 8), (16, 1), hat[2], 2)
            elif hs == 'helmet':
                fell(5, 0, 29, 24, hat[1]); fpoly([(6, 12), (29, 13), (29, 17), (6, 17)], hat[1])
                fpoly([(14, 13), (30, 14), (30, 19), (14, 19)], self.dark[3]); fbox(16, 14, 12, 1, acc[0]); fbox(26, 15, 2, 3, H('#ffffff'))
                fline((10, 3), (24, 3), hat[0], 1); fbox(6, 20, 8, 5, hat[2])
            elif hs == 'beanie':
                fpoly(fringe, hr[2]); fell(6, 0, 28, 16, hat[1]); fbox(7, 9, 21, 5, acc[1]); fbox(7, 9, 21, 1, acc[0])
                for x in range(9, 27, 3): fbox(x, 3, 1, 5, hat[2])
                fell(15, -6, 21, 0, hat[0])
            elif hs == 'bandana':
                fell(6, 0, 27, 14, hr[2]); fpoly(fringe[:6], hr[2]); fbox(6, 8, 23, 4, hat[1]); fbox(6, 8, 23, 1, hat[0])
                fpoly([(6, 8), (0, 6), (-3, 12), (3, 12)], hat[1]); fpoly([(6, 11), (0, 13), (-2, 19), (4, 15)], hat[2])
                for x in range(9, 27, 4): fbox(x, 9, 1, 1, H('#ffffff'))
            elif hs in ('shades', 'slick'):
                fell(7, 0, 28, 15, hr[2]); fpoly([(8, 8), (28, 9), (28, 11), (14, 11), (9, 15)], hr[2])
                fline((9, 4), (26, 5), hr[0]); fline((9, 7), (26, 8), hr[1])
                if hs == 'shades' or self.sp.get('shades'):
                    fpoly([(15, 15), (29, 14), (30, 20), (26, 21), (16, 20)], self.dark[4]); fbox(17, 16, 4, 1, acc[0]); fbox(24, 16, 3, 1, acc[0]); fline((13, 16), (16, 16), self.dark[4])
                    fbox(17, 12, 12, 2, hr[3])
                else:
                    for (ex, ey, w) in [(17, 17, 4), (24, 17, 3)]:
                        fbox(ex, ey, w + 1, 2, H('#f6f4ff')); fbox(ex + w - 2, ey, 2, 2, ecol)
                    fline((16, 14), (21, 13), hr[3], 2); fline((23, 13), (28, 14), hr[3], 2)
            elif hs == 'visor':
                fell(7, 0, 28, 15, hr[2]); fpoly([(8, 8), (28, 9), (28, 11), (14, 11), (9, 15)], hr[2]); fline((10, 4), (26, 5), hr[0])
                fpoly([(13, 14), (30, 13), (31, 20), (14, 21)], self.dark[4]); fbox(15, 16, 15, 2, acc[0]); fbox(15, 16, 15, 1, H('#ffffff'))
            elif hs == 'blonde':
                fpoly([(6, 4), (26, 3), (30, 11), (27, 12), (25, 9), (24, 14), (21, 10), (19, 15), (16, 10), (13, 14), (10, 11), (6, 14)], hr[1])
                fell(5, -2, 26, 12, hr[1]); fline((8, 3), (24, 3), hr[0]); fline((7, 6), (22, 7), hr[0]); fbox(8, 9, 21, 3, hat[1]); fbox(8, 9, 21, 1, hat[0])
            hd = im.copy()
            out = back.copy(); out.alpha_composite(im); out.alpha_composite(front); im = out
        hard(im)
        return im

    # ---------- parts ----------
    def arm(self, sh, a, o):
        S, sp = self.S, self.sp; sl = sp.get('sleeves', 'long'); big = sp.get('bulk', 1.0)
        def f(d, layer):
            e, h = (a[0], a[1]), (a[2], a[3])
            wr = self.wrap
            if sl == 'robot':
                m = self.metal
                self.tapered(d, sh, e, 3.8 * S * big, 3.2 * S * big, m[1 + o]); self.circ(d, self.px(e), 3.3 * S, self.dark[2 + min(o, 1)])
                self.tapered(d, e, h, 3.0 * S * big, 2.6 * S * big, m[2 + o if o == 0 else 2]); self.tapered(d, self.lerp(e, h, .25), self.lerp(e, h, .7), 3.3 * S, 3.3 * S, self.jk[1 + o], caps=False)
                self.circ(d, self.px(h), 3.6 * S, m[1 + o]); hp = self.px(h); self.circ(d, (hp[0] + 1, hp[1]), 1.7 * S, self.acc[0])
            else:
                sk = self.skin
                if sl == 'long':
                    self.tapered(d, sh, e, 3.5 * S, 2.9 * S, self.sleeve[1 + o]); self.tapered(d, self.lerp(sh, e, .68), e, 3.3 * S, 3.0 * S, self.sleeve[0 + o], caps=False)
                    self.tapered(d, e, h, 2.9 * S, 2.6 * S, self.sleeve[1 + o]); self.tapered(d, self.lerp(e, h, .78), h, 2.9 * S, 2.9 * S, self.trim[1 + o], caps=False)
                elif sl == 'short':
                    self.tapered(d, e, h, 2.5 * S * big, 2.1 * S * big, sk[1 + o]); self.tapered(d, sh, self.lerp(sh, e, .8), 3.7 * S * big, 3.3 * S * big, self.sleeve[1 + o])
                else:  # bare / muscular
                    self.tapered(d, sh, e, 3.7 * S * big, 3.0 * S * big, sk[1 + o]); self.tapered(d, e, h, 3.0 * S * big, 2.4 * S * big, sk[1 + o])
                    self.tapered(d, self.lerp(sh, e, .25), self.lerp(sh, e, .6), 3.9 * S * big, 3.9 * S * big, sk[0 + o], caps=False)   # bicep highlight
                if sl != 'long':
                    self.tapered(d, self.lerp(e, h, .32), h, 2.8 * S, 2.8 * S, wr[1 + o])
                hp = self.px(h); self.circ(d, hp, 3.4 * S, wr[1 + o] if sl != 'long' else wr[1 + o]); self.circ(d, (hp[0] + 1, hp[1]), 1.5 * S, wr[3 + min(o, 1)])
                d.point((hp[0] - 2, hp[1] - 1), fill=wr[0])
        return f

    def foot(self, d, knee, ank, o):
        S, sp = self.S, self.sp; st = sp.get('shoe_type', 'sneaker')
        dx, dy = ank[0] - knee[0], ank[1] - knee[1]; n = math.hypot(dx, dy) or 1; dx, dy = dx / n, dy / n
        U, V = (-dy, dx), (-dx, -dy)
        if U[0] < 0: U = (-U[0], -U[1])
        T = lambda u, v: (ank[0] + (U[0] * u + V[0] * v) * S, ank[1] + (U[1] * u + V[1] * v) * S)
        sh = self.shoe; poly = lambda pts, col: d.polygon([self.px(p) for p in pts], fill=col)
        if st == 'barefoot':
            poly([T(-3, -2.5), T(-3, 3), T(1, 3.5), T(3, 1.5), T(8, 0.8), T(9, -1), T(8.5, -2.5)], self.skin[1 + o]); poly([T(5, .5), T(9, -.2), T(9, -1.4), T(5.5, -1)], self.skin[0 + o])
            return
        tall = 6.5 if st in ('boot', 'robot', 'hover') else 5.5
        poly([T(-3.5, -2.5), T(-3.5, tall), T(0, tall + 1), T(2.5, 3), T(6.5, 2), T(9, 0.2), T(9, -2.5)], sh[1 + o])
        poly([T(-3.5, -2.5), T(-3.5, -0.6), T(9, -0.6), T(9, -2.5)], sh[3 + min(o, 1)])
        poly([T(6.5, 2), T(9, 0.2), T(8.5, -0.8), T(5.5, -0.8)], sh[0 + o])
        col = self.trim if st in ('sneaker', 'skate') else self.acc
        d.line([self.px(T(-1, 3.4)), self.px(T(3.2, 0.4))], fill=col[1 + o], width=1)
        if st == 'skate':
            for u in (0.5, 6): self.circ(d, self.px(T(u, -3.4)), 1.6 * S + 0.4, self.dark[1]); d.point(self.px(T(u, -3.4)), fill=self.acc[0])
            poly([T(-2, -2.5), T(8, -2.5), T(8, -3.4), T(-2, -3.4)], self.dark[2])
        if st in ('robot', 'hover'):
            d.line([self.px(T(-3, 2)), self.px(T(0, 5))], fill=self.acc[0], width=1)
        if st == 'hover':
            for k in range(3): self.circ(d, self.px(T(2 + k * 2.5, -4.5)), 1.4 * S, self.acc[0 + (k % 2)])

    def leg(self, hp, l, o):
        S, sp = self.S, self.sp; lt = sp.get('legs', 'pants'); big = sp.get('bulk', 1.0)
        def f(d, layer):
            knee, ank = (l[0], l[1]), (l[2], l[3]); pa, sk, tr = self.pants, self.skin, self.trim
            if lt == 'robot':
                m = self.metal
                self.tapered(d, hp, knee, 4.8 * S, 3.6 * S, m[1 + o]); self.circ(d, self.px(knee), 3.4 * S, self.dark[2 + min(o, 1)])
                self.tapered(d, self.lerp(hp, knee, .1), self.lerp(hp, knee, .7), 3.0 * S, 3.0 * S, pa[1 + o], caps=False)
                self.tapered(d, knee, ank, 3.5 * S, 2.7 * S, pa[1 + o]); self.tapered(d, self.lerp(knee, ank, .2), self.lerp(knee, ank, .7), 3.8 * S, 3.8 * S, m[0 + o], caps=False)
                d.line([self.px(self.lerp(hp, knee, .2)), self.px(self.lerp(knee, ank, .8))], fill=tr[0], width=1)
            elif lt == 'shorts':
                self.tapered(d, hp, knee, 4.6 * S * big, 3.4 * S * big, sk[1 + o]); mid = self.lerp(hp, knee, .6)
                self.tapered(d, hp, mid, 5.6 * S * big, 4.9 * S * big, pa[1 + o]); self.tapered(d, self.lerp(hp, knee, .54), mid, 4.9 * S * big, 4.9 * S * big, tr[1 + o], caps=False)
                self.tapered(d, knee, ank, 3.3 * S * big, 2.4 * S, sk[1 + o]); self.tapered(d, self.lerp(knee, ank, .66), ank, 2.7 * S, 2.7 * S, self.white[1 + o], caps=False)
            else:  # long pants / tights
                w = 0.85 if lt == 'tights' else 1.0
                self.tapered(d, hp, knee, 5.2 * S * w, 3.9 * S * w, pa[1 + o]); self.tapered(d, knee, ank, 3.9 * S * w, 3.0 * S * w, pa[1 + o])
                self.tapered(d, self.lerp(knee, ank, .78), ank, 3.3 * S * w, 3.3 * S * w, tr[1 + o], caps=False)      # cuff / leg warmer
                d.line([self.px(self.lerp(hp, knee, .1)), self.px(self.lerp(knee, ank, .7))], fill=pa[3 + min(o, 1)], width=1)   # seam
                if lt == 'tights': self.tapered(d, hp, self.lerp(hp, knee, .3), 5.4 * S, 5.0 * S, tr[1 + o], caps=False)
            self.foot(d, knee, ank, o)
        return f

    def torso(self, j):
        S, sp = self.S, self.sp; top = sp.get('top', 'jacket'); hip, ch, pv, su = j['hip'], j['chest'], j['pv'], j['su']
        pt = lambda b, s, k: (b[0] + (pv[0] * s + su[0] * k) * S, b[1] + (pv[1] * s + su[1] * k) * S)
        jk, tee, tee2, pa, tr, sk, acc = self.jk, self.tee, self.tee2, self.pants, self.trim, self.skin, self.acc
        lt = sp.get('legs', 'pants'); big = sp.get('bulk', 1.0)
        def f(d, layer):
            P = lambda pts, col: self.poly(d, pts, col)
            self.tapered(d, ch, j['head'], 3.2 * S * big, 2.7 * S, sk[2] if top != 'armor' else self.metal[2])
            # pelvis block
            if lt == 'shorts': P([pt(hip, -6.2, 3), pt(hip, 6.2, 3), pt(hip, 7, -6), pt(hip, -7, -6)], pa[1]); P([pt(hip, -6.4, 4), pt(hip, 6.4, 4), pt(hip, 6.4, 1.6), pt(hip, -6.4, 1.6)], tr[1])
            elif lt == 'robot': P([pt(hip, -6, 3), pt(hip, 6, 3), pt(hip, 6.6, -5), pt(hip, -6.6, -5)], self.metal[2]); P([pt(hip, -6, 3), pt(hip, 6, 3), pt(hip, 6, 1), pt(hip, -6, 1)], self.dark[2])
            else: P([pt(hip, -6, 3), pt(hip, 6, 3), pt(hip, 6.6, -5), pt(hip, -6.6, -5)], pa[1]); P([pt(hip, -6.2, 3.6), pt(hip, 6.2, 3.6), pt(hip, 6.2, 2), pt(hip, -6.2, 2)], tr[1])
            wide = 7.4 if top in ('tank', 'suit') else 7.2
            if top == 'armor':
                P([pt(hip, -5.8, 2), pt(hip, 5.8, 2), pt(ch, 7.4, -1), pt(ch, -7.4, -1)], jk[2])
                P([pt(hip, 0, 2), pt(hip, 5.6, 2), pt(ch, 6.6, -1.4), pt(ch, 1.2, -1.4)], jk[1])
                P([pt(hip, 0.5, 8), pt(hip, 4.5, 8), pt(hip, 4.5, 12), pt(hip, 0.5, 12)], self.dark[3]); P([pt(hip, 1.2, 9), pt(hip, 3.8, 9), pt(hip, 3.8, 11), pt(hip, 1.2, 11)], acc[0])   # glowing core
                P([pt(ch, -7.2, -2), pt(ch, 7.4, -2), pt(ch, 7.4, 2.4), pt(ch, -7.2, 2.4)], self.metal[1])                                                                                   # shoulder yoke
                for k in (5, 10): d.point(self.px(pt(hip, -4.6, k)), fill=self.metal[0])
            elif top == 'tank':
                P([pt(hip, -5.6, 2), pt(hip, 5.6, 2), pt(ch, wide, -1), pt(ch, -wide, -1)], sk[2 if False else 1])
                P([pt(hip, -5.2, 2), pt(hip, 5.4, 2), pt(ch, 6.4, -1.4), pt(ch, -1.2, -1.4)], tee[1])                     # tank top
                P([pt(ch, 1, -1.6), pt(ch, 5.6, -1.6), pt(ch, 3.6, 3.4)], sk[1]); P([pt(hip, -5.2, 6), pt(hip, 5.2, 6), pt(hip, 5.2, 7.4), pt(hip, -5.2, 7.4)], tee2[1])   # neckline + stripe
                d.line([self.px(pt(ch, 1.8, -5)), self.px(pt(ch, 1.8, -9))], fill=sk[2], width=1)                         # pec line
            elif top == 'suit':
                P([pt(hip, -5.8, 2), pt(hip, 5.8, 2), pt(ch, wide, -1), pt(ch, -wide, -1)], jk[1])
                P([pt(hip, 0.4, 2), pt(hip, 4.4, 2), pt(ch, 4.6, -1.6), pt(ch, 1.4, -1.6)], tee[1])                       # shirt
                d.line([self.px(pt(hip, 2.6, 4)), self.px(pt(ch, 3.0, -2))], fill=tee2[1], width=max(1, int(S)))          # tie
                P([pt(ch, -0.4, -2), pt(ch, 4.8, 4), pt(ch, 2.4, -2)], jk[0]); P([pt(hip, 4.4, 2), pt(hip, 6.2, 2), pt(ch, 7.4, -1.2), pt(ch, 5.2, -1.6)], jk[2])   # lapels
                P([pt(hip, -3.6, 7), pt(hip, -1, 7), pt(hip, -1, 8.6), pt(hip, -3.6, 8.6)], tee2[0])                        # pocket square
            else:  # jacket / varsity
                P([pt(hip, -5.8, 2), pt(hip, 5.8, 2), pt(ch, wide, -1), pt(ch, -wide, -1)], jk[2 if top == 'jacket' else 1])
                A, B, C, D = pt(hip, -0.5, 2.2), pt(hip, 4.8, 2.2), pt(ch, 5.6, -1.6), pt(ch, 0.6, -1.6)
                cols = [tee[1], tee2[1], tee[1], tee2[1], tee[1]]
                for i, cc in enumerate(cols):
                    t0, t1 = i / len(cols), (i + 1) / len(cols); P([self.lerp(A, D, t0), self.lerp(B, C, t0), self.lerp(B, C, t1), self.lerp(A, D, t1)], cc)
                P([pt(hip, 4.8, 2.2), pt(hip, 6.2, 2.2), pt(ch, 7.4, -1.2), pt(ch, 5.6, -1.6)], jk[1]); P([pt(hip, -0.6, 2.2), pt(hip, 0.8, 2.2), pt(ch, 1.8, -1.6), pt(ch, 0.4, -1.6)], jk[2])
                P([pt(ch, -6.6, -2), pt(ch, -4.6, 3.4), pt(ch, -0.8, -1)], jk[0]); P([pt(ch, 6.8, -2), pt(ch, 4.8, 3.6), pt(ch, 1.4, -1)], jk[1])
                if top == 'varsity': d.line([self.px(pt(hip, -5.4, 3)), self.px(pt(ch, -6.4, -2))], fill=self.white[0], width=max(1, int(S)))
            if 'chain' in sp.get('extras', ()):
                a, b = pt(ch, -3.5, -2), pt(ch, 4.6, -2); m = pt(ch, 0.6, -8)
                d.line([self.px(a), self.px(m), self.px(b)], fill=self.gold[0], width=max(1, int(S))); self.circ(d, self.px(m), 1.8 * S, self.gold[1])
            if 'studs' in sp.get('extras', ()):
                for s_ in (-5.4, -3.2, -1): d.point(self.px(pt(ch, s_, -3)), fill=acc[0])
            if 'belt' in sp.get('extras', ()): d.line([self.px(pt(hip, -6, 2.4)), self.px(pt(hip, 6, 2.4))], fill=self.gold[1], width=max(1, int(1.5 * S)))
        return f

    def head_part(self, j):
        def f(d, layer):
            h = self.head_img.rotate(-math.degrees(j['ha']), resample=Image.NEAREST, expand=True); hard(h)
            cx, cy = self.px(j['head']); layer.alpha_composite(h, (int(round(cx - h.width / 2)), int(round(cy - h.height / 2))))
        return f

    def trail_part(self, j, wind, col, kind):
        S = self.S; ha = j['ha']; c, s = math.cos(ha), math.sin(ha); hx, hy = j['head']
        W = lambda lx, ly: (hx + (lx * c + ly * s) * S, hy + (-lx * s + ly * c) * S)
        wx, wy = wind
        def f(d, layer):
            if kind == 'scarf':
                p0 = W(-2, -8); pts = [p0, W(-9 + wx, -9 + wy * .5), W(-18 + wx * 2, -6 + wy), W(-17 + wx * 2, -10 + wy), W(-8 + wx, -14 + wy * .5), W(0, -13)]
                self.poly(d, pts, col[1]); d.line([self.px(W(-3, -10)), self.px(W(-16 + wx * 2, -8 + wy))], fill=col[0], width=1)
            else:   # long hair tail
                self.poly(d, [W(-6, 7), W(-12, 2), W(-14 + wx, -9 + wy), W(-11 + wx, -19 + wy), W(-6 + wx * .6, -13 + wy * .6), W(-2, -5)], col[2])
                d.line([self.px(W(-9, 3)), self.px(W(-11 + wx, -13 + wy))], fill=col[1], width=1)
        return f

    def prop(self, j):
        h = (j['aF'][2], j['aF'][3]); S = self.S
        def f(d, layer):
            x, y = self.px(h); m = mk_ramp('#b8b8c8')
            d.rectangle([x - 8 * S, y - 12 * S, x + 12 * S, y - 1 * S], fill=m[1]); d.rectangle([x - 8 * S, y - 14 * S, x + 12 * S, y - 12 * S], fill=m[3])
            for cx in (x - 3 * S, x + 7 * S): self.circ(d, (cx, y - 6.5 * S), 3.3 * S, self.dark[2]); self.circ(d, (cx, y - 6.5 * S), 1.4 * S, self.acc[0])
            d.rectangle([x + 0 * S, y - 10 * S, x + 4 * S, y - 8 * S], fill=self.trim[0])
        return f

    def render(self, pose, wind=(0, 0)):
        S, sp = self.S, self.sp
        j = joints(pose, S); fr = Image.new('RGBA', (self.fs, self.fs), (0, 0, 0, 0))
        add_part(fr, self.arm(j['shB'], j['aB'], 1)); add_part(fr, self.leg(j['hpB'], j['lB'], 1))
        add_part(fr, self.torso(j), thick=2)
        if sp['head'] == 'blonde': add_part(fr, self.trail_part(j, wind, self.hair, 'tail'), thick=2)
        if 'scarf' in sp.get('extras', ()): add_part(fr, self.trail_part(j, wind, self.acc, 'scarf'), thick=1)
        add_part(fr, self.head_part(j), do_shade=False)
        add_part(fr, self.leg(j['hpF'], j['lF'], 0)); add_part(fr, self.arm(j['shF'], j['aF'], 0))
        if 'boombox' in sp.get('extras', ()): add_part(fr, self.prop(j), thick=1)
        silhouette(fr)
        if 'hover' in sp.get('extras', ()) or sp.get('shoe_type') == 'hover': pass
        return fr

# ---------------- roster ----------------
def spec(key, kind, level, **kw):
    d = dict(key=key, kind=kind, level=level); d.update(kw); return d
PWS = {'grunt': ['jab', 'low'], 'heavy': ['hay', 'slam'], 'fast': ['flykick', 'jab', 'spin'], 'thrower': ['throw', 'jab'], 'rusher': ['charge', 'low'],
       'boss1': ['hay', 'slam', 'throw', 'arms_up'], 'boss2': ['flykick', 'spin', 'point', 'slam', 'jab', 'arms_up'],
       'boss3': ['charge', 'hay', 'jab', 'throw', 'arms_up'], 'boss4': ['point', 'slam', 'throw', 'hay', 'arms_up']}
ROSTER = [
    # ---- level 1: neon downtown
    spec('l1_grunt', 'grunt', 1, skin='#d99b7a', head='mohawk', hair='#27f0ff', jacket='#1a1a24', sleeve='#1a1a24', tee0='#2a2a34', tee1='#ff2fd0', pants='#5a1a7a', trim='#ff2fd0', shoe='#222230', wrap='#ff2fd0', accent='#ff2fd0', sleeves='short', extras=('studs',), shoe_type='boot'),
    spec('l1_fast', 'fast', 1, skin='#8a5a3c', head='cap', hat='#ff2fd0', hair='#111111', jacket='#ffe44d', sleeve='#ffe44d', tee0='#ffffff', tee1='#ff2fd0', pants='#27f0ff', trim='#ffffff', shoe='#ffffff', wrap='#ffffff', accent='#ffe44d'),
    spec('l1_thrower', 'thrower', 1, skin='#e0b090', head='headphones', hat='#ff2fd0', hair='#3a2210', jacket='#3d2a7a', sleeve='#3d2a7a', tee0='#ffffff', tee1='#27f0ff', pants='#15121f', trim='#27f0ff', shoe='#ff2fd0', wrap='#27f0ff', accent='#27f0ff'),
    spec('l1_heavy', 'heavy', 1, S=1.22, skin='#c48a68', head='helmet', hat='#b02020', accent='#ffe44d', jacket='#151515', sleeve='#151515', tee0='#cc3333', tee1='#ffffff', pants='#222230', trim='#555566', shoe='#111111', wrap='#333333', extras=('belt', 'studs'), shoe_type='boot', bulk=1.15),
    spec('l1_rusher', 'rusher', 1, skin='#e2a887', head='beanie', hat='#ff6a3d', hair='#3a2210', accent='#3dffa0', jacket='#3dffa0', sleeve='#3dffa0', tee0='#ffffff', tee1='#111111', pants='#2338b8', trim='#ffffff', shoe='#ffe44d', wrap='#111111', sleeves='short', shoe_type='skate'),
    spec('l1_boss1', 'boss1', 1, S=1.55, skin='#9c6444', head='shades', hair='#111111', accent='#ff2fd0', jacket='#ff2fd0', sleeve='#ff2fd0', tee0='#151515', tee1='#27f0ff', pants='#151515', trim='#ffe44d', shoe='#ffffff', wrap='#ffe44d', extras=('chain', 'boombox'), bulk=1.2),
    # ---- level 2: galaxy arcade
    spec('l2_grunt', 'grunt', 2, skin='#e2a887', head='bandana', hat='#e8323c', hair='#3a2210', jacket='#2a3fa8', sleeve='#2a3fa8', tee0='#ffffff', tee1='#3dffa0', pants='#15121f', trim='#3dffa0', shoe='#eeeeee', wrap='#3dffa0', accent='#3dffa0'),
    spec('l2_fast', 'fast', 2, skin='#f0c0a0', head='blonde', hat='#ff2fd0', hair='#ffd84a', jacket='#ff8adf', sleeve='#ff8adf', tee0='#ffffff', tee1='#27f0ff', pants='#27f0ff', trim='#ff2fd0', shoe='#ffffff', wrap='#ff2fd0', accent='#ff8adf', legs='tights', sleeves='short', shoe_type='skate'),
    spec('l2_thrower', 'thrower', 2, skin='#e8c0a0', head='visor', hair='#5a3a1a', jacket='#2a2a3a', sleeve='#2a2a3a', tee0='#3dffa0', tee1='#111111', pants='#3a3a4a', trim='#3dffa0', shoe='#ff2fd0', wrap='#3dffa0', accent='#3dffa0'),
    spec('l2_heavy', 'heavy', 2, S=1.22, skin='#e2a887', head='cap', hat='#e8323c', hair='#c9a24a', accent='#ffe44d', top='varsity', jacket='#e8323c', sleeve='#ffffff', tee0='#ffffff', tee1='#e8323c', pants='#f4f4f4', trim='#e8323c', shoe='#ffffff', wrap='#ffffff', bulk=1.15),
    spec('l2_rusher', 'rusher', 2, skin='#a06a48', head='cap', hat='#27f0ff', hair='#222222', jacket='#ffe44d', sleeve='#ffe44d', tee0='#111111', tee1='#ff2fd0', pants='#8b5cff', trim='#ffffff', shoe='#27f0ff', wrap='#8b5cff', accent='#8b5cff', sleeves='short'),
    spec('l2_boss2', 'boss2', 2, S=1.18, skin='#f0c0a0', head='blonde', hat='#27f0ff', hair='#ff9ae9', accent='#27f0ff', jacket='#27f0ff', sleeve='#27f0ff', tee0='#ff2fd0', tee1='#ffffff', pants='#ff2fd0', trim='#27f0ff', shoe='#ffffff', wrap='#ffe44d', legs='tights', sleeves='short', shoe_type='boot'),
    # ---- level 3: sunset boulevard
    spec('l3_grunt', 'grunt', 3, skin='#d99b7a', head='slick', hair='#111111', accent='#5ce1ff', top='suit', jacket='#f2ece0', sleeve='#f2ece0', tee0='#ff8adf', tee1='#ffffff', pants='#f2ece0', trim='#cfc6b4', shoe='#8a5a3c', wrap='#f2ece0', shades=True, shoe_type='boot'),
    spec('l3_fast', 'fast', 3, skin='#8a5a3c', head='bandana', hat='#3dffa0', hair='#111111', accent='#3dffa0', top='tank', jacket='#3dffa0', tee0='#3dffa0', tee1='#ffe44d', pants='#ffffff', trim='#3dffa0', shoe='#8a5a3c', wrap='#3dffa0', sleeves='bare', shoe_type='barefoot'),
    spec('l3_thrower', 'thrower', 3, skin='#e0a070', head='shades', hair='#e8c060', accent='#ffe44d', top='tank', jacket='#ff6a3d', tee0='#ff6a3d', tee1='#ffffff', pants='#27f0ff', trim='#ffe44d', shoe='#ffffff', wrap='#ffffff', sleeves='bare', legs='shorts'),
    spec('l3_heavy', 'heavy', 3, S=1.22, skin='#d08a60', head='shades', hair='#d9b040', accent='#ff2fd0', top='tank', jacket='#e2a887', tee0='#ff2fd0', tee1='#27f0ff', pants='#ff2fd0', trim='#27f0ff', shoe='#ffffff', wrap='#ffe44d', sleeves='bare', legs='shorts', bulk=1.35),
    spec('l3_rusher', 'rusher', 3, skin='#e2a887', head='headphones', hat='#ffe44d', hair='#3a2210', accent='#ff2fd0', jacket='#27f0ff', sleeve='#27f0ff', tee0='#ffffff', tee1='#ff2fd0', pants='#ff2fd0', trim='#27f0ff', shoe='#ffffff', wrap='#27f0ff', sleeves='short', legs='shorts', shoe_type='skate'),
    spec('l3_boss3', 'boss3', 3, S=1.3, skin='#e2b090', head='slick', hair='#111111', accent='#ff8adf', top='suit', jacket='#ffffff', sleeve='#ffffff', tee0='#ff8adf', tee1='#ffffff', pants='#ffffff', trim='#d8d0e0', shoe='#ff8adf', wrap='#ff8adf', shades=True, extras=('chain',), shoe_type='boot'),
    # ---- level 4: cyber tower
    spec('l4_grunt', 'grunt', 4, skin='#8a94a8', head='robot', hat='#3a4458', accent='#27f0ff', top='armor', jacket='#2a3040', sleeve='#2a3040', tee0='#111111', tee1='#27f0ff', pants='#1a2030', trim='#27f0ff', shoe='#3a4458', wrap='#27f0ff', metal='#8a94a8', legs='robot', sleeves='robot', robotic=True, shoe_type='robot'),
    spec('l4_fast', 'fast', 4, skin='#2a2a34', head='visor', hair='#111111', accent='#ff2a4d', jacket='#151520', sleeve='#151520', tee0='#111111', tee1='#ff2a4d', pants='#151520', trim='#ff2a4d', shoe='#0a0a10', wrap='#ff2a4d', extras=('scarf',), shoe_type='boot'),
    spec('l4_thrower', 'thrower', 4, skin='#8a94a8', head='robot', hat='#8b5cff', accent='#3dffa0', jacket='#3d2a7a', sleeve='#3d2a7a', tee0='#111111', tee1='#3dffa0', pants='#2a1a5a', trim='#3dffa0', shoe='#3dffa0', wrap='#3dffa0', metal='#8a94a8', robotic=True, shoe_type='robot'),
    spec('l4_heavy', 'heavy', 4, S=1.22, skin='#6a7488', head='robot', hat='#ffe44d', accent='#ff2a4d', top='armor', jacket='#4a5468', sleeve='#4a5468', tee0='#ffe44d', tee1='#111111', pants='#3a4458', trim='#ffe44d', shoe='#2a3040', wrap='#ffe44d', metal='#6a7488', legs='robot', sleeves='robot', robotic=True, shoe_type='robot', bulk=1.2),
    spec('l4_rusher', 'rusher', 4, skin='#b0b8c8', head='robot', hat='#27f0ff', accent='#ff2fd0', top='armor', jacket='#ff2fd0', sleeve='#ff2fd0', tee0='#ffffff', tee1='#27f0ff', pants='#27f0ff', trim='#ffffff', shoe='#ffffff', wrap='#ffffff', metal='#b0b8c8', legs='robot', sleeves='robot', robotic=True, shoe_type='hover', extras=('hover',)),
    spec('l4_boss4', 'boss4', 4, S=1.45, skin='#c8d0e0', head='crt', hat='#5a6478', accent='#3dffa0', top='armor', jacket='#8a94a8', sleeve='#8a94a8', tee0='#111111', tee1='#ff2fd0', pants='#2a3040', trim='#ff2fd0', shoe='#c8d0e0', wrap='#ff2fd0', metal='#c8d0e0', legs='robot', sleeves='robot', shoe_type='robot', bulk=1.15),
]

def frame_plan(sp):
    """list of (name, pose, wind)"""
    st = stance_for(sp); fr = []
    for i, b in enumerate([math.sin(math.pi / 2), math.sin(math.pi * 1.5)]): fr.append(('idle%d' % i, idle_pose(b, b * .6, st), (0, b)))
    for i in range(6): fr.append(('walk%d' % i, walk_pose(i * 2 * math.pi / 6, st, 0.9), (-1, 1.5 * abs(math.cos(i * math.pi / 3)))))
    P = POSES
    fr += [('hurt', P['hurt'], (3, 0)), ('hurt2', P['hurt2'], (4, 1)), ('tumble', P['tumble'], (3, 3)), ('down', P['down'], (0, 0)),
           ('getup0', lerp_pose(P['down'], P['getup'], .5), (0, 0)), ('getup1', P['getup'], (-1, 0))]
    for pw in PWS[sp['kind']]:
        if pw == 'arms_up': fr.append(('arms_up', P['arms_up'], (0, 4))); continue
        s = P[pw + '_s']
        if pw + '_w' in P:
            w = P[pw + '_w']; fr.append((pw + '_w', w, (2, 0))); fr.append((pw + '_m', lerp_pose(st, w, .5), (1, 0)))
        fr.append((pw + '_s', s, (-2, 1))); fr.append((pw + '_r', lerp_pose(s, st, .5), (-1, 1)))
    return fr

def build_one(sp):
    ch = Char(sp); plan = frame_plan(sp); fs = ch.fs; cols = 8; rows = math.ceil(len(plan) / cols)
    sheet = Image.new('RGBA', (cols * fs, rows * fs), (0, 0, 0, 0)); jf = {}
    for i, (name, pose, wind) in enumerate(plan):
        x, y = (i % cols) * fs, (i // cols) * fs
        w = (max(-4, min(5, pose['lean'] * 8 + wind[0])), wind[1])
        sheet.alpha_composite(ch.render(pose, w), (x, y))
        jf[name] = {'frame': {'x': x, 'y': y, 'w': fs, 'h': fs}, 'duration': 100}
    meta = {'app': 'veexing-force enemy generator', 'image': sp['key'] + '.png', 'size': {'w': sheet.width, 'h': sheet.height}, 'anchor': {'x': ch.ox, 'y': ch.oy}, 'scale': ch.S}
    return sp['key'], sheet, {'frames': jf, 'meta': meta}

if __name__ == '__main__':
    sys.exit('Deprecated: the enemy sheets are now built by tools/build_enemy_sheets.py (3D -> pixel art). This module only provides ROSTER / frame_plan / ramps.')
    only = [a for a in sys.argv[1:] if a != 'preview']
    roster = [s for s in ROSTER if not only or s['key'] in only]
    with Pool(min(12, len(roster))) as pool: results = pool.map(build_one, roster)
    os.makedirs(os.path.join(ROOT, 'assets', 'enemies'), exist_ok=True)
    js = ['// generated by tools/make_enemy_sprites.py - do not edit', 'const ENEMY_SHEETS = {']
    for key, sheet, data in results:
        sheet.save(os.path.join(ROOT, 'assets', 'enemies', key + '.png')); json.dump(data, open(os.path.join(ROOT, 'assets', 'enemies', key + '.json'), 'w'))
        buf = io.BytesIO(); sheet.save(buf, 'PNG', optimize=True)
        js.append("  %s: { img: 'data:image/png;base64,%s', json: %s }," % (key, base64.b64encode(buf.getvalue()).decode(), json.dumps(data)))
    js.append('};')
    if not only: open(os.path.join(ROOT, 'js', 'enemySprites.js'), 'w').write('\n'.join(js) + '\n')
    # contact sheet: idle / first attack / hurt for every character
    cell = 160; pv = Image.new('RGBA', (6 * cell * 2 // 1, 4 * cell), (60, 40, 110, 255)) if False else Image.new('RGBA', (6 * cell, 4 * cell), (60, 40, 110, 255))
    for n, (key, sheet, data) in enumerate(results):
        li = int(key[1]) - 1 if not only else 0
        col = ['grunt', 'fast', 'thrower', 'heavy', 'rusher', 'boss'].index(re.sub(r'\d', '', key.split('_')[1])) if not only else n % 6
        fr = data['frames']; r = fr['idle0']['frame']; im = sheet.crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h']))
        pv.alpha_composite(im, (col * cell + (cell - im.width) // 2, (li if not only else n // 6) * cell + (cell - im.height) // 2))
    pv = pv.resize((pv.width * 2, pv.height * 2), Image.NEAREST); pv.save(os.path.join(ROOT, 'tools', 'enemy_preview.png'))
    print('characters', len(results), 'frames', sum(len(d['frames']) for _, _, d in results))

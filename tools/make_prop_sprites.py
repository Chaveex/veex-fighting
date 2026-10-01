"""Level props, drawn + animated in the same pixel-art pipeline, exported as real .aseprite files.
  L1 NEON DOWNTOWN : bin (breakable, health)          hydrant (jet pushes enemies into the walls)
  L2 GALAXY ARCADE : cabinet (breakable, electric)    bumper (pinball rebound)
  L3 SUNSET BLVD   : cabriolet (breakable, explosion) ball (beach ball you can kick)
  L4 CYBER TOWER   : server (breakable, EMP)          conveyor (belt that carries everybody)
Outputs: assets/props/<name>.aseprite|png|json and js/propSprites.js
usage: python tools/make_prop_sprites.py"""
import base64, io, json, math, os, random, sys
from PIL import Image, ImageDraw, ImageChops
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_enemy_sprites import mk_ramp, add_part, silhouette, H, OUT, hard, recolor, ramp_shift
import asekit

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]

class Sheet:
    def __init__(self, name, fw, fh, ax, ay):
        self.name, self.fw, self.fh, self.ax, self.ay = name, fw, fh, ax, ay; self.frames = []; self.tags = []
    def blank(self): return Image.new('RGBA', (self.fw, self.fh), (0, 0, 0, 0))
    def add(self, name, im, dur=100): self.frames.append((name, im, dur)); return len(self.frames) - 1
    def tag(self, name, first, last): self.tags.append({'name': name, 'from': first, 'to': last, 'direction': 0})

def ell(d, cx, cy, rx, ry, col): d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=col)
def rect(d, x0, y0, x1, y1, col): d.rectangle([x0, y0, x1, y1], fill=col)
def dith(im, x, y, col, a):   # ordered-dither pixel
    if BAYER[y & 3][x & 3] / 16 < a and 0 <= x < im.width and 0 <= y < im.height: im.putpixel((x, y), col)

def smoke(im, cx, cy, n, ramp, rnd, spread=6, rise=22):
    """rising dithered smoke puffs"""
    for i in range(n):
        ph = (i + 0.5) / n; x = cx + math.sin(i * 2.1 + rnd.random()) * spread * ph; y = cy - ph * rise; r = 2.5 + ph * 4
        for yy in range(int(y - r), int(y + r) + 1):
            for xx in range(int(x - r), int(x + r) + 1):
                dd = math.hypot(xx - x, yy - y)
                if dd < r: dith(im, xx, yy, ramp[max(0, min(4, int(1 + ph * 2 + (dd / r))))], (1 - ph) * 0.9 * (1 - dd / r * 0.6))

# ======================================================================= L1: bin
def make_bin():
    S = Sheet('bin', 32, 44, 16, 40); metal = mk_ramp('#8088a8'); dark = mk_ramp('#2a2a40'); pink = mk_ramp('#ff2fd0'); cyan = mk_ramp('#27f0ff')
    rnd = random.Random(3)
    def frame(level):
        fr = S.blank(); cx = 16
        def body(d, layer):
            d.polygon([(cx - 10, 40), (cx + 10, 40), (cx + 12, 17), (cx - 12, 17)], fill=metal[1]); ell(d, cx, 40, 10, 3, metal[1])
            for x in (-7, -3, 1, 5, 9): d.line([(cx + x, 38), (cx + x * 1.12, 19)], fill=metal[2])
            for x in (-8, -4, 0, 4, 8): d.line([(cx + x + 1, 38), (cx + (x + 1) * 1.12, 19)], fill=metal[0])
            d.line([(cx - 11, 25), (cx + 11, 25)], fill=metal[3]); d.line([(cx - 10, 34), (cx + 10, 34)], fill=metal[3])
            rect(d, cx - 6, 27, cx + 2, 32, pink[1]); rect(d, cx - 5, 28, cx + 1, 29, pink[0]); rect(d, cx + 4, 20, cx + 7, 33, cyan[1])   # stickers
            if level >= 1:
                d.polygon([(cx - 12, 24), (cx - 6, 27), (cx - 9, 33), (cx - 12, 36)], fill=metal[3]); d.line([(cx - 12, 24), (cx - 6, 27)], fill=metal[4])
                d.polygon([(cx + 12, 22), (cx + 8, 26), (cx + 12, 29)], fill=metal[3])
            if level >= 2:
                d.polygon([(cx + 3, 28), (cx + 9, 32), (cx + 4, 38), (cx - 1, 33)], fill=metal[4]); d.line([(cx - 4, 22), (cx + 2, 38)], fill=metal[4])
        add_part(fr, body, thick=2)
        def rim(d, layer):
            ell(d, cx, 17, 12, 3.6, metal[0]); ell(d, cx, 17.5, 10.5, 2.6, dark[3])
        add_part(fr, rim, thick=1)
        if level >= 2:   # trash poking out
            for (x, y, c) in [(cx - 5, 13, '#ff6a3d'), (cx - 4, 12, '#ff6a3d'), (cx + 2, 12, '#3dffa0'), (cx + 3, 13, '#3dffa0'), (cx + 6, 14, '#ffe44d'), (cx, 14, '#e6e6f0'), (cx - 1, 13, '#e6e6f0')]:
                fr.putpixel((x, y), H(c))
        # lid: closed on intact, ajar when wrecked
        def lid(d, layer):
            if level < 2: ell(d, cx, 14, 13, 4.2, metal[1]); rect(d, cx - 3, 9, cx + 3, 11, metal[0]); rect(d, cx - 4, 11, cx - 3, 13, metal[2]); rect(d, cx + 3, 11, cx + 4, 13, metal[2])
            else: d.polygon([(cx + 2, 11), (cx + 15, 7), (cx + 16, 12), (cx + 4, 15)], fill=metal[1]); rect(d, cx + 9, 5, cx + 12, 8, metal[0])
        add_part(fr, lid, thick=1); silhouette(fr); return fr
    i0 = S.add('bin0', frame(0)); S.add('bin1', frame(1)); i2 = S.add('bin2', frame(2))
    l = S.blank(); ld = ImageDraw.Draw(l)
    def lidonly(d, layer): ell(d, 16, 22, 13, 4.2, metal[1]); rect(d, 13, 17, 19, 19, metal[0])
    add_part(l, lidonly, thick=1); silhouette(l); S.add('lid', l)
    S.tag('state', i0, i2); return S

# ======================================================================= L1: hydrant
def make_hydrant():
    S = Sheet('hydrant', 96, 48, 14, 42); red = mk_ramp('#d8303c'); cap = mk_ramp('#c8cee0'); water = mk_ramp('#4fb8ff'); dark = mk_ramp('#2a2a40'); rnd = random.Random(5)
    cx = 14
    def body(open_):
        fr = S.blank()
        def f(d, layer):
            ell(d, cx, 41, 9, 3, cap[2]); rect(d, cx - 8, 38, cx + 8, 41, cap[2])                                   # base flange
            d.polygon([(cx - 6, 39), (cx + 6, 39), (cx + 5.5, 22), (cx - 5.5, 22)], fill=red[1]); ell(d, cx, 39, 6, 2, red[1])
            rect(d, cx - 7, 30, cx + 7, 32, red[2]); rect(d, cx - 7, 23, cx + 7, 24, red[2])                      # bands
            d.pieslice([cx - 6.5, 17, cx + 6.5, 27], 180, 360, fill=red[0 if False else 1])                        # dome
            rect(d, cx - 10, 26, cx - 5, 30, red[1]); rect(d, cx + 5, 26, cx + 10, 30, red[1])                      # side nozzles
            rect(d, cx - 12, 25, cx - 10, 31, cap[1]); rect(d, cx + 10, 25, cx + 12, 31, cap[1])                   # nozzle caps
            ell(d, cx, 34, 3.2, 3.2, cap[1]); ell(d, cx, 34, 1.6, 1.6, dark[3])                                   # front nozzle
            if not open_: rect(d, cx - 3, 13, cx + 3, 18, cap[1]); rect(d, cx - 4, 12, cx + 4, 13, cap[0])          # top cap + nut
            else: rect(d, cx - 3, 17, cx + 3, 19, dark[3])
        add_part(fr, f, thick=2)
        if open_:      # water fountaining out of the top
            for i in range(14):
                x = cx + rnd.randint(-5, 5); y = 16 - rnd.randint(0, 12); fr.putpixel((x, y), water[0 if i % 3 else 1]); fr.putpixel((x, y + 1), water[1])
        silhouette(fr); return fr
    i0 = S.add('hyd0', body(False)); S.add('hyd1', body(True))
    pud = S.blank()
    for y in range(34, 48):
        for x in range(0, 60):
            r = math.hypot((x - 14 - 6) / 26.0, (y - 42) / 6.0)
            if r < 1:
                pud.putpixel((x, y), water[3] if r > 0.8 else water[2] if r > 0.5 or BAYER[y & 3][x & 3] > 8 else water[1])
    for (x, y) in [(6, 41), (7, 41), (20, 43), (21, 43), (30, 40)]: pud.putpixel((x, y), water[0])
    S.add('puddle', pud)
    j0 = len(S.frames)
    for t in range(6):   # side jet: ballistic stream + spray
        fr = S.blank(); vx0, vy0, g = 2.6, 1.35, 0.09; nx, ny = cx + 11, 28
        pts = []
        for tau in range(0, 27):
            pts.append((nx + vx0 * tau, ny - vy0 * tau + 0.5 * g * tau * tau))
        d = ImageDraw.Draw(fr)
        for k in range(len(pts) - 1):
            wdt = 6 - 4 * k / len(pts)
            col = water[0] if ((k + t * 4) % 8) < 4 else water[1]
            d.line([pts[k], pts[k + 1]], fill=col, width=max(1, int(round(wdt))))
        for k in range(len(pts) - 1):
            if ((k + t * 4) % 8) >= 4: d.point((int(pts[k][0]), int(pts[k][1]) + 2), fill=water[2])
        for i in range(34):
            ph = (i / 34 + t / 6) % 1.0; tau = 2 + ph * 27; jit = random.Random(i * 31 + t).uniform(-1, 1)
            x = nx + vx0 * tau * (0.95 + 0.1 * jit) + jit * 2; y = ny - vy0 * tau + 0.5 * g * tau * tau + jit * (1 + ph * 6)
            if 0 <= x < 95 and 0 <= y < 47: fr.putpixel((int(x), int(y)), water[0 if ph < 0.6 else 2]);
            if ph > 0.65 and 0 <= x < 95 and 0 <= y < 46: fr.putpixel((int(x), int(y) + 1), water[1])
        for i in range(6): d.point((nx + rnd.randint(0, 4), ny + rnd.randint(-3, 3)), fill=(255, 255, 255, 255))     # burst at the nozzle
        S.add('jet%d' % t, fr, 70)
    S.tag('body', i0, i0 + 1); S.tag('jet', j0, j0 + 5); return S

# ======================================================================= L2: arcade cabinet
def make_cabinet():
    S = Sheet('cabinet', 48, 72, 24, 68); body = mk_ramp('#3f2b78'); panel = mk_ramp('#5a3fa0'); pink = mk_ramp('#ff2fd0'); cyan = mk_ramp('#27f0ff')
    yel = mk_ramp('#ffe44d'); dark = mk_ramp('#14102a'); grey = mk_ramp('#8a8aa8'); rnd = random.Random(11)
    def frame(anim, dmg=0, hit=False):
        fr = S.blank()
        def f(d, layer):
            d.polygon([(6, 68), (42, 68), (42, 10), (37, 4), (11, 4), (6, 10)], fill=body[1])
            rect(d, 6, 10, 7, 66, cyan[1]); rect(d, 41, 10, 42, 66, pink[1])                                        # neon side trim
            rect(d, 9, 66, 39, 70, body[3])
            if dmg >= 2: d.polygon([(6, 20), (11, 24), (7, 30)], fill=body[4])
        add_part(fr, f, thick=2)
        def marq(d, layer):
            col = [pink, cyan, yel, pink][anim % 4]; rect(d, 9, 6, 39, 16, dark[2]); rect(d, 10, 7, 38, 15, col[1] if dmg < 2 else col[3])
            for x in range(11, 38, 4): rect(d, x, 8, x + 1, 14, col[0] if (x // 4 + anim) % 2 and dmg < 2 else col[2])
        add_part(fr, marq, thick=1, do_shade=False)
        def scr(d, layer):
            rect(d, 10, 19, 38, 46, dark[3]); rect(d, 12, 21, 36, 44, (0, 0, 0, 255))
            if hit:
                for yy in range(21, 45):
                    for xx in range(12, 37):
                        if rnd.random() < 0.5: layer.putpixel((xx, yy), (255, 255, 255, 255) if rnd.random() < 0.6 else cyan[1])
            elif dmg == 0:
                for row in range(3):    # space invaders
                    for col in range(6):
                        x = 14 + col * 3 + ((anim + row) % 2) * 2 + (anim // 2); y = 24 + row * 4
                        rect(d, x, y, x + 1, y + 1, [pink, cyan, yel][row][1]); d.point((x - 1, y + 1), fill=[pink, cyan, yel][row][0])
                rect(d, 22, 42, 26, 43, cyan[0]); d.point((24 + (anim % 2) * 2 - 1, 38 - anim * 2), fill=(255, 255, 255, 255))   # ship + bullet
            elif dmg == 1:
                rect(d, 14, 24, 34, 41, (12, 8, 28, 255))
                d.line([(12, 21), (22, 32), (18, 44)], fill=(230, 240, 255, 255)); d.line([(22, 32), (36, 26)], fill=(230, 240, 255, 255)); d.line([(22, 32), (30, 44)], fill=cyan[2])
            else:
                rect(d, 12, 21, 36, 44, (6, 4, 14, 255))
                for k in range(6): d.line([(12 + rnd.randint(0, 20), 21 + k * 4), (24 + rnd.randint(0, 12), 22 + k * 4)], fill=cyan[1] if k % 2 else pink[1])
        add_part(fr, scr, thick=1, do_shade=False)
        def ctl(d, layer):
            d.polygon([(8, 48), (40, 48), (42, 56), (6, 56)], fill=panel[1]); d.line([(8, 48), (40, 48)], fill=panel[0])
            ell(d, 15, 51, 2.2, 2.2, (232, 50, 60, 255)); d.line([(15, 51), (15, 49)], fill=grey[1])
            for i, c in enumerate([yel, cyan, pink]): ell(d, 24 + i * 5, 52, 1.8, 1.4, c[1])
            rect(d, 17, 58, 31, 66, dark[3]); rect(d, 19, 60, 21, 61, yel[0]); rect(d, 27, 60, 29, 61, yel[0]); rect(d, 20, 63, 28, 64, body[3])
        add_part(fr, ctl, thick=1)
        if dmg >= 1: smoke(fr, 24, 8, 5 + dmg * 2, mk_ramp('#8a8aa0'), random.Random(dmg * 7 + anim), 7, 18 + dmg * 6)
        if dmg >= 2:
            for (x, y) in [(14, 20), (35, 22), (24, 44), (30, 30)]: fr.putpixel((x, y), yel[0]); fr.putpixel((x + 1, y - 1), (255, 255, 255, 255))
        silhouette(fr); return fr
    i0 = S.add('cab0', frame(0), 120)
    for a in (1, 2, 3): S.add('cab%d' % a, frame(a), 120)
    S.add('cab_hit', frame(0, 0, True), 60); S.add('cab_dmg1', frame(1, 1), 100); S.add('cab_dmg2', frame(2, 2), 100)
    w = frame(0, 2); wd = ImageDraw.Draw(w); wd.rectangle([12, 21, 36, 44], fill=(4, 2, 10, 255)); S.add('cab_wreck', w, 200)
    S.tag('idle', i0, i0 + 3); S.tag('damage', i0 + 4, i0 + 7); return S

# ======================================================================= L2: bumper
def make_bumper():
    S = Sheet('bumper', 36, 44, 18, 40); red = mk_ramp('#ff3a78'); navy = mk_ramp('#242a5a'); yel = mk_ramp('#ffe44d'); wht = mk_ramp('#ffffff'); cyan = mk_ramp('#27f0ff')
    def frame(t, hit=0):
        fr = S.blank(); cx = 18; sq = 2 if hit else 0; sy = 2 if hit else 0
        def base(d, layer):
            ell(d, cx, 38, 15, 5, navy[1]); ell(d, cx, 37, 13.5, 4, navy[2])
        add_part(fr, base, thick=2)
        for k in range(8):                            # chase lights around the base
            a = k / 8 * 2 * math.pi; x, y = cx + 12.5 * math.cos(a), 37.5 + 3.4 * math.sin(a)
            on = hit or (k + t) % 3 == 0; col = wht[0] if hit else (yel[0] if on else navy[3])
            fr.putpixel((round(x), round(y)), col)
            if on: fr.putpixel((round(x), round(y) + 1), yel[2])
        def body(d, layer):
            d.polygon([(cx - 11 - sq, 37), (cx + 11 + sq, 37), (cx + 10 + sq, 22 + sy), (cx - 10 - sq, 22 + sy)], fill=(wht if hit else red)[1]); ell(d, cx, 37, 11 + sq, 3, (wht if hit else red)[1])
            rect(d, cx - 11 - sq, 29, cx + 11 + sq, 31, wht[1] if not hit else cyan[1])                    # ring band
        add_part(fr, body, thick=2)
        def cap(d, layer):
            d.pieslice([cx - 11 - sq, 15 + sy, cx + 11 + sq, 29 + sy], 180, 360, fill=(wht if hit else red)[0 if hit else 1]); ell(d, cx, 22 + sy, 11 + sq, 3, (wht if hit else red)[1])
        add_part(fr, cap, thick=1)
        d = ImageDraw.Draw(fr); c = (255, 255, 255, 255) if not hit else red[1]
        d.line([(cx - 2, 18 + sy), (cx + 1, 21 + sy), (cx - 1, 22 + sy), (cx + 2, 26 + sy)], fill=c)                    # lightning-bolt emblem
        if not hit: d.line([(cx - 8, 19), (cx - 5, 17)], fill=red[0])
        silhouette(fr); return fr
    i0 = S.add('bmp0', frame(0), 120); S.add('bmp1', frame(1), 120); S.add('bmp2', frame(2), 120)
    S.add('bmp_hit0', frame(0, 1), 60); S.add('bmp_hit1', frame(1, 1), 60)
    S.tag('idle', i0, i0 + 2); S.tag('hit', i0 + 3, i0 + 4); return S

# ======================================================================= L3: cabriolet
def make_car():
    S = Sheet('cabriolet', 112, 64, 56, 58)
    def frame(dmg, flame=0, wreck=False):
        pk = mk_ramp('#4a4a55' if wreck else '#ff5fb0'); wht = mk_ramp('#6a6a72' if wreck else '#fff4f8'); chrome = mk_ramp('#c8d0e8'); glass = mk_ramp('#7fe4ff'); dark = mk_ramp('#22202e')
        fr = S.blank()
        def arches(d, layer):
            for wx in (28, 86): ell(d, wx, 50, 11, 11, dark[3])
        add_part(fr, arches, thick=1, do_shade=False, outline=False)
        def interior(d, layer):
            d.polygon([(30, 34), (44, 27), (66, 27), (80, 32)], fill=dark[2])
            if not wreck:
                d.polygon([(33, 33), (42, 25), (54, 25), (56, 33)], fill=wht[1]); d.polygon([(59, 33), (64, 26), (74, 26), (76, 33)], fill=wht[1])
                d.ellipse([72, 23, 79, 30], outline=chrome[1])
        add_part(fr, interior, thick=1)
        def bod(d, layer):
            lo = [(4, 52), (4, 40), (12, 35), (30, 34), (46, 31), (80, 31), (100, 34), (108, 41), (108, 52)]
            if dmg >= 1: lo = [(4, 52), (4, 40), (12, 35), (30, 34), (46, 31), (76, 31), (82, 36), (92, 33), (98, 38), (104, 40), (108, 47), (108, 52)]
            if dmg >= 2: lo = [(4, 52), (4, 40), (12, 35), (30, 34), (46, 32), (70, 33), (78, 38), (88, 35), (94, 41), (102, 43), (106, 49), (108, 52)]
            d.polygon(lo, fill=pk[1])
            d.polygon([(4, 41), (1, 26), (14, 35)], fill=pk[0]); d.line([(4, 41), (1, 27)], fill=pk[0])           # tail fin
            d.line([(8, 43), (100, 43)], fill=wht[1]); d.line([(8, 44), (100, 44)], fill=wht[2])                    # side stripe
            for x in range(14, 98, 12): d.point((x, 46), fill=pk[3])
            rect(d, 2, 47, 6, 51, chrome[1]); rect(d, 104, 47, 110, 51, chrome[1]); rect(d, 105, 46, 110, 47, chrome[0])   # bumpers
            if not wreck: rect(d, 3, 37, 6, 40, (255, 60, 70, 255)); ell(d, 106, 40, 3, 3, (255, 240, 150, 255))     # tail light / headlight
            if dmg >= 1: d.polygon([(58, 38), (68, 40), (62, 47)], fill=pk[3]); d.line([(58, 38), (68, 40)], fill=pk[4])
            if dmg >= 2: d.polygon([(88, 40), (100, 44), (92, 49)], fill=pk[4])
        add_part(fr, bod, thick=2)
        def glassp(d, layer):
            if wreck: return
            d.polygon([(76, 32), (82, 19), (86, 19), (84, 32)], fill=glass[1]); d.line([(78, 30), (82, 21)], fill=glass[0])
            if dmg >= 2: d.line([(78, 22), (85, 28)], fill=(255, 255, 255, 255))
        add_part(fr, glassp, thick=1)
        def wheels(d, layer):
            for wx in (28, 86):
                ry = 8 if not wreck else 6
                ell(d, wx, 50 + (0 if not wreck else 2), 9, ry, dark[1]); ell(d, wx, 50 + (0 if not wreck else 2), 6, ry - 3 if wreck else 6, wht[1] if not wreck else dark[2]); ell(d, wx, 50 + (0 if not wreck else 2), 3, 3 if not wreck else 2, chrome[1])
        add_part(fr, wheels, thick=1)
        if dmg >= 1 and not wreck: smoke(fr, 90, 30, 6, mk_ramp('#8a8aa0'), random.Random(dmg), 8, 22)
        if dmg >= 2:
            rnd = random.Random(flame * 5 + 1)
            for i in range(26):     # flames on the hood
                x = 84 + rnd.randint(0, 20); h = rnd.randint(3, 11); yy = 36 - (h if (i + flame) % 2 else h - 2)
                for k in range(h):
                    c = ['#fff2b0', '#ffc85a', '#ff8a3a', '#d94a2f'][min(3, k * 4 // max(1, h))]
                    fr.putpixel((x, 35 - k), H(c))
            smoke(fr, 92, 20, 5, mk_ramp('#6a6a78'), random.Random(flame + 9), 9, 26)
        if wreck:
            rnd = random.Random(2)
            for i in range(10): x = 60 + rnd.randint(0, 40); fr.putpixel((x, 34 - rnd.randint(0, 3)), H('#ff8a3a') if i % 2 else H('#d94a2f'))
            smoke(fr, 88, 30, 4, mk_ramp('#5a5a68'), random.Random(4), 6, 20)
        silhouette(fr); return fr
    i0 = S.add('car0', frame(0), 200); S.add('car1', frame(1), 200); i2 = S.add('car2_0', frame(2, 0), 90); S.add('car2_1', frame(2, 1), 90); S.add('car2_2', frame(2, 2), 90)
    S.add('wreck', frame(2, 0, True), 200); S.tag('states', i0, i0 + 1); S.tag('burning', i2, i2 + 2); return S

# ======================================================================= L3: beach ball
def make_ball():
    S = Sheet('ball', 24, 24, 12, 22); cols = [mk_ramp(c) for c in ['#ff3a4a', '#ffffff', '#2f6bff', '#ffffff', '#ffd42a', '#ffffff']]
    def frame(t, sq=False, n=8):
        fr = S.blank(); off = t / n * 2 * math.pi
        cx, cy = 12, 13 if not sq else 17; rx, ry = (9, 9) if not sq else (11, 6)
        layer = S.blank(); px = layer.load()
        for y in range(24):
            for x in range(24):
                dx, dy = (x - cx) / rx, (y - cy) / ry
                if dx * dx + dy * dy <= 1.0:
                    ang = (math.atan2(dy, dx) + off) % (2 * math.pi); seg = int(ang / (2 * math.pi) * 6) % 6
                    px[x, y] = cols[seg][1]
        hard(layer); layer = __import__('make_enemy_sprites').shade(layer, 2)
        fr.alpha_composite(layer)
        d = ImageDraw.Draw(fr); ell(d, cx, cy, 1.3 if not sq else 1.6, 1.3 if not sq else 1, (255, 255, 255, 255)); d.point((cx - 4, cy - 5 if not sq else cy - 3), fill=(255, 255, 255, 255)); d.point((cx - 3, cy - 5 if not sq else cy - 3), fill=(255, 255, 255, 255))
        silhouette(fr); return fr
    i0 = S.add('ball0', frame(0), 80)
    for t in range(1, 8): S.add('ball%d' % t, frame(t), 80)
    S.add('squash', frame(0, True), 60); S.tag('spin', i0, i0 + 7); return S

# ======================================================================= L4: server rack
def make_server():
    S = Sheet('server', 40, 72, 20, 68); body = mk_ramp('#2a3050'); dark = mk_ramp('#10142a'); cyan = mk_ramp('#27f0ff'); grn = mk_ramp('#3dffa0'); red = mk_ramp('#ff2a4d')
    pink = mk_ramp('#ff2fd0'); yel = mk_ramp('#ffe44d'); metal = mk_ramp('#8a94b8')
    def frame(t, dmg=0, hit=False, dead=False):
        fr = S.blank(); rnd = random.Random(t * 17 + dmg * 5)
        def f(d, layer):
            rect(d, 5, 5, 35, 67, body[1]); rect(d, 5, 5, 6, 67, cyan[2] if not dead else body[3]); rect(d, 34, 5, 35, 67, body[3]); rect(d, 3, 66, 37, 70, body[3])
            rect(d, 8, 8, 32, 22, dark[2])
        add_part(fr, f, thick=2)
        def scr(d, layer):
            rect(d, 9, 9, 31, 21, (2, 4, 12, 255))
            if dead: return
            if hit or dmg >= 2:
                for k in range(5): d.line([(9 + rnd.randint(0, 6), 10 + k * 2), (24 + rnd.randint(0, 7), 10 + k * 2)], fill=(red if (hit or k % 2) else pink)[1])
            elif dmg == 1: d.line([(12, 11), (28, 19)], fill=red[1]); d.line([(28, 11), (12, 19)], fill=red[1])
            else:
                pts = [(10 + i, 15 + int(4 * math.sin(i * 0.7 + t * 1.3))) for i in range(21)]; d.line(pts, fill=grn[0])
                d.line([(x, y + 1) for x, y in pts], fill=grn[2])
                rect(d, 9, (12 + t * 2) % 9 + 10, 30, (12 + t * 2) % 9 + 10, cyan[3])
        add_part(fr, scr, thick=1, do_shade=False)
        def units(d, layer):
            for r in range(6):
                y = 25 + r * 7; rect(d, 8, y, 32, y + 5, dark[3]); rect(d, 8, y, 32, y, body[0]); rect(d, 24, y + 1, 30, y + 4, dark[4])
                for s in range(3): rect(d, 25, y + 1 + s, 29, y + 1 + s, body[3])
                if dmg >= 2 and r == 4: rect(d, 8, y + 2, 32, y + 6, dark[4])
        add_part(fr, units, thick=1)
        if not dead:
            for r in range(6):
                for l in range(3):
                    on = ((r * 3 + l + t) % 4) < 2 if dmg < 1 else (rnd.random() < 0.5)
                    col = (grn, cyan, yel)[l][0] if dmg == 0 else (red[0] if rnd.random() < 0.6 else yel[1])
                    x, y = 10 + l * 4, 27 + r * 7
                    fr.putpixel((x, y), col if on else dark[4]); fr.putpixel((x + 1, y), col if on else dark[4])
        def cab(d, layer):
            d.line([(12, 67), (14, 71), (22, 72)], fill=pink[1]); d.line([(18, 67), (20, 71), (30, 71)], fill=cyan[1]); d.line([(26, 67), (28, 70), (36, 71)], fill=yel[1])
        add_part(fr, cab, thick=1, do_shade=False, outline=False)
        if dmg >= 1 and not dead or dead: smoke(fr, 20, 5, 4 + dmg * 2 + (2 if dead else 0), mk_ramp('#8a8aa0'), random.Random(t + dmg), 7, 16 + dmg * 6)
        if hit or dmg >= 2:
            for (x, y) in [(11, 25), (28, 33), (19, 52), (30, 44), (13, 40)]: fr.putpixel((x, y), (255, 255, 255, 255)); fr.putpixel((x + 1, y - 1), yel[0]); fr.putpixel((x - 1, y + 1), cyan[0])
        silhouette(fr); return fr
    i0 = S.add('srv0', frame(0), 120)
    for t in (1, 2, 3): S.add('srv%d' % t, frame(t), 120)
    S.add('srv_hit', frame(0, 0, True), 60); S.add('srv_dmg1', frame(1, 1), 100); S.add('srv_dmg2', frame(2, 2), 100); S.add('srv_dead', frame(0, 2, False, True), 200)
    S.tag('idle', i0, i0 + 3); S.tag('damage', i0 + 4, i0 + 7); return S

# ======================================================================= L4: conveyor belt (tile 32x80)
def make_conveyor():
    S = Sheet('conveyor', 32, 80, 0, 0); metal = mk_ramp('#7a84a8'); belt = mk_ramp('#2a2a44'); yel = mk_ramp('#ffd42a'); cyan = mk_ramp('#27f0ff')
    def tile(t):
        fr = S.blank(); d = ImageDraw.Draw(fr)
        rect(d, 0, 6, 31, 73, belt[1])
        for x in range(0, 32, 8): d.line([((x + t * 4) % 32, 6), ((x + t * 4) % 32, 73)], fill=belt[2])            # slats scroll
        for ox in (0, 16):
            x = (ox + t * 4) % 32
            for (a, b) in [(0, 0), (-32, -32)]:
                for xx in (x, x - 32):
                    pts = [(xx, 12), (xx + 5, 12), (xx + 13, 40), (xx + 5, 68), (xx, 68), (xx + 8, 40)]
                    d.polygon(pts, fill=yel[1]); d.line([(xx + 5, 12), (xx + 13, 40)], fill=yel[0]); d.line([(xx + 8, 40), (xx, 68)], fill=yel[3])
        for y in (7, 72): d.line([(0, y), (31, y)], fill=cyan[2])
        rail = Image.new('RGBA', (32, 80), (0, 0, 0, 0)); rd = ImageDraw.Draw(rail); rect(rd, 0, 0, 31, 5, metal[1]); rect(rd, 0, 74, 31, 79, metal[1])
        rd.line([(0, 0), (31, 0)], fill=metal[0]); rd.line([(0, 74), (31, 74)], fill=metal[0]); rd.line([(0, 5), (31, 5)], fill=metal[3]); rd.line([(0, 79), (31, 79)], fill=metal[3])
        for x in range(4, 32, 8): rail.putpixel((x, 3), metal[0]); rail.putpixel((x, 77), metal[0]); rail.putpixel((x + 1, 4), metal[4]); rail.putpixel((x + 1, 78), metal[4])
        fr.alpha_composite(rail); return fr
    i0 = S.add('belt0', tile(0), 70)
    for t in (1, 2, 3): S.add('belt%d' % t, tile(t), 70)
    for name, right in (('capL', False), ('capR', True)):
        fr = S.blank(); d = ImageDraw.Draw(fr); x0 = 0 if right else 16
        rect(d, x0, 4, x0 + 15, 75, metal[2])
        for k in range(0, 16, 4): d.line([(x0 + k, 4), (x0 + k, 75)], fill=metal[1 if k % 8 == 0 else 3])
        d.line([(x0, 4), (x0 + 15, 4)], fill=metal[0]); d.line([(x0, 75), (x0 + 15, 75)], fill=metal[4])
        rect(d, x0 + (12 if right else 0), 4, x0 + (15 if right else 3), 75, metal[3])
        for y in range(10, 72, 12): d.point((x0 + 8, y), fill=metal[0])
        S.add(name, fr, 100)
    S.tag('belt', i0, i0 + 3); return S

# ======================================================================= export
SHEETS = [make_bin, make_hydrant, make_cabinet, make_bumper, make_car, make_ball, make_server, make_conveyor]

def export(S):
    cols = 8; rows = (len(S.frames) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * S.fw, rows * S.fh), (0, 0, 0, 0)); jf = {}
    for i, (name, im, dur) in enumerate(S.frames):
        x, y = (i % cols) * S.fw, (i // cols) * S.fh; sheet.alpha_composite(im, (x, y))
        jf[name] = {'frame': {'x': x, 'y': y, 'w': S.fw, 'h': S.fh}, 'duration': dur}
    meta = {'app': 'veexing-force prop generator', 'image': S.name + '.png', 'size': {'w': sheet.width, 'h': sheet.height}, 'anchor': {'x': S.ax, 'y': S.ay}, 'scale': 1,
            'frameTags': [dict(t) for t in S.tags]}
    return sheet, {'frames': jf, 'meta': meta}

ASEPRITE = r'F:\Dev\Tooling\aseprite\build\bin\aseprite.exe'

def build_pickups():
    """soda / pizza / mixtape: drawn pixel by pixel IN Aseprite by tools/ase/pickups.lua (real .aseprite: layers objet / vapeur / eclat,
    tags soda / pizza / tape), then exported by Aseprite. Frames are renamed <tag>_<i> for the game (js/enemies.js Pickup.draw)."""
    import subprocess
    base = os.path.join(ROOT, 'assets', 'props', 'pickups'); fw = lambda p: p.replace(chr(92), '/')
    for args in (['--script-param', 'out=' + fw(base + '.aseprite'), '--script', os.path.join(ROOT, 'tools', 'ase', 'pickups.lua')],
                 [base + '.aseprite', '--sheet', base + '.png', '--data', base + '_ase.json', '--format', 'json-array', '--sheet-type', 'rows',
                  '--sheet-columns', '6', '--list-tags', '--list-layers']):
        r = subprocess.run([ASEPRITE, '-b'] + args, capture_output=True, text=True, timeout=120)
        if r.returncode != 0: raise RuntimeError('aseprite failed: ' + r.stdout + r.stderr)
    aj = json.load(open(base + '_ase.json')); os.remove(base + '_ase.json'); jf = {}
    for t in aj['meta']['frameTags']:
        for i in range(t['from'], t['to'] + 1):
            fr = aj['frames'][i]; jf['%s_%d' % (t['name'], i - t['from'])] = {'frame': fr['frame'], 'duration': fr['duration']}
    sheet = Image.open(base + '.png').convert('RGBA')
    data = {'frames': jf, 'meta': {'app': 'aseprite (tools/ase/pickups.lua)', 'image': 'pickups.png', 'size': {'w': sheet.width, 'h': sheet.height},
                                   'anchor': {'x': 12, 'y': 26}, 'scale': 1,
                                   'frameTags': [{'name': t['name'], 'from': t['from'], 'to': t['to'], 'direction': 0} for t in aj['meta']['frameTags']]}}
    json.dump(data, open(base + '.json', 'w'), indent=1)
    return sheet, data

if __name__ == '__main__':
    os.makedirs(os.path.join(ROOT, 'assets', 'props'), exist_ok=True)
    js = ['// generated by tools/make_prop_sprites.py - do not edit', 'const PROP_SHEETS = {']; previews = []
    for mk in SHEETS:
        S = mk(); sheet, data = export(S); base = os.path.join(ROOT, 'assets', 'props', S.name)
        asekit.write_ase(base + '.aseprite', S.fw, S.fh, [{'layers': [im], 'duration': dur} for (_n, im, dur) in S.frames], S.tags)
        info = asekit.check_ase(base + '.aseprite'); assert info[0] == len(S.frames)
        sheet.save(base + '.png'); json.dump(data, open(base + '.json', 'w'), indent=1)
        buf = io.BytesIO(); sheet.save(buf, 'PNG', optimize=True)
        js.append("  %s: { img: 'data:image/png;base64,%s', json: %s }," % (S.name, base64.b64encode(buf.getvalue()).decode(), json.dumps(data)))
        previews.append((S.name, sheet)); print(S.name, len(S.frames), 'frames', info[2])
    sheet, data = build_pickups(); buf = io.BytesIO(); sheet.save(buf, 'PNG', optimize=True)
    js.append("  pickups: { img: 'data:image/png;base64,%s', json: %s }," % (base64.b64encode(buf.getvalue()).decode(), json.dumps(data)))
    previews.append(('pickups', sheet)); print('pickups', len(data['frames']), 'frames (aseprite)')
    js.append('};'); open(os.path.join(ROOT, 'js', 'propSprites.js'), 'w').write('\n'.join(js) + '\n')
    W = max(s.width for _, s in previews) * 2; Hh = sum(s.height for _, s in previews) * 2 + 10 * len(previews)
    pv = Image.new('RGBA', (W, Hh), (60, 40, 110, 255)); y = 0
    for _n, s in previews: pv.alpha_composite(s.resize((s.width * 2, s.height * 2), Image.NEAREST), (0, y)); y += s.height * 2 + 10
    pv.save(os.path.join(ROOT, 'tools', 'props_preview.png'))

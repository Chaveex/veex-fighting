"""Steam-vent manhole asset, drawn in the same pixel-art pipeline as the characters.
States: off / warn (about to blow) / burst + active (steam jet) / cool.
Outputs:
  assets/vent.aseprite   real Aseprite file (2 layers: base + steam, 20 frames, tags) - open it in Aseprite and edit by hand
  assets/vent.png|json   composite sheet + Aseprite-format JSON
  js/ventSprites.js      embedded base / steam sheets for the game (separate so characters can walk between them)"""
import base64, io, json, math, os, struct, zlib
from PIL import Image, ImageDraw, ImageChops

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FW, FH = 64, 96
CX, CY = 32, 84                       # centre of the manhole ellipse (also the sprite anchor)

def H(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)
IRON = [H(c) for c in ['#9095bb', '#686d94', '#4d5278', '#383c5f', '#252844']]
GLOW = [H(c) for c in ['#fff4b8', '#ffc85a', '#ff8a3a', '#d94a2f', '#8a2030']]
STEAM = [H(c) for c in ['#ffffff', '#eaf8ff', '#c9e9ff', '#98c8f0', '#6c96c8']]
DARK, OUT = H('#15101e'), H('#241230')
REV = {}
for rp in (IRON, GLOW, STEAM):
    for i, c in enumerate(rp): REV[c] = (rp, i)
def shift(c, d):
    k = REV.get(c)
    if not k: return c
    rp, i = k; return rp[max(0, min(len(rp) - 1, i + d))]

BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
def blank(): return Image.new('RGBA', (FW, FH), (0, 0, 0, 0))

def rim_shade(layer):
    """light from the top-left: light rim on the lit edge, ramp-darkened on the far edge"""
    a = layer.getchannel('A')
    hi = ImageChops.subtract(a, ImageChops.offset(a, 1, 1)); lo = ImageChops.subtract(a, ImageChops.offset(a, -1, -1))
    out = layer.copy(); po, ph, pl = out.load(), hi.load(), lo.load()
    for y in range(FH):
        for x in range(FW):
            if po[x, y][3]:
                if pl[x, y]: po[x, y] = shift(po[x, y], 1)
                if ph[x, y]: po[x, y] = shift(po[x, y], -1)
    return out

def ell(d, cx, cy, rx, ry, col): d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=col)

# ---------------------------------------------------------------- base layer (the cover on the floor)
STATES = [('off', 1, 500)] + [('warn', 6, 90), ('burst', 2, 50), ('active', 8, 70), ('cool', 3, 90)]

def base_frame(state, t):
    im = blank(); d = ImageDraw.Draw(im)
    lift = {'off': 0, 'warn': 0, 'burst': 4, 'active': 2, 'cool': [2, 1, 0][t % 3]}[state]
    dx = [-1, 1, -1, 0, 1, 0][t % 6] if state == 'warn' else 0
    dy = -1 if state == 'warn' and t % 2 else 0
    # scorch / grime around the collar
    for y in range(CY - 14, CY + 15):
        for x in range(CX - 31, CX + 32):
            r = math.hypot((x - CX) / 29.0, (y - CY) / 11.5)
            heat = 0.40 if state in ('active', 'burst', 'cool') else 0.14
            if 0.9 < r < 1.0 and BAYER[y & 3][x & 3] / 16 < heat and im.getpixel((x, y))[3] == 0: im.putpixel((x, y), (18, 12, 30, 255))
    ell(d, CX, CY, 26, 10, DARK); ell(d, CX, CY, 25, 9, IRON[3])                                # cast-iron collar
    d.arc([CX - 25, CY - 9, CX + 25, CY + 9], 200, 340, fill=IRON[1])
    if lift:
        ell(d, CX, CY, 22, 8, GLOW[0] if state == 'burst' else GLOW[1])                            # light escaping under the lid
        ell(d, CX, CY + 1, 19, 6, GLOW[2])
    cy = CY - lift + dy; cx = CX + dx
    # lid = thick disc: side wall + top face, shaded separately
    wall = blank(); wd = ImageDraw.Draw(wall); ell(wd, cx, cy + 3, 22, 8, IRON[3]); ell(wd, cx, cy + 2, 22, 8, IRON[3])
    im.alpha_composite(rim_shade(wall))
    top = blank(); td = ImageDraw.Draw(top); ell(td, cx, cy, 22, 8, IRON[1])
    ell(td, cx, cy, 20, 7, IRON[2]) if state != 'off' and False else None
    top = rim_shade(top); im.alpha_composite(top); d = ImageDraw.Draw(im)
    d.arc([cx - 21, cy - 7, cx + 21, cy + 7], 190, 350, fill=IRON[0])                          # bevel highlight
    d.arc([cx - 21, cy - 7, cx + 21, cy + 7], 15, 165, fill=IRON[3])
    # grate slots (perspective-squashed), colour depends on the state
    pulse = 0.5 + 0.5 * math.sin(t * 1.4)
    slot = {'off': DARK, 'warn': GLOW[2] if pulse > 0.45 else GLOW[3], 'burst': GLOW[0], 'active': GLOW[0] if t % 2 else GLOW[1],
            'cool': [GLOW[3], GLOW[4], DARK][t % 3]}[state]
    for i in range(-2, 3):
        yy = cy + i * 2.6; half = 14.5 * math.sqrt(max(0.05, 1 - (i * 2.6 / 7.2) ** 2))
        d.line([(cx - half, yy), (cx + half, yy)], fill=slot)
        if state == 'off': d.line([(cx - half + 1, yy + 1), (cx + half + 1, yy + 1)], fill=IRON[0])   # lit lower edge
        elif state in ('warn', 'active', 'burst'): d.line([(cx - half, yy - 1), (cx + half, yy - 1)], fill=GLOW[3] if state == 'warn' else GLOW[2])
    ell(d, cx, cy, 5, 2, IRON[0]); ell(d, cx, cy + 0.5, 3.5, 1.3, IRON[2])                       # centre hub
    for k in range(10):                                                                            # rivets
        a = k / 10 * 2 * math.pi; rx, ry = cx + 19.2 * math.cos(a), cy + 6.4 * math.sin(a)
        d.point((round(rx), round(ry)), fill=IRON[0]); d.point((round(rx) + 1, round(ry) + 1), fill=IRON[4])
    if state == 'warn':                                                                            # dithered red heat halo, pulsing
        for y in range(FH):
            for x in range(FW):
                r = math.hypot((x - cx) / 24.5, (y - cy) / 9.5)
                if 0.96 < r < 1.14 and BAYER[y & 3][x & 3] / 16 < 0.25 + 0.5 * pulse and im.getpixel((x, y))[3] == 0 or (0.96 < r < 1.08 and BAYER[y & 3][x & 3] / 16 < 0.2 * pulse):
                    im.putpixel((x, y), GLOW[2] if pulse > 0.6 else GLOW[3])
    if state == 'off':                                                                             # rust + wear
        for (x, y) in [(CX - 12, CY - 3), (CX - 11, CY - 2), (CX + 9, CY + 3), (CX + 14, CY + 1), (CX - 5, CY + 5), (CX + 4, CY - 5)]: im.putpixel((x, y), IRON[3])
    return im

# ---------------------------------------------------------------- steam layer
def puff(im, cx, cy, r, alpha, tone=0.0):
    px = im.load()
    for y in range(int(cy - r) - 1, int(cy + r) + 2):
        for x in range(int(cx - r) - 1, int(cx + r) + 2):
            if not (0 <= x < FW and 0 <= y < FH): continue
            dx, dy = x - cx, y - cy; dd = math.hypot(dx, dy)
            if dd > r: continue
            a = alpha * (1 - (dd / r) ** 3)
            if BAYER[y & 3][x & 3] / 16 >= a: continue
            lit = -(dx + dy) / (r * 1.5)                     # +1 on the lit (top-left) side
            px[x, y] = STEAM[max(0, min(4, int(round(2 - lit * 1.5 + tone))))]

def steam_frame(state, t, n):
    im = blank(); rnd = __import__('random').Random(7 + t * 13 + hash(state) % 97)
    if state == 'off': return im
    if state == 'warn':
        k = (t + 1) / n
        for w in range(4):
            ph = (t / n + w * 0.27) % 1.0; x = CX - 11 + w * 7 + math.sin(w * 2 + t) * 1.5
            for s in range(3):
                ph2 = (ph + s * 0.18) % 1.0
                puff(im, x + math.sin(ph2 * 6 + w) * 2, CY - 3 - ph2 * (10 + 16 * k), 1.8 + ph2 * 3, (0.9 - ph2 * 0.7) * (0.35 + 0.65 * k), ph2 * 1.2)
        return im
    P = 18
    if state == 'burst': grow = 0.55 + 0.45 * t; wide = 1.35; alive = 1.0; sparks = 14
    elif state == 'cool': grow = 0.55 - 0.12 * t; wide = 1.0; alive = 0.65 - 0.2 * t; sparks = 0
    else: grow = 1.0; wide = 1.0; alive = 1.0; sparks = 0
    puffs = []
    for i in range(P):
        ph = (t / n + i / P) % 1.0
        h = ph * 76 * grow; x = CX + math.sin(i * 2.399 + ph * 4.2) * (2 + ph * 10) * wide
        r = (5.0 + ph * 8.5 * (0.8 + 0.4 * ((i * 7) % 3) / 2)) * (wide if ph < 0.5 else 1)
        a = min(1.0, 1.7 * (1 - ph) ** 0.85) * (0.55 + 0.45 * min(1, ph * 7)) * alive
        puffs.append((h, x, r, a, ph))
    for h, x, r, a, ph in sorted(puffs, key=lambda p: -p[0]): puff(im, x, CY - 5 - h, r, a, ph * 1.3)
    if state != 'cool':
        for k in range(5): puff(im, CX + (k % 2 - 0.5) * 2, CY - 4 - k * 4.5 * grow, 4.6 - k * 0.3, 1.0, 0.0)   # bright core of the jet
    for s in range(sparks):
        a = rnd.uniform(-math.pi * 0.95, -math.pi * 0.05); dist = rnd.uniform(10, 30) * grow
        x, y = CX + math.cos(a) * dist * 0.9, CY - 4 + math.sin(a) * dist
        if 0 <= x < FW - 1 and 0 <= y < FH - 1: im.putpixel((int(x), int(y)), GLOW[0]); im.putpixel((int(x) + 1, int(y)), GLOW[1])
    return im

# ---------------------------------------------------------------- assemble
frames = []      # (name, base, steam, duration)
tags = []
for state, n, dur in STATES:
    start = len(frames)
    for t in range(n):
        frames.append(('%s%d' % (state, t), base_frame(state, t), steam_frame(state, t, n), dur))
    tags.append({'name': state, 'from': start, 'to': len(frames) - 1})

def sheet_of(sel):
    cols = 10; rows = math.ceil(len(frames) / cols); sh = Image.new('RGBA', (cols * FW, rows * FH), (0, 0, 0, 0)); jf = {}
    for i, (name, b, s, dur) in enumerate(frames):
        x, y = (i % cols) * FW, (i // cols) * FH
        sh.alpha_composite(sel(b, s), (x, y)); jf[name] = {'frame': {'x': x, 'y': y, 'w': FW, 'h': FH}, 'duration': dur}
    return sh, jf
def comp(b, s): c = b.copy(); c.alpha_composite(s); return c
sheet, jf = sheet_of(comp); base_sheet, _ = sheet_of(lambda b, s: b); steam_sheet, _ = sheet_of(lambda b, s: s)
meta = {'app': 'veexing-force vent generator', 'image': 'vent.png', 'size': {'w': sheet.width, 'h': sheet.height}, 'anchor': {'x': CX, 'y': CY},
        'frameTags': [dict(t, direction='forward') for t in tags], 'layers': ['base', 'steam']}
data = {'frames': jf, 'meta': meta}

# ---------------------------------------------------------------- real .aseprite writer (spec: aseprite/docs/ase-file-specs.md)
def word(v): return struct.pack('<H', v)
def dword(v): return struct.pack('<I', v)
def string(s): b = s.encode('utf8'); return word(len(b)) + b
def chunk(t, body): return dword(len(body) + 6) + word(t) + body
def layer_chunk(name): return chunk(0x2004, word(3) + word(0) + word(0) + word(0) + word(0) + word(0) + bytes([255, 0, 0, 0]) + string(name))
def cel_chunk(layer, im):
    raw = im.tobytes()
    return chunk(0x2005, word(layer) + struct.pack('<hh', 0, 0) + bytes([255]) + word(2) + struct.pack('<h', 0) + bytes(5) + word(FW) + word(FH) + zlib.compress(raw, 9))
def tags_chunk():
    body = word(len(tags)) + bytes(8)
    for t in tags: body += word(t['from']) + word(t['to']) + bytes([0]) + word(0) + bytes(6) + bytes([0, 0, 0]) + bytes([0]) + string(t['name'])
    return chunk(0x2018, body)
def write_ase(path):
    fr_bytes = []
    for i, (name, b, s, dur) in enumerate(frames):
        chunks = []
        if i == 0: chunks += [chunk(0x2007, word(1) + word(0) + struct.pack('<i', 0) + bytes(8)), layer_chunk('base'), layer_chunk('steam')]
        chunks += [cel_chunk(0, b), cel_chunk(1, s)]
        if i == 0: chunks.append(tags_chunk())
        body = b''.join(chunks); n = len(chunks)
        fr_bytes.append(dword(len(body) + 16) + word(0xF1FA) + word(n) + word(dur) + bytes(2) + dword(n) + body)
    frames_blob = b''.join(fr_bytes)
    header = (dword(128 + len(frames_blob)) + word(0xA5E0) + word(len(frames)) + word(FW) + word(FH) + word(32) + dword(1) + word(100) + dword(0) + dword(0)
              + bytes([0]) + bytes(3) + word(0) + bytes([1, 1]) + struct.pack('<hhHH', 0, 0, 16, 16) + bytes(84))
    assert len(header) == 128, len(header)
    open(path, 'wb').write(header + frames_blob)

if __name__ == '__main__':
    os.makedirs(os.path.join(ROOT, 'assets'), exist_ok=True)
    write_ase(os.path.join(ROOT, 'assets', 'vent.aseprite'))
    sheet.save(os.path.join(ROOT, 'assets', 'vent.png')); json.dump(data, open(os.path.join(ROOT, 'assets', 'vent.json'), 'w'), indent=1)
    def b64(im): buf = io.BytesIO(); im.save(buf, 'PNG', optimize=True); return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
    open(os.path.join(ROOT, 'js', 'ventSprites.js'), 'w').write(
        '// generated by tools/make_vent_sprites.py - do not edit\nconst VENT_SHEETS = {\n  base: { img: \'%s\', json: %s },\n  steam: { img: \'%s\', json: %s }\n};\n'
        % (b64(base_sheet), json.dumps(data), b64(steam_sheet), json.dumps(data)))
    pv = sheet.resize((sheet.width * 3, sheet.height * 3), Image.NEAREST); bg = Image.new('RGBA', pv.size, (52, 36, 100, 255)); bg.alpha_composite(pv)
    bg.save(os.path.join(ROOT, 'tools', 'vent_preview.png'))
    print('frames', len(frames), 'tags', [t['name'] for t in tags])

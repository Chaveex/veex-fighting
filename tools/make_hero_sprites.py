"""VEEX hero spritesheet v7 (animation rewritten from scratch in tools/hero_anim.py; model = tools/hero6.py) - designed from the written description only (no photo), finished with the real Aseprite.
  mulet prononce, textured brown hair, discreet moustache, 3-day stubble; denim jacket with popped collar over a white crew-neck tee with
  horizontal red/blue stripes; light-wash jeans, hi-top sneakers, wrapped fists (80s/90s casual).
The hero is a 3D model with a full skeleton (3D two-bone IK, torso twist, real spin) rendered to pixel art (tools/hero6.py, render3d.py);
animations are authored in tools/hero_anim.py (screen-space targets, per-phase frames: startup / active / recovery).
The animation table (frame names, weights, phases) is exported in meta.anims; js/sprites.js (HeroSprites.frameFor) maps game timing onto it.
Pipeline: Python renders -> assets/hero_src.aseprite (layers body + rim) -> aseprite.exe (Lua) indexed palette -> assets/hero.aseprite
          -> aseprite.exe exports hero.png + json + preview GIFs -> js/heroSprites.js
usage: python tools/make_hero_sprites.py [few|full] [veex|roxy]   (roxy = second playable hero: assets/hero_roxy.*, js/heroSprites_roxy.js)"""
import base64, io, json, math, os, subprocess, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hero6, hero_anim as HA, hero_pixel
import asekit

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASEPRITE = r'F:\Dev\Tooling\aseprite\build\bin\aseprite.exe'
LOOK = next((a for a in sys.argv[1:] if a in hero6.LOOKS), 'veex')
HERO = hero6.Hero6(look=LOOK)
STEM = 'hero' if LOOK == 'veex' else 'hero_' + LOOK          # file stem of every output
JSVAR, JSFILE = ('HERO_SHEET', 'heroSprites.js') if LOOK == 'veex' else ('HERO_SHEET_' + LOOK.upper(), 'heroSprites_%s.js' % LOOK)
FW = FH = HERO.FS
OX, OY = HERO.OX, HERO.OY
UNIT = HERO.k                       # game-wide scale factor (see js/util.js PU)
frames, tags, ANIMS = HA.build()    # [(name, pose, wind)], [{name, from, to, direction}], {anim: {f, w, ph}}
WEIGHT = {f: (a['w'][i], a['ph'][i]) for a in ANIMS.values() for i, f in enumerate(a['f'])}

def durations(name):
    w, ph = WEIGHT[name]
    return int(round(w * 1000 / 60)) if ph == 'l' else 60 if ph == 's' else 70

def render_frame(pose, wind, name=''):
    if LOOK == 'veex': return hero_pixel.render(pose, wind, name)      # v9: hand-made 2D pixel art (tools/hero_pixel.py)
    return HERO.render(HA.solve(pose), wind)

def render_all(only=None):
    out = []
    for name, pose, wind in frames:
        if only is None or name in only: body, rim = render_frame(pose, wind, name)
        else: body = rim = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
        out.append((name, body, rim))
    return out

def run_ase(args):
    r = subprocess.run([ASEPRITE, '-b'] + args, capture_output=True, text=True, timeout=300)
    if r.returncode != 0: raise RuntimeError('aseprite failed: ' + ' '.join(args) + '\n' + r.stdout + r.stderr)
    return r.stdout

def preview(names, path, scale=3):
    res = {n: (b, r) for n, b, r in render_all(set(names))}
    big = Image.new('RGBA', (len(names) * FW * scale, FH * scale), (52, 36, 100, 255))
    for i, n in enumerate(names):
        im = res[n][0].copy(); im.alpha_composite(res[n][1]); big.alpha_composite(im.resize((FW * scale, FH * scale), Image.NEAREST), (i * FW * scale, 0))
    big.save(path)

if __name__ == '__main__':
    mode = next((a for a in sys.argv[1:] if a in ('few', 'full')), 'full')
    if mode == 'few':
        preview(['idle_0', 'walk_2', 'jab_s0', 'cross_s0', 'elbow_s0', 'round_s0'], os.path.join(ROOT, 'tools', 'few_preview_%s.png' % LOOK)); sys.exit()
    res = render_all()
    assets = os.path.join(ROOT, 'assets'); os.makedirs(assets, exist_ok=True)
    src = os.path.join(assets, STEM + '_src.aseprite')
    asekit.write_ase(src, FW, FH, [{'layers': [b, r], 'duration': durations(n)} for n, b, r in res], [dict(t) for t in tags], layer_names=('body', 'rim'))
    lua = os.path.join(ROOT, 'tools', 'ase', 'hero_finalize.lua')
    run_ase([src, '--script-param', 'out=' + os.path.join(assets, STEM + '.aseprite').replace(chr(92), '/'), '--script', lua])
    run_ase([os.path.join(assets, STEM + '.aseprite'), '--sheet', os.path.join(assets, STEM + '.png'), '--data', os.path.join(assets, STEM + '_ase.json'),
             '--format', 'json-array', '--sheet-type', 'rows', '--sheet-columns', '10', '--list-tags'])
    gifs = os.path.join(assets, STEM + '_preview'); os.makedirs(gifs, exist_ok=True)
    for f in os.listdir(gifs): os.remove(os.path.join(gifs, f))
    for tg in [t['name'] for t in tags]:
        run_ase(['--tag', tg, os.path.join(assets, STEM + '.aseprite'), '--scale', '3', '--save-as', os.path.join(gifs, tg + '.gif')])
    aj = json.load(open(os.path.join(assets, STEM + '_ase.json')))
    sheet = Image.open(os.path.join(assets, STEM + '.png')).convert('RGBA')
    jf = {n: {'frame': aj['frames'][i]['frame'], 'duration': aj['frames'][i]['duration']} for i, (n, b, r) in enumerate(res)}
    meta = {'app': ('veexing-force hero generator v9 (hand-made 2D pixel art from the photo, animation v7, aseprite export)' if LOOK == 'veex' else 'veexing-force hero generator v7 (3D skeleton -> pixel art, aseprite export)'), 'image': STEM + '.png', 'look': LOOK, 'size': {'w': sheet.width, 'h': sheet.height},
            'anchor': {'x': OX, 'y': OY}, 'scale': round(UNIT, 3), 'frameTags': [dict(t) for t in tags], 'anims': ANIMS}
    data = {'frames': jf, 'meta': meta}; json.dump(data, open(os.path.join(assets, STEM + '.json'), 'w'), indent=1)
    buf = io.BytesIO(); sheet.save(buf, 'PNG', optimize=True)
    extra = ''
    if LOOK != 'veex':   # no photo for this hero: pixel portrait = head of the first idle frame, x4
        f0 = jf[frames[0][0]]['frame']; fr = sheet.crop((f0['x'], f0['y'], f0['x'] + FW, f0['y'] + FH)); al = np.array(fr)[..., 3]
        ys, xs = np.nonzero(al); top = int(ys.min()); cx = int(xs[(ys > top + 8) & (ys < top + 30)].max()) - 17   # face side (the ponytail trails behind)
        por = fr.crop((cx - 22, top - 3, cx + 16, top + 50)); bg = Image.new('RGBA', por.size, (40, 20, 80, 255)); bg.alpha_composite(por)
        pb = io.BytesIO(); bg.resize((por.width * 4, por.height * 4), Image.NEAREST).save(pb, 'PNG')
        extra = "  portrait: 'data:image/png;base64,%s',\n" % base64.b64encode(pb.getvalue()).decode()
    open(os.path.join(ROOT, 'js', JSFILE), 'w').write(
        "// generated by tools/make_hero_sprites.py - do not edit\nconst %s = {\n  img: 'data:image/png;base64,%s',\n%s  json: %s\n};\n" % (JSVAR, base64.b64encode(buf.getvalue()).decode(), extra, json.dumps(data)))
    print('frames', len(frames), 'sheet', sheet.size, 'UNIT', round(UNIT, 3))

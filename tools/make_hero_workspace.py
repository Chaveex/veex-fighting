"""Builds the Aseprite drawing workspace for the hero (assets/hero_workspace.aseprite) and the spec the import script uses.
usage: python tools/make_hero_workspace.py
Needs assets/hero.png (run tools/make_hero_sprites.py first) and assets/palette/veex.gpl (tools/make_hero_palette.py)."""
import json, os, subprocess, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_hero_sprites as H

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TAG_COLORS = {'idle': '#3dffa0', 'crouch': '#3dffa0', 'walk': '#27f0ff', 'jump': '#27f0ff', 'land': '#27f0ff', 'dash': '#8b5cff', 'airdash': '#8b5cff',
              'hurt': '#ff2a4d', 'tumble': '#ff2a4d', 'down': '#ff2a4d', 'getup': '#ff2a4d', 'fury': '#ffe44d', 'spin': '#ffe44d', 'fury_end': '#ffe44d'}

def build_spec():
    frames = [{'name': n, 'duration': H.durations(n)} for n, _p, _w in H.frames]
    tags = []
    for t in H.tags:
        name = t['name']; color = TAG_COLORS.get(name, '#ff2fd0')   # every other tag is a move
        tags.append({'name': name, 'from': t['from'], 'to': t['to'], 'color': color})
    # body proportions (rows from the top of the canvas) for the guide lines: head top, chin, shoulders, hip, knee
    k, hero, p = H.UNIT, H.HERO, H.frames[0][1]
    hip = p['hy'] * k; chest = hip + hero.L['torso']; head_c = chest + hero.L['neck']; ry = 10.6 * k * hero.hs
    guides = [round(H.OY - v) for v in (head_c + ry, head_c - ry * 0.92, chest - 2.3 * k, hip, hip - 0.5 * hero.L['thigh'])]
    return {'w': H.FW, 'h': H.FH, 'ax': H.OX, 'ay': H.OY, 'cols': 10, 'guides': guides, 'frames': frames, 'tags': tags, 'anims': H.ANIMS}

if __name__ == '__main__':
    assets = os.path.join(ROOT, 'assets'); os.makedirs(os.path.join(assets, 'ref'), exist_ok=True)
    spec = build_spec(); json.dump(spec, open(os.path.join(assets, 'hero_spec.json'), 'w'), indent=1)
    Image.open(os.path.join(assets, 'hero.png')).convert('RGBA').save(os.path.join(assets, 'ref', 'hero_ref_sheet.png'))   # truecolour copy (Lua reads indexed PNGs badly)
    out = os.path.join(assets, 'hero_workspace.aseprite')
    r = subprocess.run([H.ASEPRITE, '-b', '--script-param', 'root=' + ROOT.replace('\\', '/'), '--script', os.path.join(ROOT, 'tools', 'ase', 'hero_workspace.lua')], capture_output=True, text=True, timeout=300)
    print(r.stdout.strip() or r.stderr.strip())
    if r.returncode != 0 or not os.path.exists(out): sys.exit('workspace build failed')
    print('frames', len(spec['frames']), 'tags', len(spec['tags']))

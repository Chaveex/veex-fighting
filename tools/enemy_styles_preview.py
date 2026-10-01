"""contact sheet of every enemy/boss (idle0) in the new 3D style: python tools/enemy_styles_preview.py [keys...] -> assets/enemy_proposals/enemies_3d.png"""
import os, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import enemy3d as E3
from make_enemy_sprites import ROSTER, frame_plan
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EU = 1.22
def render_idle(sp, name='idle0'):
    ch = E3.Char3D(sp, EU); plan = {n: (p, w) for n, p, w in frame_plan(sp)}; pose, wind = plan[name]
    b, r = ch.render(pose, 28, 52, 6, (wind[0], wind[1])); im = b.copy(); im.alpha_composite(r); return im, ch
def main(keys):
    roster = [s for s in ROSTER if not keys or s['key'] in keys]; cell = 192
    sheet = Image.new('RGBA', (6 * cell * 2 // 2, ((len(roster) + 5) // 6) * cell), (52, 36, 100, 255))
    for i, sp in enumerate(roster):
        im, ch = render_idle(sp); big = im.resize((im.width * 1, im.height * 1), Image.NEAREST)
        sheet.alpha_composite(big, ((i % 6) * cell + (cell - im.width) // 2, (i // 6) * cell + (cell - im.height) // 2 + 8))
    os.makedirs(os.path.join(ROOT, 'assets', 'enemy_proposals'), exist_ok=True)
    out = os.path.join(ROOT, 'assets', 'enemy_proposals', 'enemies_3d.png'); sheet = sheet.resize((sheet.width * 2 // 2 * 1, sheet.height), Image.NEAREST); sheet.save(out); print(out, sheet.size)
if __name__ == '__main__': main(sys.argv[1:])

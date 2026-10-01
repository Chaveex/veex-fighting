"""preview strips of the v7 hero animation: python tools/hero_anim_preview.py idle jab cross ...  (animation names; 'all' = everything) [--look=roxy] [--out=path]
-> assets/hero_proposals/hero7_preview.png (one row per animation, frame names under each cell)"""
import os, sys
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hero6, hero_anim as HA
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def main(names, out=None, sc=2, look='veex'):
    hero = hero6.Hero6(look=look); anims = HA.build_anims()
    if names == ['all']: names = list(anims)
    rows = []
    for nm in names:
        ims = []
        for fname, pose, w, ph, wind in HA.expand(nm, anims[nm]):
            b, r = hero.render(HA.solve(pose), wind); im = b.copy(); im.alpha_composite(r); ims.append((fname, ph, im))
        rows.append(ims)
    cw, ch = 128 * sc, 128 * sc + 14
    W = max(len(r) for r in rows) * cw; sheet = Image.new('RGBA', (W, len(rows) * ch), (52, 36, 100, 255)); d = ImageDraw.Draw(sheet)
    for ri, ims in enumerate(rows):
        for ci, (fn, ph, im) in enumerate(ims):
            x, y = ci * cw, ri * ch
            d.line([(x, y + hero.OY * sc), (x + cw, y + hero.OY * sc)], fill=(90, 70, 150, 255))
            d.line([(x + hero.OX * sc, y + 118 * sc), (x + hero.OX * sc, y + 124 * sc)], fill=(255, 47, 208, 255))
            sheet.alpha_composite(im.resize((128 * sc, 128 * sc), Image.NEAREST), (x, y))
            d.text((x + 4, y + 128 * sc), '%s [%s]' % (fn, ph), fill=(255, 255, 255, 255))
            d.line([(x + cw - 1, y), (x + cw - 1, y + ch)], fill=(30, 20, 60, 255))
    out = out or os.path.join(ROOT, 'assets', 'hero_proposals', 'hero7_preview.png'); sheet.save(out); print(out, sheet.size)
if __name__ == '__main__':
    a = [x for x in sys.argv[1:] if not x.startswith('--')]
    o = next((x[6:] for x in sys.argv[1:] if x.startswith('--out=')), None)
    lk = next((x[7:] for x in sys.argv[1:] if x.startswith('--look=')), 'veex')
    main(a or ['idle'], o, look=lk)

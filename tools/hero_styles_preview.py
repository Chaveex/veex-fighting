"""Renders the same poses in the 3 hero styles side by side, so the style can be chosen before animating everything.
usage: python tools/hero_styles_preview.py [A B C] -> tools/hero_styles.png"""
import os, sys
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hero3d as H3
from make_enemy_sprites import POSES, lerp_pose, idle_pose

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = POSES
POSE_LIST = [  # (label, pose, yaw_body, yaw_head, twist, wind)
    ('IDLE', (lambda p: (p.update(hy=p['hy'] + 2.2, hFy=p['hFy'] - 7.0, hBy=p['hBy'] - 6.0, hFx=p['hFx'] + 2.5), p)[1])(dict(idle_pose(0.6, 0.3, S['stance']))), 28, 58, 6, (0, 1.0)),
    ('JAB', S['jab_s'], 28, 58, 12, (-2, 1)),
    ('ROUNDHOUSE', S['round_s'], 16, 52, -14, (-2, 1)),
]

def main(keys):
    cell = 128 * 4
    sheet = Image.new('RGBA', (cell * len(POSE_LIST), (cell + 34) * len(keys)), (40, 28, 72, 255)); d = ImageDraw.Draw(sheet)
    for r, key in enumerate(keys):
        hero = H3.Hero(key)
        d.text((8, r * (cell + 34) + 8), hero.S['name'], fill=(255, 228, 77, 255))
        for c, (label, pose, yb, yh, tw, wind) in enumerate(POSE_LIST):
            body, rim = hero.render(pose, yb, yh, tw, wind); im = body.copy(); im.alpha_composite(rim)
            sheet.alpha_composite(im.resize((cell, cell), Image.NEAREST), (c * cell, r * (cell + 34) + 34))
            d.text((c * cell + 8, r * (cell + 34) + 22), label, fill=(200, 200, 230, 255))
    out = os.path.join(ROOT, 'tools', 'hero_styles.png'); sheet.save(out); print(out, sheet.size)

if __name__ == '__main__':
    main([a for a in sys.argv[1:]] or ['A', 'B', 'C'])

def faces():
    from PIL import Image
    big = Image.new('RGBA', (3 * 512, 512), (40, 28, 72, 255))
    for i, key in enumerate(['A', 'B', 'C']):
        hero = H3.Hero(key); label, pose, yb, yh, tw, wind = POSE_LIST[0]
        body, rim = hero.render(pose, yb, yh, tw, wind); im = body.copy(); im.alpha_composite(rim)
        hx, hy = 64, int(hero.OY - (pose['hy'] + 18 + 14) * hero.k)
        crop = im.crop((hx - 32, max(0, hy - 34), hx + 32, max(0, hy - 34) + 64)).resize((512, 512), Image.NEAREST); big.alpha_composite(crop, (i * 512, 0))
    big.save(os.path.join(ROOT, 'tools', 'hero_faces.png'))

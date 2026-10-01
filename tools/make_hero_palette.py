"""VEEX palette for Aseprite, taken from the ramps the hero sprite really uses (tools/hero6.py): ramps go light -> dark,
lights drift warm, shadows drift violet. Outputs: assets/palette/veex.gpl (Palette > Load Palette in Aseprite), veex.hex (Lospec),
veex_swatch.png and docs/HERO_PALETTE.md"""
import os, sys
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hero6

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GROUPS = [('Peau', 'skin'), ('Cheveux', 'hair'), ('Barbe 3 jours', 'beard'), ('Yeux (iris)', 'iris'), ('Veste en jean', 'denim'), ('Jean brut', 'jeans'),
          ('T-shirt blanc', 'white'), ('T-shirt rouge', 'red'), ('T-shirt bleu', 'blue'), ('Baskets', 'shoe'), ('Semelle', 'gum'), ('Cuir (ceinture)', 'leather'), ('Laiton (boutons)', 'gold'), ('Ombre / pupille', 'dark')]
EXTRA = [('Neon', [('neon-cyan', '#27f0ff'), ('neon-magenta', '#ff2fd0'), ('neon-jaune', '#ffe44d'), ('neon-violet', '#8b5cff')]), ('Contour', [('contour', '#241230'), ('contour-doux', '#3a2240')])]
LABEL = ['reflet', 'clair', 'base', 'ombre', 'profond']

def hexof(c): return '#%02x%02x%02x' % tuple(c[:3])

if __name__ == '__main__':
    palette = []
    for title, key in GROUPS:
        ramp = hero6.RAMPS[hero6.ID[key]]; palette.append((title, [('%s-%s' % (key, LABEL[i]), hexof(ramp[i])) for i in range(5)]))
    palette += EXTRA
    out = os.path.join(ROOT, 'assets', 'palette'); os.makedirs(out, exist_ok=True)
    flat = [(g, n, h) for g, items in palette for n, h in items]
    with open(os.path.join(out, 'veex.gpl'), 'w', encoding='utf8') as f:
        f.write('GIMP Palette\nName: VEEX\nColumns: 5\n#\n')
        for g, n, h in flat: f.write('%3d %3d %3d\t%s\n' % (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16), n))
    with open(os.path.join(out, 'veex.hex'), 'w') as f:
        for g, n, h in flat: f.write(h[1:] + '\n')
    sw = Image.new('RGB', (5 * 56, len(palette) * 40), (30, 20, 50)); d = ImageDraw.Draw(sw)
    for r, (g, items) in enumerate(palette):
        for c, (n, h) in enumerate(items): d.rectangle([c * 56 + 2, r * 40 + 2, c * 56 + 53, r * 40 + 37], fill=h)
    sw.save(os.path.join(out, 'veex_swatch.png'))
    md = ['# Palette VEEX (%d couleurs)' % len(flat), '', 'Reflet -> profond. Fichier Aseprite : `assets/palette/veex.gpl` (Palette -> Load Palette), Lospec : `veex.hex`.', '',
          '| Famille | Reflet | Clair | Base | Ombre | Profond |', '|---|---|---|---|---|---|']
    for g, items in palette: md.append('| %s | %s |' % (g, ' | '.join('`%s`' % h for n, h in items) + (' |' * (5 - len(items)) if len(items) < 5 else '')))
    open(os.path.join(ROOT, 'docs', 'HERO_PALETTE.md'), 'w', encoding='utf8').write('\n'.join(md) + '\n'); print(len(flat), 'colours')

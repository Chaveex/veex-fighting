"""Tiny software renderer that turns simple 3D primitives into PIXEL ART (the Dead Cells trick, in numpy).
  - primitives: spheres and oriented ellipsoids (limbs are chains of spheres), orthographic camera looking down -z, y up, +x right
  - per-primitive shaders give a ramp id + level (or a raw RGB for photo textures)
  - shading is quantised into 4 bands (hue-shifted ramps), plus contact shadows, selective outlines and a neon rim layer
Coordinates: x right, y up, z toward the viewer. Pixel (col,row) sits at world (col+.5-ox, oy-row-.5).
"""
import math
import numpy as np

class Scene:
    def __init__(self): self.items = []; self.parts = {}
    def pid(self, part):
        if isinstance(part, int): return part
        return self.parts.setdefault(part, len(self.parts))
    def sphere(self, c, r, shader, part):
        self.items.append(('s', np.asarray(c, float), float(r), shader, self.pid(part)))
    def ell(self, c, axes, radii, shader, part):
        self.items.append(('e', np.asarray(c, float), (np.asarray(axes, float), np.asarray(radii, float)), shader, self.pid(part)))
    def chain(self, p0, p1, r0, r1, shader_t, part, step=0.7):
        """capsule approximated by spheres; shader_t(t) -> shader for that sphere (t in 0..1 along the bone)"""
        p0, p1 = np.asarray(p0, float), np.asarray(p1, float); n = max(2, int(math.ceil(np.linalg.norm(p1 - p0) / step)) + 1)
        for i in range(n):
            t = i / (n - 1); self.sphere(p0 + (p1 - p0) * t, r0 + (r1 - r0) * t, shader_t(t), part)

def flat(rid, lvl=1, spec=False):
    def sh(q, n, pos):
        N = n.shape[1]; return np.full(N, rid, np.int16), np.full(N, lvl, np.int8), None
    return sh

_LIGHT = np.array([0.30, 0.72, 0.62]); _LIGHT /= np.linalg.norm(_LIGHT)

BAYER4 = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0 - 0.5

def render(scene, ramps, W=96, H=96, ox=48, oy=88, outline_col=(36, 18, 48), rim=(122, 234, 255), rim2=(255, 70, 200),
           style=None):
    """style keys: bands (3|4|6), smooth (dithered gradient), outline_w (1|2), colored_outline, rim_k, light, cast_shadow"""
    st = dict(bands=4, smooth=False, outline_w=1, colored_outline=False, rim_k=0.5, light=(0.30, 0.72, 0.62), cast_shadow=True)
    if style: st.update(style)
    L = np.array(st['light'], float); L /= np.linalg.norm(L)
    """ramps: list of 5-colour ramps (RGB tuples, light->dark). returns (body RGBA uint8 HxWx4, rim RGBA, info dict)"""
    cols = np.arange(W) + 0.5 - ox; rows = oy - (np.arange(H) + 0.5)
    XX, YY = np.meshgrid(cols, rows)
    zbuf = np.full((H, W), -1e9); part = np.full((H, W), -1, np.int32); rid = np.zeros((H, W), np.int16); lvl = np.zeros((H, W), np.int8)
    rgb = np.zeros((H, W, 3)); has_rgb = np.zeros((H, W), bool); N3 = np.zeros((3, H, W))
    for kind, c, geom, shader, pid in scene.items:
        rad = geom if kind == 's' else float(np.max(geom[1]))
        x0 = max(0, int(math.floor(ox + c[0] - rad - 1))); x1 = min(W, int(math.ceil(ox + c[0] + rad + 2)))
        y0 = max(0, int(math.floor(oy - c[1] - rad - 1))); y1 = min(H, int(math.ceil(oy - c[1] + rad + 2)))
        if x0 >= x1 or y0 >= y1: continue
        X, Y = XX[y0:y1, x0:x1], YY[y0:y1, x0:x1]
        if kind == 's':
            dx, dy = X - c[0], Y - c[1]; d2 = dx * dx + dy * dy; ok = d2 <= geom * geom
            if not ok.any(): continue
            dz = np.sqrt(np.maximum(geom * geom - d2, 0)); Z = c[2] + dz
            nrm = np.stack([dx, dy, dz]) / geom; q = nrm
        else:
            axes, radii = geom
            al = [((X - c[0]) * axes[i][0] + (Y - c[1]) * axes[i][1] - c[2] * axes[i][2] + 0 * X) / radii[i] for i in range(3)]
            be = [axes[i][2] / radii[i] for i in range(3)]
            A = sum(b * b for b in be); B = 2 * sum(a * b for a, b in zip(al, be)); C = sum(a * a for a in al) - 1
            disc = B * B - 4 * A * C; ok = disc >= 0
            if not ok.any(): continue
            Z = (-B + np.sqrt(np.maximum(disc, 0))) / (2 * A)
            qq = [al[i] + be[i] * Z for i in range(3)]                       # local unit-sphere coords
            nrm = np.stack([sum((qq[i] / radii[i]) * axes[i][k] for i in range(3)) for k in range(3)]); nrm /= (np.linalg.norm(nrm, axis=0) + 1e-9)
            q = np.stack(qq)
        zs = zbuf[y0:y1, x0:x1]; m = ok & (Z > zs)
        if not m.any(): continue
        pos = np.stack([X[m], Y[m], Z[m]]); res = shader(q[:, m], nrm[:, m], pos)
        r_, l_, c_ = res[0], res[1], res[2]; nn = res[3] if len(res) > 3 else nrm[:, m]
        keep = l_ >= 0                                                        # shaders can discard pixels (lvl < 0)
        if not keep.all():
            idx_m = np.flatnonzero(m.ravel()); mm = np.zeros(m.size, bool); mm[idx_m[keep]] = True; m = mm.reshape(m.shape)
            r_, l_, nn = r_[keep], l_[keep], nn[:, keep]; c_ = None if c_ is None else c_[keep]
            if not m.any(): continue
        zs[m] = Z[m]; part[y0:y1, x0:x1][m] = pid; rid[y0:y1, x0:x1][m] = r_; lvl[y0:y1, x0:x1][m] = l_
        for k in range(3): N3[k, y0:y1, x0:x1][m] = nn[k]
        hr = has_rgb[y0:y1, x0:x1]; rg = rgb[y0:y1, x0:x1]
        if c_ is None: hr[m] = False
        else: hr[m] = True; rg[m] = c_
    valid = zbuf > -1e8
    I = np.clip(N3[0] * L[0] + N3[1] * L[1] + N3[2] * L[2], 0, 1)
    yy_, xx_ = np.mgrid[0:H, 0:W]; bay = BAYER4[yy_ % 4, xx_ % 4]
    if st['smooth']:                                                         # continuous shading, ordered-dithered between ramp entries
        shf = np.clip((0.80 - I) * 3.6, -0.9, 2.7)
    elif st['bands'] == 3: shf = np.where(I > 0.55, 0.0, np.where(I > 0.25, 1.0, 2.0))
    elif st['bands'] == 6: shf = np.where(I > 0.85, -1.0, np.where(I > 0.68, -0.5, np.where(I > 0.50, 0.0, np.where(I > 0.34, 0.5, np.where(I > 0.18, 1.0, 2.0)))))
    else: shf = np.where(I > 0.72, -1.0, np.where(I > 0.46, 0.0, np.where(I > 0.22, 1.0, 2.0)))
    shift = shf
    # contact shadow: a closer, different part up-left of a pixel casts onto it
    def sh(a, dy, dx, fill):
        out = np.full_like(a, fill)
        ys = slice(max(dy, 0), H + min(dy, 0)); yd = slice(max(-dy, 0), H + min(-dy, 0)); xs = slice(max(dx, 0), W + min(dx, 0)); xd = slice(max(-dx, 0), W + min(-dx, 0))
        out[ys, xs] = a[yd, xd]; return out
    z_ul, p_ul = sh(zbuf, 1, -1, -1e9), sh(part, 1, -1, -1)            # caster is up-right of the pixel (key light from the front-right)
    shadow = valid & (p_ul != part) & (z_ul > zbuf + 2.5) & st['cast_shadow']
    shift = shift + shadow.astype(float)
    # selective outline: edge pixels of the nearer part, next to a farther different part
    edge = np.zeros((H, W), bool)
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        zn, pn = sh(zbuf, dy, dx, -1e9), sh(part, dy, dx, -1)
        edge |= valid & (pn != part) & (zn > -1e8) & (zn < zbuf - 2.0)
    ramp_arr = np.array(ramps, float)                                        # (R,5,3)
    idxf = np.clip(lvl.astype(float) + shift, 0, 4); fl = np.floor(idxf); fr = idxf - fl
    if st['smooth']: idx = np.where(fr + bay > 0.5, fl + 1, fl)
    else: idx = np.where(fr > 0.5, fl + 1, fl) if st['bands'] == 6 else np.round(idxf)
    idx = np.clip(idx, 0, 4).astype(np.int16); idx = np.where(edge, 4, idx)
    col = ramp_arr[rid, idx]                                                  # (H,W,3)
    if st['colored_outline']:                                                 # inner lines use a darkened version of the part colour, not the deep ramp entry
        col = np.where(edge[..., None], ramp_arr[rid, 3] * 0.72, col)
    # photo-textured pixels: multiplicative shading with shadows drifting to purple
    f = np.where(edge, 0.45, 1.22 - 0.16 * np.clip(shift + 1.0, 0, 3.0))
    tint = np.array([70.0, 40.0, 110.0]); mix = np.clip((1 - f) * 0.22, 0, 0.3)[..., None]
    rgb_shaded = np.clip(rgb * f[..., None] * (1 - mix) + tint * mix, 0, 255)
    col = np.where(has_rgb[..., None], rgb_shaded, col)
    body = np.zeros((H, W, 4), np.uint8); body[..., :3] = np.clip(col, 0, 255).astype(np.uint8); body[..., 3] = np.where(valid, 255, 0)
    # neon rim light on its own layer: cyan on the back edge, magenta on the lower front
    rimimg = np.zeros((H, W, 4), np.uint8)
    back = valid & (N3[0] < -0.62) & (N3[2] < 0.50) & ~edge
    low = valid & ~back & (N3[0] > 0.55) & (N3[1] < -0.45) & (N3[2] < 0.6) & ~edge
    for m, colr, k in ((back, rim, st['rim_k']), (low, rim2, st['rim_k'] * 0.5)):
        mix = body[..., :3].astype(float) * (1 - k) + np.array(colr, float) * k
        rimimg[..., :3][m] = mix[m].astype(np.uint8); rimimg[..., 3][m] = 255
    # silhouette outline (outside the body)
    a = valid.copy(); ring = np.zeros_like(a)
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)): ring |= sh(a, dy, dx, False)
    ring &= ~a
    if st['outline_w'] >= 2:
        ring2 = np.zeros_like(a); grown = a | ring
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)): ring2 |= sh(grown, dy, dx, False)
        ring |= (ring2 & ~grown)
    body[..., :3][ring] = np.array(outline_col, np.uint8); body[..., 3][ring] = 255
    return body, rimimg, {'valid': valid, 'part': part}

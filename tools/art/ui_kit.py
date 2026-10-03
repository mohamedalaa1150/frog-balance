"""Build the generated UI kit: glossy buttons (+ white glyphs), stars, panels, covers."""
import io, re, sys, colorsys
import numpy as np, cairosvg
from PIL import Image, ImageFilter
from scipy import ndimage
sys.path.insert(0, '.')
OUT = 'out'  # run from tools/art/source/ui, then copy out/*.webp to public/assets/img
src = open('../../gen.py').read()
G = eval(re.search(r"^G = (\{.*?^\})", src, re.S | re.M).group(1))
BTN = eval(re.search(r"^BTN = (dict\(.*?\))", src, re.M).group(1))

def pieces(path, thr=26, minarea=4000):
    im = Image.open(path).convert('RGB'); a = np.asarray(im).astype(np.float32)
    bg = np.median(np.concatenate([a[:6].reshape(-1,3), a[-6:].reshape(-1,3)]), axis=0)
    d = np.sqrt(((a - bg) ** 2).sum(-1))
    sat = a.max(-1) - a.min(-1)
    greyish = (sat < 20) & (a.mean(-1) > 140)
    # Grey drop shadows reachable from the white page are background, not object.
    lab0, _ = ndimage.label(greyish | (d < thr))
    edge_ids = np.unique(np.concatenate([lab0[0], lab0[-1], lab0[:, 0], lab0[:, -1]]))
    outside = np.isin(lab0, edge_ids[edge_ids > 0])
    solid = ndimage.binary_fill_holes(ndimage.binary_opening(~outside, iterations=2))
    lab, _ = ndimage.label(solid)
    res = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        m = lab == i
        if m.sum() < minarea: continue
        core = ndimage.binary_erosion(m, iterations=2)
        alpha = np.clip((d - 6) / 34, 0, 1)
        alpha[core] = 1
        near = ndimage.binary_dilation(m, iterations=14)
        alpha[~near] = 0
        al = alpha[..., None]
        f = np.where(al > 0.02, (a - (1 - al) * bg) / np.maximum(al, 0.02), 0)
        # Outside the solid silhouette: a true dark drop shadow, not a grey halo.
        shadow = near & ~ndimage.binary_dilation(m, iterations=1)
        darkness = np.clip((bg.mean() - a.mean(-1)) / 120, 0, 0.45)
        alpha[shadow] = darkness[shadow]
        f[shadow] = (30, 40, 50)
        rgba = np.dstack([np.clip(f, 0, 255), alpha * 255]).astype(np.uint8)
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        p = 14
        crop = Image.fromarray(rgba, 'RGBA').crop((x0 - p, y0 - p, x1 + p, y1 + p))
        res.append(dict(img=crop, box=(x0, y0, x1, y1), pad=p))
    return res

def order(ps):  # rows top->bottom then left->right
    return sorted(ps, key=lambda q: (round(q['box'][1] / 200), q['box'][0]))

def hue_shift(img, dh):
    a = np.asarray(img).astype(np.float32) / 255
    rgb = a[..., :3]; out = np.empty_like(rgb)
    import matplotlib.colors as mc
    hsv = mc.rgb_to_hsv(rgb); hsv[..., 0] = (hsv[..., 0] + dh) % 1; out = mc.hsv_to_rgb(hsv)
    return Image.fromarray(np.dstack([out, a[..., 3:]]).__mul__(255).astype(np.uint8), 'RGBA')

def glyph_png(svg_inner, size, face_hex):
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="-50 -50 100 100">'
           f'<g color="{face_hex}">{svg_inner}</g></svg>')
    return Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode()))).convert('RGBA')

def compose_button(base, glyph, out_size):
    w, h = base.size; p = 14; bw = w - 2 * p
    side = max(w, h)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    ox, oy = (side - w) // 2, (side - h) // 2
    canvas.alpha_composite(base, (ox, oy))
    face_r = bw * 0.455; cx = ox + w / 2; cy = oy + p + bw * 0.475
    px = canvas.getpixel((int(cx), int(cy + face_r * 0.3)))
    face_hex = '#%02x%02x%02x' % px[:3]
    if glyph:
        gs = int(face_r * 2)
        g = glyph_png(glyph, gs, face_hex)
        # darker under-glyph for depth / contrast on light faces
        dark = tuple(int(c * 0.55) for c in px[:3])
        sh = Image.new('RGBA', g.size, dark + (0,)); sh.putalpha(g.getchannel('A').point(lambda v: int(v * 0.55)))
        sh = sh.filter(ImageFilter.GaussianBlur(gs * 0.012))
        gx, gy = int(cx - gs / 2), int(cy - gs / 2)
        canvas.alpha_composite(sh, (gx, gy + int(gs * 0.035)))
        canvas.alpha_composite(g, (gx, gy))
    return canvas.resize((out_size, out_size), Image.LANCZOS)

def webp(img, name, q=90):
    img.save(f'{OUT}/{name}.webp', 'WEBP', quality=q, method=6)

# ---- buttons ----
bases = order(pieces('buttons.jpg'))
names = ['coral', 'gold', 'green', 'teal', 'purple', 'navy']
B = {n: b['img'] for n, b in zip(names, bases)}
B['orange'] = hue_shift(B['gold'], -0.06)
for k, glyph in G.items():
    webp(compose_button(B[BTN[k]], glyph, 336), f'btn_{k}')
arrow = '<path d="M0,-26 V18 M-21,0 L0,22 L21,0" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>'
eq = '<path d="M-23,-11 H23 M-23,11 H23" stroke="#fff" stroke-width="10" stroke-linecap="round"/>'
webp(compose_button(B['orange'], arrow, 360), 'predict_left')
webp(compose_button(B['orange'], arrow, 360), 'predict_right')
webp(compose_button(B['teal'], eq, 360), 'predict_equal')
webp(compose_button(B['green'], None, 256), 'btn_blank_green')

# ---- stars ----
st = order(pieces('stars.jpg'))
for name, s in zip(['star_full', 'star_empty'], st):
    im = s['img']; side = max(im.size)
    c = Image.new('RGBA', (side, side), (0, 0, 0, 0)); c.alpha_composite(im, ((side - im.width) // 2, (side - im.height) // 2))
    webp(c.resize((288, 288), Image.LANCZOS), name)

# ---- panels ----
pa = order(pieces('panels.jpg'))
for name, s in zip(['panel_banner', 'panel_board', 'panel_bubble'], pa):
    webp(s['img'], name, 88); print(name, s['img'].size)

# ---- covers ----
Image.open('cover_land.jpg').convert('RGB').save(f'{OUT}/cover_land.webp', 'WEBP', quality=84, method=6)
Image.open('cover_port.jpg').convert('RGB').save(f'{OUT}/cover_port.webp', 'WEBP', quality=84, method=6)

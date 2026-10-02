import numpy as np
from PIL import Image, ImageFilter, ImageOps
from scipy import ndimage
import json, os
SRC='ai'; OUT='ai_out'; os.makedirs(OUT, exist_ok=True)
def cutout(path):
    im = Image.open(path).convert('RGB'); a = np.asarray(im).astype(np.int16)
    bg = np.median(np.concatenate([a[:8].reshape(-1,3), a[-8:].reshape(-1,3), a[:, :8].reshape(-1,3), a[:, -8:].reshape(-1,3)]), axis=0)
    d = np.sqrt(((a - bg) ** 2).sum(-1))
    near = d < 22
    lab, n = ndimage.label(near)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bgmask = np.isin(lab, list(border))
    # soft edge: alpha ramps over distance 22..60 only on pixels adjacent to background
    alpha = np.where(bgmask, 0, 255).astype(np.float32)
    edge = ndimage.binary_dilation(bgmask, iterations=2) & ~bgmask
    ramp = np.clip((d - 22) / 38, 0, 1) * 255
    alpha[edge] = np.minimum(alpha[edge], ramp[edge])
    rgba = np.dstack([a.astype(np.uint8), alpha.astype(np.uint8)])
    out = Image.fromarray(rgba, 'RGBA')
    bbox = out.getchannel('A').point(lambda v: 255 if v > 10 else 0).getbbox()
    return out.crop(bbox)
meta = {}
targets = {'mascot': (880, 920), 'frog_token': (128, 140)}
for name in ['mascot_idle', 'mascot_look_left', 'mascot_strain_left', 'mascot_happy', 'mascot_clap', 'frog_token']:
    c = cutout(f'{SRC}/{name}.jpg')
    W, H = targets['frog_token' if name == 'frog_token' else 'mascot']
    pad = 0.04
    s = min(W * (1 - 2 * pad) / c.width, H * (1 - pad) / c.height)
    c2 = c.resize((round(c.width * s), round(c.height * s)), Image.LANCZOS)
    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    x = (W - c2.width) // 2; y = H - c2.height - round(H * 0.01)
    canvas.alpha_composite(c2, (x, y))
    canvas.save(f'{OUT}/{name}.png', optimize=True)
    # hand anchor: topmost opaque rows -> find two fists, take mean of their top y and centre x
    A = np.asarray(canvas.getchannel('A')) > 128
    rows = np.where(A.any(1))[0]; top = rows[0]
    band = A[top: top + int(H * 0.06)]
    cols = np.where(band.any(0))[0]
    meta[name] = dict(size=[W, H], topY=int(top), handSpanX=[int(cols.min()), int(cols.max())])
    if name in ('mascot_look_left', 'mascot_strain_left'):
        ImageOps.mirror(canvas).save(f"{OUT}/{name.replace('left', 'right')}.png", optimize=True)
for n in range(1, 7):
    im = Image.open(f'{SRC}/bg_world_{n}.jpg').convert('RGB')
    im.save(f'{OUT}/bg_world_{n}.webp', quality=86, method=6)
    # portrait: centre crop 9:16 then upscale to 720x1280 @1x-ish (1080x1920 too big for source)
    h = im.height; w = round(h * 9 / 16); x0 = (im.width - w) // 2
    im.crop((x0, 0, x0 + w, h)).resize((810, 1440), Image.LANCZOS).save(f'{OUT}/bg_world_{n}_p.webp', quality=86, method=6)
json.dump(meta, open(f'{OUT}/mascot_meta.json', 'w'), indent=1)
print(json.dumps(meta))

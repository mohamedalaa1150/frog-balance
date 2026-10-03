import numpy as np
from PIL import Image
from scipy import ndimage
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


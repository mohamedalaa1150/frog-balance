import sys, time, numpy as np, ncnn
from PIL import Image
def upscale(src, dst, model='realesr-animevideov3-x2', scale=2, tile=200, pad=12):
    net = ncnn.Net(); net.opt.use_vulkan_compute = False; net.opt.num_threads = 2
    net.load_param(f'rg/models/{model}.param'); net.load_model(f'rg/models/{model}.bin')
    im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32) / 255
    H, W, _ = im.shape
    out = np.zeros((H * scale, W * scale, 3), np.float32)
    for y in range(0, H, tile):
        for x in range(0, W, tile):
            y0, x0 = max(0, y - pad), max(0, x - pad)
            y1, x1 = min(H, y + tile + pad), min(W, x + tile + pad)
            patch = np.ascontiguousarray(im[y0:y1, x0:x1].transpose(2, 0, 1))
            ex = net.create_extractor()
            ex.input('data', ncnn.Mat(patch))
            _, o = ex.extract('output')
            o = np.array(o).transpose(1, 2, 0)
            oy, ox = (y - y0) * scale, (x - x0) * scale
            h, w = min(tile, H - y) * scale, min(tile, W - x) * scale
            out[y * scale:y * scale + h, x * scale:x * scale + w] = o[oy:oy + h, ox:ox + w]
    Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save(dst)
if __name__ == '__main__':
    t = time.time(); upscale(sys.argv[1], sys.argv[2], *(sys.argv[3:4] or [])); print('sec', round(time.time() - t, 1))

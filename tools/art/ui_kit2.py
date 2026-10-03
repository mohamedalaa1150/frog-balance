from PIL import Image
from ui_kit_lib import pieces, order
OUT='out'; import os; os.makedirs(OUT, exist_ok=True)
def square(img, size):
    side = max(img.size)
    c = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    c.alpha_composite(img, ((side - img.width) // 2, (side - img.height) // 2))
    return c.resize((size, size), Image.LANCZOS)
sheets = {
  'btn1_x2.png': ['btn_home', 'btn_sound_on', 'btn_sound_off', 'btn_hint', 'btn_replay', 'btn_play'],
  'btn2_x2.png': ['btn_next', 'btn_back', 'btn_settings', 'btn_lock', 'btn_sandbox', 'btn_dashboard'],
  'btn3_x2.png': ['btn_read', 'btn_download', 'btn_practice', 'predict_left', 'predict_equal', 'btn_check'],
}
for sheet, names in sheets.items():
    ps = order(pieces(sheet, minarea=40000))
    ps = sorted(ps, key=lambda q: (round(q['box'][1] / 600), q['box'][0]))
    print(sheet, len(ps), [p['box'] for p in ps])
    for name, p in zip(names, ps):
        size = 360 if name.startswith('predict') else 336
        img = square(p['img'], size)
        img.save(f'{OUT}/{name}.webp', 'WEBP', quality=92, method=6)
        if name == 'predict_left':
            img.save(f'{OUT}/predict_right.webp', 'WEBP', quality=92, method=6)
pads = sorted(pieces('pads_x2.png', minarea=40000), key=lambda q: q['box'][0])
print('pads', [p['box'] for p in pads])
for name, p in zip(['lily_level', 'lily_level_current', 'lily_level_locked'], pads):
    im = p['img']; im.thumbnail((360, 360), Image.LANCZOS)
    im.save(f'{OUT}/{name}.webp', 'WEBP', quality=92, method=6); print(name, im.size)

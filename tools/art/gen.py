"""Mizan Dofdou — style-B vector asset generator (SVG). Run: python3 gen.py  -> out/*.svg"""
import os, math
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'assets', 'svg'); os.makedirs(OUT, exist_ok=True)
P = dict(sky='#FEF1CF', sky2='#FFF8E6', sun='#FCD348', sunE='#F2B92E', water='#77C5D3', waterD='#4FA6B8', waterL='#A6DCE4',
         leaf='#679A21', leafL='#8CC24A', leafD='#4C7518', frog='#A0C838', frogL='#B9D95A', frogO='#4E7F1C', belly='#F4E58A',
         bellyO='#D9C25E', cheek='#F79B7D', scarf='#DD3E2E', scarfO='#A92A1F', coral='#E36F51', coralD='#B84E35', gold='#FDC625',
         goldD='#D99A1E', pan='#FFD447', navy='#2E4A7D', navyD='#1E3358', cream='#FDF0C8', white='#FFFFFF', pink='#F6A6B8', pinkD='#E07A93',
         orange='#F2994A', orangeD='#C8742C', green='#6DAE3A', greenD='#4C8A22', blue='#4C87C4', blueD='#33669C', purple='#7D619F', purpleD='#5C4579', teal='#3FA3A0', tealD='#2B7A78')
def svg(w, h, body, defs=''):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><defs>{defs}</defs>{body}</svg>'
def save(name, s):
    open(os.path.join(OUT, name + '.svg'), 'w').write(s)
SHADOW = '<filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#000" flood-opacity="0.18"/></filter>'

# ---------------- mascot ----------------
def eye(cx, cy, mode, look):
    o = f'<circle cx="{cx}" cy="{cy}" r="50" fill="{P["frog"]}" stroke="{P["frogO"]}" stroke-width="8"/>'
    if mode == 'closed':
        return o + f'<path d="M{cx-24},{cy+4} Q{cx},{cy-22} {cx+24},{cy+4}" fill="none" stroke="{P["navy"]}" stroke-width="9" stroke-linecap="round"/>'
    o += f'<circle cx="{cx}" cy="{cy}" r="36" fill="{P["white"]}" stroke="{P["frogO"]}" stroke-width="4"/>'
    dx = {'left': -13, 'right': 13}.get(look, 0)
    o += f'<circle cx="{cx+dx}" cy="{cy+3}" r="18" fill="{P["navy"]}"/><circle cx="{cx+dx+6}" cy="{cy-4}" r="6.5" fill="#fff"/>'
    if mode == 'squint':  # heavy lid
        o += f'<path d="M{cx-38},{cy-2} Q{cx},{cy-30} {cx+38},{cy-2} L{cx+38},{cy-40} L{cx-38},{cy-40} Z" fill="{P["frog"]}"/>' \
             f'<path d="M{cx-36},{cy-4} Q{cx},{cy-26} {cx+36},{cy-4}" fill="none" stroke="{P["frogO"]}" stroke-width="6" stroke-linecap="round"/>'
    return o
def arm(x1, y1, cx, cy, x2, y2):
    d = f'M{x1},{y1} Q{cx},{cy} {x2},{y2}'
    return (f'<path d="{d}" fill="none" stroke="{P["frogO"]}" stroke-width="44" stroke-linecap="round"/>'
            f'<path d="{d}" fill="none" stroke="{P["frog"]}" stroke-width="30" stroke-linecap="round"/>'
            f'<circle cx="{x2}" cy="{y2}" r="24" fill="{P["frog"]}" stroke="{P["frogO"]}" stroke-width="7"/>')
def mascot(expr='idle'):
    W, H = 440, 460
    look = {'look_left': 'left', 'strain_left': 'left', 'look_right': 'right', 'strain_right': 'right'}.get(expr, 'center')
    eyemode = 'closed' if expr == 'happy' else ('squint' if expr.startswith('strain') else 'open')
    lean = {'strain_left': -5, 'strain_right': 5}.get(expr, 0)
    b = []
    # feet
    for fx in (125, 275):
        b.append(f'<ellipse cx="{fx}" cy="392" rx="58" ry="24" fill="{P["frog"]}" stroke="{P["frogO"]}" stroke-width="8"/>')
        for t in (-30, 0, 30):
            b.append(f'<circle cx="{fx+t}" cy="406" r="9" fill="{P["frogL"]}"/>')
    g = []
    # arms (raised, holding pivot above head) or clapping
    # body
    g.append(f'<ellipse cx="200" cy="300" rx="128" ry="98" fill="{P["frog"]}" stroke="{P["frogO"]}" stroke-width="8"/>')
    g.append(f'<ellipse cx="200" cy="318" rx="80" ry="66" fill="{P["belly"]}" stroke="{P["bellyO"]}" stroke-width="5"/>')
    if expr != 'clap':
        pass
    # head
    g.append(f'<ellipse cx="200" cy="190" rx="140" ry="92" fill="{P["frog"]}" stroke="{P["frogO"]}" stroke-width="8"/>')
    g.append(f'<ellipse cx="160" cy="140" rx="60" ry="16" fill="{P["frogL"]}" opacity=".55"/>')
    if expr == 'clap':
        g += [arm(100, 285, 120, 360, 186, 316), arm(300, 285, 280, 360, 214, 316)]
    if expr != 'clap':
        g += [arm(96, 270, 0, 160, 50, 16), arm(304, 270, 400, 160, 350, 16)]
    g.append(eye(138, 128, eyemode, look) + eye(262, 128, eyemode, look))
    g.append(f'<ellipse cx="200" cy="112" rx="15" ry="10" fill="{P["gold"]}" stroke="{P["goldD"]}" stroke-width="3"/>')
    for cx in (110, 290):
        g.append(f'<ellipse cx="{cx}" cy="210" rx="24" ry="14" fill="{P["cheek"]}" opacity=".9"/>')
    # mouth
    if expr == 'happy':
        g.append(f'<path d="M150,205 Q200,265 250,205 Z" fill="{P["coralD"]}" stroke="{P["frogO"]}" stroke-width="7" stroke-linejoin="round"/>'
                 f'<path d="M175,238 Q200,252 225,238 Q200,226 175,238Z" fill="{P["pink"]}"/>')
    elif expr.startswith('strain'):
        g.append(f'<path d="M160,222 q10,-10 20,0 t20,0 t20,0 t20,0" fill="none" stroke="{P["frogO"]}" stroke-width="7" stroke-linecap="round"/>')
        sx = 70 if expr == 'strain_right' else 330
        g.append(f'<path d="M{sx},80 q-12,22 0,30 q12,-8 0,-30z" fill="{P["waterL"]}" stroke="{P["waterD"]}" stroke-width="3"/>')
    else:
        g.append(f'<path d="M160,210 Q200,240 240,210" fill="none" stroke="{P["frogO"]}" stroke-width="7" stroke-linecap="round"/>')
    # scarf
    g.append(f'<path d="M140,262 Q200,282 260,262 L232,290 Q200,300 168,290 Z" fill="{P["scarf"]}" stroke="{P["scarfO"]}" stroke-width="5" stroke-linejoin="round"/>'
             f'<path d="M196,286 L178,330 L204,318 L224,334 L210,286Z" fill="{P["scarf"]}" stroke="{P["scarfO"]}" stroke-width="5" stroke-linejoin="round"/>'
             f'<circle cx="203" cy="288" r="11" fill="{P["scarf"]}" stroke="{P["scarfO"]}" stroke-width="5"/>')
    body = '<g transform="translate(20,34)">' + ''.join(b) + f'<g transform="rotate({lean} 200 390)">' + ''.join(g) + '</g></g>'
    return svg(W, H, f'<g filter="url(#sh)">{body}</g>', SHADOW)
for e in ['idle', 'look_left', 'look_right', 'strain_left', 'strain_right', 'happy', 'clap']:
    save(f'mascot_{e}', mascot(e))

# ---------------- beam & pans ----------------
save('beam', svg(840, 70,
    f'<g filter="url(#sh)"><rect x="18" y="20" width="804" height="30" rx="15" fill="{P["navy"]}" stroke="{P["navyD"]}" stroke-width="6"/>'
    f'<rect x="40" y="26" width="760" height="7" rx="3.5" fill="#fff" opacity=".18"/>'
    + ''.join(f'<circle cx="{x}" cy="35" r="17" fill="none" stroke="{P["goldD"]}" stroke-width="11"/><circle cx="{x}" cy="35" r="17" fill="none" stroke="{P["gold"]}" stroke-width="6"/>' for x in (24, 816))
    + f'<circle cx="420" cy="35" r="26" fill="{P["gold"]}" stroke="{P["goldD"]}" stroke-width="6"/><circle cx="412" cy="27" r="7" fill="#fff" opacity=".6"/></g>', SHADOW))
# hanging pan: ring at top (130,14), dish rim at y=170
def pan():
    w, h = 260, 220
    s = []
    for x in (22, 130, 238):
        s.append(f'<line x1="130" y1="16" x2="{x}" y2="172" stroke="{P["navy"]}" stroke-width="4" stroke-linecap="round"/>')
    s.append(f'<circle cx="130" cy="14" r="10" fill="none" stroke="{P["goldD"]}" stroke-width="7"/><circle cx="130" cy="14" r="10" fill="none" stroke="{P["gold"]}" stroke-width="3.5"/>')
    s.append(f'<path d="M10,172 Q130,236 250,172 Z" fill="{P["pan"]}" stroke="{P["goldD"]}" stroke-width="6" stroke-linejoin="round"/>')
    s.append(f'<ellipse cx="130" cy="172" rx="122" ry="15" fill="{P["gold"]}" stroke="{P["goldD"]}" stroke-width="6"/>')
    s.append(f'<ellipse cx="96" cy="190" rx="40" ry="6" fill="#fff" opacity=".45"/>')
    return svg(w, h, f'<g filter="url(#sh)">{"".join(s)}</g>', SHADOW)
save('pan', pan())
save('pan_glow', svg(320, 120, f'<ellipse cx="160" cy="70" rx="150" ry="40" fill="{P["sun"]}" opacity=".55"/>'))

# ---------------- tokens ----------------
def token(scale=1.0, ox=0, oy=0, ghost=False):
    st = 'stroke-dasharray="7 6"' if ghost else ''
    op = '.45' if ghost else '1'
    t = (f'<g transform="translate({ox},{oy}) scale({scale})" opacity="{op}">'
         f'<ellipse cx="32" cy="58" rx="26" ry="8" fill="{P["frog"]}" stroke="{P["frogO"]}" stroke-width="3" {st}/>'
         f'<ellipse cx="32" cy="40" rx="26" ry="20" fill="{P["frog"]}" stroke="{P["frogO"]}" stroke-width="3.5" {st}/>'
         f'<ellipse cx="32" cy="47" rx="14" ry="10" fill="{P["belly"]}"/>'
         + ''.join(f'<circle cx="{x}" cy="20" r="11" fill="{P["frog"]}" stroke="{P["frogO"]}" stroke-width="3.5" {st}/><circle cx="{x}" cy="20" r="7.5" fill="#fff"/><circle cx="{x+1}" cy="21" r="3.8" fill="{P["navy"]}"/>' for x in (21, 43))
         + f'<path d="M24,33 Q32,39 40,33" fill="none" stroke="{P["frogO"]}" stroke-width="3" stroke-linecap="round"/>'
         f'<ellipse cx="14" cy="33" rx="4.5" ry="3" fill="{P["cheek"]}"/><ellipse cx="50" cy="33" rx="4.5" ry="3" fill="{P["cheek"]}"/></g>')
    return t
save('frog_token', svg(64, 70, f'<g filter="url(#sh)">{token()}</g>', SHADOW))
save('frog_token_ghost', svg(64, 70, token(ghost=True)))
pile = ''.join(token(1, x, y) for x, y in [(4,70),(60,70),(116,70),(172,70),(32,36),(88,36),(144,36),(60,2),(116,2)])
save('frog_pile', svg(240, 142, f'<g filter="url(#sh)">{pile}</g>', SHADOW))

# ---------------- number tiles (blank; digit drawn by code) ----------------
TILE = [('coral','coralD'),('orange','orangeD'),('green','greenD'),('blue','blueD'),('purple','purpleD')]
for n in range(1, 11):
    c, d = TILE[(n-1) % 5]
    save(f'num_tile_{n}', svg(120, 150,
        f'<g filter="url(#sh)"><rect x="8" y="8" width="104" height="128" rx="22" fill="{P[d]}"/>'
        f'<rect x="8" y="4" width="104" height="126" rx="22" fill="{P["cream"]}" stroke="{P[c]}" stroke-width="9"/>'
        f'<rect x="22" y="14" width="76" height="10" rx="5" fill="#fff" opacity=".7"/></g>', SHADOW))
open(os.path.join(OUT, 'tile_colors.json'), 'w').write('{' + ','.join(f'"{n}":"{P[TILE[(n-1)%5][0]]}"' for n in range(1, 11)) + '}')

# ---------------- tray (lily pad) ----------------
save('tray_bg', svg(1280, 180,
    f'<g filter="url(#sh)"><path d="M70,40 Q640,-6 1210,40 Q1272,90 1210,140 Q640,186 70,140 Q8,90 70,40Z" fill="{P["leaf"]}" stroke="{P["leafD"]}" stroke-width="8"/>'
    f'<path d="M80,52 Q640,14 1200,52 Q1252,90 1200,128 Q640,166 80,128 Q28,90 80,52Z" fill="{P["leafL"]}" opacity=".55"/>'
    + ''.join(f'<path d="M640,90 L{x},{y}" stroke="{P["leaf"]}" stroke-width="5" opacity=".55" stroke-linecap="round"/>' for x, y in [(120,60),(300,40),(480,30),(800,30),(980,40),(1160,60),(120,120),(300,140),(480,150),(800,150),(980,140),(1160,120)])
    + f'<path d="M640,90 L600,28 L680,28 Z" fill="{P["water"]}" opacity=".0"/></g>', SHADOW))

# ---------------- buttons ----------------
G = {
 'home': '<path d="M-28,4 L0,-24 L28,4 M-20,-2 V26 H20 V-2" fill="none" stroke="#fff" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/><rect x="-7" y="10" width="14" height="16" rx="3" fill="#fff"/>',
 'sound_on': '<path d="M-26,-10 H-14 L2,-24 V24 L-14,10 H-26Z" fill="#fff" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><path d="M12,-12 Q22,0 12,12 M20,-22 Q38,0 20,22" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/>',
 'sound_off': '<path d="M-26,-10 H-14 L2,-24 V24 L-14,10 H-26Z" fill="#fff" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><path d="M14,-12 L34,12 M34,-12 L14,12" stroke="#fff" stroke-width="7" stroke-linecap="round"/>',
 'hint': '<path d="M0,-30 C-20,-30 -26,-14 -26,-6 C-26,6 -14,12 -12,22 H12 C14,12 26,6 26,-6 C26,-14 20,-30 0,-30Z" fill="#fff"/><rect x="-11" y="25" width="22" height="7" rx="3.5" fill="#fff"/>',
 'replay': '<path d="M22,-8 A24,24 0 1 0 22,12" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round"/><path d="M10,-26 L28,-10 L6,-2Z" fill="#fff" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>',
 'play': '<path d="M-14,-26 L26,0 L-14,26Z" fill="#fff" stroke="#fff" stroke-width="8" stroke-linejoin="round"/>',
 'next': '<path d="M24,0 H-20 M-4,-18 L-22,0 L-4,18" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>',
 'back': '<path d="M-24,0 H20 M4,-18 L22,0 L4,18" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>',
 'settings': ''.join(f'<rect x="-6" y="-32" width="12" height="16" rx="3" fill="#fff" transform="rotate({a})"/>' for a in range(0, 360, 45)) + '<circle r="20" fill="#fff"/><circle r="8" fill="currentColor"/>',
 'lock': '<rect x="-22" y="-4" width="44" height="32" rx="7" fill="#fff"/><path d="M-13,-4 V-14 A13,13 0 0 1 13,-14 V-4" fill="none" stroke="#fff" stroke-width="8"/>',
 'read': '<path d="M-30,-22 H30 Q34,-22 34,-18 V12 Q34,16 30,16 H-4 L-18,30 V16 H-30 Q-34,16 -34,12 V-18 Q-34,-22 -30,-22Z" fill="#fff"/><path d="M-14,-8 H14 M-14,4 H14" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>',
}
BTN = dict(home='coral', sound_on='coral', sound_off='coral', read='teal', hint='gold', replay='gold', play='green', next='green', back='navy', settings='navy', lock='navy')
for k, glyph in G.items():
    c = BTN[k]; d = {'coral':'coralD','teal':'tealD','gold':'goldD','green':'greenD','navy':'navyD'}[c]
    save(f'btn_{k}', svg(112, 112,
        f'<g filter="url(#sh)"><circle cx="56" cy="58" r="50" fill="{P[d]}"/><circle cx="56" cy="54" r="50" fill="{P[c]}"/>'
        f'<ellipse cx="44" cy="30" rx="26" ry="11" fill="#fff" opacity=".28"/>'
        f'<g transform="translate(56,55)" color="{P[c]}">{glyph}</g></g>', SHADOW))
# predict buttons & symbols
save('predict_equal', svg(160, 160, f'<g filter="url(#sh)"><circle cx="80" cy="84" r="70" fill="{P["tealD"]}"/><circle cx="80" cy="78" r="70" fill="{P["teal"]}"/><path d="M48,64 H112 M48,94 H112" stroke="#fff" stroke-width="14" stroke-linecap="round"/></g>', SHADOW))
for side in ('left', 'right'):
    save(f'predict_{side}', svg(160, 160, f'<g filter="url(#sh)"><circle cx="80" cy="84" r="70" fill="{P["orangeD"]}"/><circle cx="80" cy="78" r="70" fill="{P["orange"]}"/><path d="M80,40 V108 M50,82 L80,112 L110,82" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/></g>', SHADOW))
for k, d in {'gt': 'M38,30 L82,55 L38,80', 'lt': 'M82,30 L38,55 L82,80', 'eq': 'M34,42 H86 M34,70 H86'}.items():
    save(f'symbol_{k}', svg(120, 110, f'<g filter="url(#sh)"><circle cx="60" cy="55" r="50" fill="{P["cream"]}" stroke="{P["navy"]}" stroke-width="6"/><path d="{d}" fill="none" stroke="{P["coral"]}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/></g>', SHADOW))
# stars
def star(cx, cy, r):
    pts = []
    for i in range(10):
        a = -math.pi/2 + i*math.pi/5; rr = r if i % 2 == 0 else r*0.48
        pts.append(f'{cx+rr*math.cos(a):.1f},{cy+rr*math.sin(a):.1f}')
    return ' '.join(pts)
save('star_full', svg(96, 96, f'<g filter="url(#sh)"><polygon points="{star(48,50,42)}" fill="{P["gold"]}" stroke="{P["goldD"]}" stroke-width="6" stroke-linejoin="round"/><polygon points="{star(42,44,14)}" fill="#fff" opacity=".45"/></g>', SHADOW))
save('star_empty', svg(96, 96, f'<polygon points="{star(48,50,42)}" fill="{P["cream"]}" stroke="#C9BFA4" stroke-width="6" stroke-linejoin="round"/>'))
# lock badge & peg
save('lock_badge', svg(40, 40, f'<circle cx="20" cy="20" r="18" fill="{P["navy"]}" stroke="#fff" stroke-width="3"/><rect x="11" y="18" width="18" height="12" rx="3" fill="{P["gold"]}"/><path d="M14,18 V14 A6,6 0 0 1 26,14 V18" fill="none" stroke="{P["gold"]}" stroke-width="3.5"/>'))
save('peg_lock', svg(90, 90, f'<g filter="url(#sh)"><path d="M20,78 L45,12 L70,78 Z" fill="#C98A4B" stroke="#8C5A2B" stroke-width="6" stroke-linejoin="round"/><path d="M45,22 L58,70" stroke="#E2AD72" stroke-width="5" stroke-linecap="round"/></g>', SHADOW))
# lily level button
def lily(fill, stroke, vein):
    return (f'<path d="M75,75 L106,21 A62,62 0 1 1 44,21 Z" fill="{fill}" stroke="{stroke}" stroke-width="7" stroke-linejoin="round"/>'
            + ''.join(f'<path d="M75,75 L{75+55*math.cos(a):.0f},{75+55*math.sin(a):.0f}" stroke="{vein}" stroke-width="4" opacity=".6" stroke-linecap="round"/>' for a in [0.9, 1.9, 2.9, 3.9, 4.9]))
save('lily_level', svg(150, 150, f'<g filter="url(#sh)">{lily(P["leafL"], P["leafD"], P["leaf"])}</g>', SHADOW))
save('lily_level_locked', svg(150, 150, f'{lily("#C7C9BF", "#8E9186", "#A9ABA1")}<rect x="57" y="74" width="36" height="28" rx="6" fill="{P["navy"]}"/><path d="M64,74 V66 A11,11 0 0 1 86,66 V74" fill="none" stroke="{P["navy"]}" stroke-width="7"/>'))
save('hint_hand', svg(110, 110, f'<g filter="url(#sh)"><path d="M40,100 Q22,70 30,52 Q36,44 44,52 L48,58 V18 Q48,8 57,8 Q66,8 66,18 V48 Q76,44 82,50 Q92,48 96,58 Q102,60 102,72 Q102,92 86,104Z" fill="{P["cream"]}" stroke="{P["navy"]}" stroke-width="5" stroke-linejoin="round"/></g>', SHADOW))
save('number_line', svg(1000, 90, f'<rect x="20" y="40" width="960" height="10" rx="5" fill="{P["navy"]}"/>' + ''.join(f'<rect x="{30+i*94}" y="28" width="8" height="34" rx="4" fill="{P["navy"]}"/>' for i in range(11))))

# ---------------- backgrounds ----------------
WORLDS = {1: ('#FFE6DA', '#FDF0E4', '#F7A9A0', '#77C5D3'), 2: ('#FEF1CF', '#FFF8E6', '#FCD348', '#77C5D3'), 3: ('#E6F2D2', '#F5F9E8', '#FCD348', '#6CBFA4'),
          4: ('#D8EEF6', '#F0F8FB', '#FCD348', '#5AB4D6'), 5: ('#E7DDF3', '#F5F0FA', '#C9A8F0', '#7E8FD1'), 6: ('#2C3E6E', '#465C93', '#FFF3B8', '#3B5C8F')}
def cloud(x, y, s, op=.9):
    return f'<g transform="translate({x},{y}) scale({s})" opacity="{op}"><path d="M0,40 Q0,10 34,14 Q46,-12 80,4 Q112,-6 122,24 Q150,24 150,46 Q150,62 128,62 H18 Q0,62 0,40Z" fill="#fff"/></g>'
def lotus(x, y, s):
    return (f'<g transform="translate({x},{y}) scale({s})">' + ''.join(f'<path d="M0,0 Q{dx*0.6},-46 {dx},-58 Q{dx*1.1},-20 0,0Z" fill="{P["pink"]}" stroke="{P["pinkD"]}" stroke-width="3" transform="rotate({r})"/>' for dx, r in [(-10,-40),(10,40),(-8,-15),(8,15),(0,0)]) + '</g>')
def reeds(x, flip=1):
    s = ''
    for i, (dx, h) in enumerate([(0, 230), (26, 280), (52, 200), (-20, 170)]):
        bx = x + dx*flip
        s += f'<path d="M{bx},720 Q{bx+8*flip},{720-h/2} {bx+4*flip},{720-h}" stroke="{P["leafD"]}" stroke-width="7" fill="none" stroke-linecap="round"/>'
        s += f'<rect x="{bx+4*flip-9}" y="{720-h-10}" width="18" height="54" rx="9" fill="#9A5B2E" stroke="#6E3E1C" stroke-width="3"/>'
        s += f'<path d="M{bx},700 Q{bx-40*flip},{640-i*20} {bx-30*flip},{600-i*30}" stroke="{P["leaf"]}" stroke-width="10" fill="none" stroke-linecap="round"/>'
    return s
def background(n, w=1280, h=720):
    top, mid, sun, water = WORLDS[n]
    night = n == 6
    defs = (f'<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{top}"/><stop offset="1" stop-color="{mid}"/></linearGradient>'
            f'<linearGradient id="wat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{water}"/><stop offset="1" stop-color="{P["waterD"] if not night else "#24406B"}"/></linearGradient>')
    wy = int(h*0.56)
    b = [f'<rect width="{w}" height="{h}" fill="url(#sky)"/>']
    sx, sy = int(w*0.9), int(h*0.5)
    if night:
        b.append(''.join(f'<circle cx="{(i*137)%w}" cy="{(i*71)%int(h*0.5)+10}" r="{2+(i%3)}" fill="#FFF3B8" opacity=".85"/>' for i in range(40)))
        b.append(f'<circle cx="{sx}" cy="{sy}" r="52" fill="{sun}"/><circle cx="{sx+22}" cy="{sy-12}" r="46" fill="{top}"/>')
    else:
        b.append(''.join(f'<line x1="{sx}" y1="{sy}" x2="{sx+95*math.cos(a):.0f}" y2="{sy+95*math.sin(a):.0f}" stroke="{sun}" stroke-width="6" stroke-linecap="round" opacity=".7"/>' for a in [i*math.pi/6 for i in range(12)]))
        b.append(f'<circle cx="{sx}" cy="{sy}" r="40" fill="{sun}" stroke="{P["sunE"]}" stroke-width="5"/>')
        b.append(cloud(int(w*0.12), int(h*0.1), 1.0) + cloud(int(w*0.42), int(h*0.05), 0.7, .8) + cloud(int(w*0.58), int(h*0.2), 0.8, .7))
    hill = '#9FCB6B' if not night else '#2E4A5C'
    hill2 = '#B9DA86' if not night else '#3B5A6E'
    b.append(f'<path d="M0,{wy} Q{w*0.2},{wy-90} {w*0.42},{wy-30} Q{w*0.62},{wy-110} {w*0.82},{wy-40} Q{w*0.93},{wy-70} {w},{wy-30} V{wy} Z" fill="{hill2}"/>')
    b.append(f'<path d="M0,{wy} Q{w*0.25},{wy-50} {w*0.5},{wy-12} Q{w*0.75},{wy-60} {w},{wy-16} V{wy} Z" fill="{hill}"/>')
    b.append(f'<rect y="{wy}" width="{w}" height="{h-wy}" fill="url(#wat)"/>')
    b.append(''.join(f'<rect x="{x}" y="{y}" width="{ww}" height="5" rx="2.5" fill="#fff" opacity=".35"/>' for x, y, ww in [(w*0.1, wy+40, 120), (w*0.36, wy+70, 90), (w*0.6, wy+30, 140), (w*0.78, wy+95, 100), (w*0.2, wy+130, 80)]))
    pad = lambda x, y, s: f'<g transform="translate({x},{y}) scale({s},{s*0.45})"><path d="M0,-60 A60,60 0 1 0 40,-44 L0,0Z" fill="{P["leafL"]}" stroke="{P["leafD"]}" stroke-width="6"/></g>'
    b.append(pad(w*0.07, wy+70, 1.1) + pad(w*0.93, wy+90, 1.0) + pad(w*0.16, h-50, 1.4) + pad(w*0.86, h-40, 1.3))
    b.append(lotus(w*0.08, wy+56, 0.9) + lotus(w*0.92, wy+76, 0.8))
    b.append(reeds(30, 1) + reeds(w-30, -1))
    return svg(w, h, ''.join(b), defs)
for n in range(1, 7):
    save(f'bg_world_{n}', background(n))
    save(f'bg_world_{n}_p', background(n, 720, 1280))
save('bg_title', background(2))
print('wrote', len(os.listdir(OUT)), 'files to', OUT)

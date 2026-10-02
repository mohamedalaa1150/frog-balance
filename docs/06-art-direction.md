# Art Direction — approved style "B" (binding from Phase 3 onward)

Reference: `docs/art/style-B-reference.jpg` (approved by the product owner). Every screen must look like it belongs to this image — including the interim procedural art drawn by `src/placeholder/placeholderArt.ts` until final AI-generated sprites replace it (same texture keys, see `05-assets.md`).

## Look & feel
- Bold flat vector, rounded chunky shapes, **coloured outlines 3–4 design px, slightly darker than the fill — never black**, subtle soft inner highlight on top edges, very light paper-grain feel (optional noise overlay at 3–4 % opacity on backgrounds only).
- Warm, sunny, calm. Background quiet and low-contrast in the middle third so the balance reads first (Mayer coherence).
- Every interactive object has a soft drop shadow (black 18 %, offset 0/4 design px, blur 6) so it reads as "pick-up-able".

## Palette (tokens — put them in `src/theme.ts`, never hard-code hex elsewhere)
| Token | Hex | Use |
|---|---|---|
| `sky` | #FEF1CF | background top, cards |
| `sun` | #FCD348 | sun, highlights |
| `water` | #77C5D3 | pond band |
| `water-deep` | #4FA6B8 | pond lower band / ripples |
| `leaf` | #679A21 | lily-pad tray, reeds, outline of green items |
| `frog` | #A0C838 | frog body |
| `frog-outline` | #4E7F1C | frog / token outline |
| `belly` | #F4E58A | frog belly |
| `cheek` | #F79B7D | cheeks |
| `scarf` | #DD3E2E | neckerchief |
| `coral` | #E36F51 | primary buttons (home/sound), tile 1 |
| `gold` | #FDC625 | stars, hint button, pivot cap, pan rings |
| `pan` | #FFD447 (outline #D99A1E) | pans |
| `navy` | #2E4A7D | beam, strings, text |
| `cream` | #FDF0C8 | number-tile fill |
| tile borders (cycle by value 1–10) | coral #E36F51, orange #F2994A, green #6DAE3A, blue #4C87C4, purple #7D619F | number tiles; the DIGIT uses the same colour as its border |

## Components (how the interim procedural art must look)
- **Frog mascot (base of the scale):** chubby green body, cream belly, big white eyes with navy pupils, coral cheeks, red neckerchief, small yellow spot on head; both arms raised holding the pivot. Eyes follow the heavier side; balanced → closed happy eyes.
- **Beam:** navy rounded bar held above the mascot's head, gold round pivot cap in the middle, gold ring at each end.
- **Pans: hanging pans** (like the reference): three thin navy strings from each beam-end ring down to a yellow dish that always stays level. Items sit inside the dish.
- **Frog token:** small version of the mascot face/body (no scarf), outline `frog-outline`.
- **Number tile:** rounded-square cream card, thick coloured border (cycle above), big digit in the same colour, Baloo Bhaijaan 2 ExtraBold. Never a plain filled rectangle.
- **Tray:** one long lily-pad shape across the bottom (green with lighter veins) holding tiles on one side and the frog heap on the other.
- **Buttons:** round, coral (home/sound/read) or gold (hint/replay) with a darker rim and a white bold glyph; each glyph distinct.
- **Stars:** gold filled / cream outline.
- **Background (per world):** cream sky with soft sun and 2–3 simple clouds, a blue pond band in the lower half with lily pads and pink lotus at the edges, reeds/cattails at both sides. World tints per GDD §4 (dawn pink, flower noon, forest green, waterfall blue, glow-cave purple, starry navy).

## Typography
Baloo Bhaijaan 2 (already bundled). Titles 800, buttons/tiles 800, subtitles 700, colour `navy`.

## Motion
Squash-and-stretch on pick-up (scale 1.1 / 0.95), bounce on drop, mascot breathing idle (scale 1.00↔1.02 over 2 s), celebration = confetti in palette colours + mascot jump. All disabled/reduced under reduced-motion.

## Asset pack (ready to use)
Two folders, one source per texture key. Mock-ups of the target: `docs/art/mock-gameplay-tilted.png`, `docs/art/mock-gameplay-balanced.png`.

### A) Illustrated raster art — `public/assets/img/` (AI-generated in Canva, background removed, WebP)
Load with `this.load.image(key, 'assets/img/<key>.webp')`. Files are authored at **2× design size**, so display them at the design size below (`setDisplaySize`) — they stay crisp up to renderScale 2.
| Key(s) | File size | Display (design px) | Notes |
|---|---|---|---|
| `mascot_idle`, `mascot_look_left`, `mascot_look_right`, `mascot_strain_left`, `mascot_strain_right`, `mascot_happy`, `mascot_clap` | 880×920 | 440×460 | Fists are at the top: the beam pivot sits at about (220, 35) design px — see `mascot_meta.json` (`topY`, `handSpanX` in file px). Frame mapping: balanced → idle; heavier side → look_*; abs(diff) ≥ 3 → strain_*; success → happy + jump tween; result screen → clap. Breathing idle = scaleY 1.00↔1.02. |
| `frog_token`, `frog_token_ghost` | 128×140 | 64×70 | Ghost is pre-faded (hint level 2). |
| `frog_pile` | 480×284 | 240×142 | Frog source. |
| `bg_world_1` … `bg_world_6` | 1680×944 | cover the viewport | Landscape. World 6 is a night sky: the subtitle/equation text must sit on a cream pill (`sky` colour, 85 % opacity) so it stays readable on every background. |
| `bg_world_1_p` … `bg_world_6_p` | 810×1440 | cover the viewport | Portrait. |
| `map_bg`, `map_bg_p` | 1680×944 / 810×1440 | cover the viewport | World-map pond. `map_meta.json` gives each island's normalised centre on the landscape map (world 1 bottom-right → world 6 top-left, matching RTL progress). In portrait, lay the six islands out on a vertical zig-zag instead. |
| `island_1` … `island_6` | 560×440 | 280×220 | Locked worlds: desaturate (tint 0x9a9a9a + alpha 0.85) and overlay `lock_badge` at 2× size. Unlocked: gentle bob tween; current world: soft gold glow. Mock-up: `docs/art/mock-world-map.jpg`. |

### B) Vector UI & props — `public/assets/svg/` (generated by `tools/art/gen.py`)
Load with `this.load.svg(key, 'assets/svg/<key>.svg', { scale: renderScale })`.
| Key(s) | Size (design px) | Anchors / notes |
|---|---|---|
| `beam` | 840×70 | End rings at (24, 35) and (816, 35), pivot cap at (420, 35). Rotate around the pivot. |
| `pan` | 260×220 | **Hanging pan.** Hang point (ring) at (130, 14) attaches to a beam-end ring; the pan never rotates (always level). Items rest on the dish rim at y = 172 (centre x 130, usable width ≈ 220). |
| `pan_glow` | 320×120 | Behind the active work pan's dish. |
| `num_tile_1` … `num_tile_10` | 120×150 | Blank card; draw the digit with Text (Baloo 800, ~70 px) in the colour from `tile_colors.json`, centred at (60, 68). |
| `tray_bg` | 1280×180 | Lily-pad tray across the bottom. |
| `btn_home`, `btn_sound_on`, `btn_sound_off`, `btn_read`, `btn_hint`, `btn_replay`, `btn_play`, `btn_next`, `btn_back`, `btn_settings`, `btn_lock` | 112×112 | `btn_next` points LEFT (RTL "forward"). |
| `predict_left`, `predict_right`, `predict_equal` | 160×160 | Compare mode. |
| `symbol_gt`, `symbol_lt`, `symbol_eq` | 120×110 | Shown between the numbers after a prediction. |
| `star_full`, `star_empty` | 96×96 | |
| `lily_level`, `lily_level_locked` | 150×150 | Level select. |
| `lock_badge` 40×40, `peg_lock` 90×90, `hint_hand` 110×110, `number_line` 1000×90 | | |

PWA icons (mascot face): `public/icons/icon_192.png`, `icon_512.png`, `icon_maskable_512.png`.

`placeholderArt.ts` stays only as a fallback if a file fails to load (log a dev warning).

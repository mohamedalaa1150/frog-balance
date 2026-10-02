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

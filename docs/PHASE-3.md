## Phase / task

Phase 3: Style + game modes, branch `phase-3-modes`, based on the latest `main` and merged `docs/art-direction`, including the delivered asset pack. The PR is a draft because WebKit verification is blocked in this environment.

## What I built

- Verified A1–A5 already delivered by Phase 2 QA fixes, and strengthened stack clearance to eight actual CSS pixels. Real mouse/touch removals, locked items, pan rejection, button pixel hashes, source sizing and right-first speech have regression coverage.
- Loaded every delivered WebP/SVG key, with procedural art retained as fallback. Applied palette tokens, digits from `tile_colors.json`, cream subtitle/equation pills, portrait backgrounds and the documented beam/pan/mascot anchors. Pans stay level with items resting on the dish rim. Added expression changes, breathing, pickup stretch, bounce and palette confetti with reduced-motion handling.
- Added Compare predictions, unlocking, right-first spoken explanations and different generated sibling questions in the same difference band; original level identity, attempts and errors survive siblings.
- Added Bond's exact tile-count goals, canonical solutions board, duplicate VO and animated tile returns; Missing/Equation expressions above their own pans, numeral settings and the resolved missing term.
- Implemented spoken hint escalation, count badges, number line, highlighted pairs, ghost frogs and modelling. Added scored ResultScene with next/replay/menu, error events and all 48 levels in the developer list.
- Added eight visual baselines and [22 real-pointer gameplay screenshots](screens/phase-3/README.md), covering all six modes at both required sizes. No new runtime dependencies. Authored content files were not changed.

## Files changed

```text
src/
  assets.ts, theme.ts                 delivered art manifest, anchors, palette
  controllers/LevelController.ts      all modes, sibling handling, solving
  core/generator.ts                  comparison sibling generation
  objects/                           balance, expressions, hints, dragging
  scenes/                            asset loading, gameplay, results, dev list
  layout/, ui/textPill.ts             viewport geometry, background cover, pills
  testing/testApi.ts                  all-level navigation, text/visibility/hash checks
public/assets/{img,svg}/              approved art merged from art-direction
tests/{unit,e2e}/                     regressions, mode tests, visual baselines
docs/{art,screens/phase-3}/           target mock-ups and gameplay captures
```

## Commands & results

Run with `npm ci`, install Playwright Chromium/WebKit, then `npm run check`. For this environment, Chromium uses `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`; E2E runs use one worker to avoid software-GPU contention.

`npm run lint`:

```text
Checking formatting...
All matched files use Prettier code style!
```

`npm run test:coverage`:

```text
Test Files  16 passed (16)
Tests       370 passed (370)
Statements  99.49% (396/398)
Branches    99.04% (416/420)
Functions   100%   (75/75)
Lines       99.42% (346/348)
```

`npm run validate:content`:

```text
OK — 48 levels valid and solvable.
```

`npm run build`:

```text
✓ built in 1.25s
JavaScript gzip total: 370.26 kB (3 files; target < 600 kB).
```

`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium PLAYWRIGHT_BROWSERS_PATH=/tmp/frog-browsers npm run test:e2e -- --workers=1`:

```text
Running 220 tests using 1 worker
55 failed
165 passed (16.4m)
```

54 failures are WebKit launch failures: `/tmp/frog-browsers/webkit-2359/pw_run.sh` is unavailable. Installing Playwright browsers fails with HTTP 403 `Domain forbidden` for `cdn.playwright.dev`. No WebKit tests were removed or skipped. The other initial failure was an HTTP 404 because the first desktop test began during the build's replacement of `dist/`; the build completed successfully, and that exact spec was rerun afterward (result below).

`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- all-levels-solvable --project=chromium-desktop --workers=1`:

```text
Running 1 test using 1 worker
✓ all 48 authored levels complete exactly once through solveCurrent (12.0s)
1 passed (14.0s)
```

Together these runs validate all 166 Chromium tests across desktop, Android and whiteboard projects. The remaining 54 WebKit tests require a browser-equipped runner. Both real-pointer playthroughs and all eight visual snapshot comparisons passed.

## Acceptance criteria status

| AC id | Status | Evidence |
|---|---|---|
| A1 | ✅ | Existing reducer removal/move, return animation and locked feedback; mouse + native Chromium touch regressions pass. GDD §8 bullet is present. |
| A2 | ✅ | `getBounds` in CSS pixels; worst legal stacks at both tilt extremes, five viewports and DPR checks pass; eight CSS pixel clearance. |
| A3 | ✅ | Delivered speech-bubble read SVG; all button pixel hashes are distinct. |
| A4 | ✅ | Reading unit tests and pointer Sandbox tests verify `[count_06, phrase_less_than, count_09]`. |
| A5 | ✅ | Tile and pile size checks pass at both sizes. Delivered asset pack overrides the older pile height: 240×142 design pixels. Tiles keep their size and CSS minimum, wrapping as needed. |
| B1 | ✅ | Central theme tokens; no colour literals elsewhere in TypeScript/CSS. Delivered tile colour JSON loaded by PreloadScene. |
| B2 | ✅ | Asset manifest loads every pack key, zero missing; level dishes, documented anchors, expressions and orientation-specific backgrounds. |
| B3 | ✅ | Pickup stretch, drop bounce, breathing and confetti; reduced-motion spring/input regressions pass. |
| B4 | ✅ | Eight Chromium desktop screenshot snapshots at both sizes pass with `maxDiffPixelRatio: 0.02`. |
| P3-1 | ✅ | Compare correct/equal/retry tests, right-first VO, same difference band and exactly one success. |
| P3-2 | ✅ | Bond exact child count, no frogs, new/duplicate solution tests, board and return events. |
| P3-3 | ✅ | Missing/Equation positions, question replacement and both numeral systems tested. |
| P3-4 | ✅ | Real wrong-pan drags reject with `feedback_wrong_pan`. |
| P3-5 | ✅ | Actual idle timer → hints 1/2/3; all hint VO and per-mode visual/model aids checked. |
| P3-6 | ✅ | Results tests verify 3/2/1 stars, replay, next and menu; clap mascot. |
| P3-7 | ✅ | Compare flip, equation misconception, overcount and capacity events/state checked. |
| P3-8 | ✅ | 48 authored levels solve in fast mode with one success each; API navigation race fixed. |
| P3-9 | ❌ | Chromium desktop, Android and whiteboard coverage passes after the desktop rerun. All 54 WebKit tests remain blocked by the missing browser. |

## Known issues / questions for reviewer

- Full DoD is not green: WebKit requires a runner with the Playwright browser installed or access to its download host. Run all four projects before marking the draft ready. Existing CI installs these browsers; no test thresholds or requirements were weakened.
- The temporary developer list remains the menu for Phase 3; progression/maps/settings integration belongs to Phase 4.
- Audio remains the existing cached-audio/speech fallback; this update delivers final visual art, not recorded VO.

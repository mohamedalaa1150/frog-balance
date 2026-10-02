# Frog Balance — Mizan Dofdou

An Arabic educational math game for children aged 4–8, built with Phaser 3,
strict TypeScript, and Vite. Phase 2 adds playable Count levels and Sandbox, using the tested Phase 1 reducer as the single source of truth.
The full menus, progress tracking, remaining game modes, and offline PWA packaging arrive in later phases.

## Setup

Use Node.js 22.12+ (Node 24 LTS recommended) and npm.

```sh
npm ci
npx playwright install --with-deps chromium webkit
npm run dev
```

Open http://localhost:5173. The title screen uses connected Arabic text,
self-hosted Baloo Bhaijaan 2 (500/700/800), Arabic-Indic digits, and a responsive
pond background. No external font requests are made.
Rendering uses a physical-pixel backing store capped at 2× device resolution;
resize, rotation, and visual viewport changes preserve the CSS layout. Font loading
has a 2.5-second deadline and continues with an Arabic-capable system font stack
if fonts fail or time out.

## Scripts

| Command                        | Purpose                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| `npm run dev`                  | Development server on port 5173, accessible on the local network.                                |
| `npm run build`                | Strict type checking, production build into `dist/`, and a total JavaScript gzip-size report.    |
| `npm run preview`              | Serve the production build on port 4173. Run `build` first.                                      |
| `npm run lint`                 | ESLint and Prettier checks.                                                                      |
| `npm test`                     | Run unit tests with Vitest.                                                                      |
| `npm run test:coverage`        | V8 coverage; at least 90% lines, branches, functions, and statements in `src/core/**`.           |
| `npm run validate:content`     | Validate schema, matching IDs, VO keys, and solvability; print the 48-level solution table.      |
| `npm run validate:cross-check` | Compare all 48 solution counts and solvability results against the independent Python validator. |
| `npm run test:e2e`             | Run Playwright against production preview; builds must already exist.                            |
| `npm run check`                | Lint, unit tests, content validation, build, and E2E in order.                                   |

Playwright starts and stops `npm run preview` itself on port 4173. Keep that port
free. Its four projects are desktop Chromium (1366×768), iPad gen 7 landscape
(WebKit), Pixel 7 portrait (Chromium), and a touch whiteboard (1920×1080).
Failure screenshots and retry traces appear in `test-results/`, and the HTML
report in `playwright-report/`.

GitHub Actions runs coverage and the full `check` pipeline on pull requests,
including all four Playwright projects with managed Chromium and WebKit.

Constrained runners may set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an installed
Chromium binary. The WebKit project still requires Playwright's WebKit browser;
the override does not replace or skip any project.

To format maintained source and configuration, run `npx prettier --write .`.
Authored content and supplied documentation are preserved and excluded from
formatting.

## Test mode

`window.__FROG__` exists in development, or when the URL explicitly has `?test=1`.
The production preview does not expose it otherwise.

```sh
npm run build
npm run preview
# Open http://localhost:4173/?test=1
```

In the browser console:

```js
await window.__FROG__.ready;
window.__FROG__.version; // package.json version
await window.__FROG__.gotoScene('TitleScene');
window.__FROG__.events; // timestamped local readiness/navigation events
```

`ready` resolves after bounded font loading, preload, and the title's first frame.
Font failures/timeouts produce a `font-fallback` event with a reason.
`gotoScene` resolves when the requested scene (or its declared Boot → Preload →
Title forward chain) renders, and rejects after ten seconds if readiness is absent.
Unknown keys reject immediately. Scenes deriving from `BaseScene` automatically
emit `scene-ready` after `create`; an `init` override must call `super.init()`.
Events are capped at 2,000 entries and stay local.

`toCssPoint(x, y)` converts physical game coordinates to CSS viewport coordinates,
including safe-area offsets, for future pointer tests. With `?test=1`, the
regression fixtures `TestReadyScene` and `TestSilentScene` are also registered
to check non-title readiness and timeout recovery.
The gameplay API supports the Count and Sandbox flows described below; other
authored modes arrive in Phase 3. Test mode is a local QA convenience, not an
authentication gate.

## Structure and scope

`src/core/` contains pure TypeScript rules and schemas, with no Phaser or DOM
imports. `src/scenes/` renders the game, `src/layout/` computes responsive scaling,
and `src/testing/` implements the test bridge. Other modules and asset folders
from technical spec §3 contain TODOs or tracked placeholders for later phases.

The title label comes from `game_title` in `content/strings.ar.json`, through the
typed `t()` helper; the HTML title is the pre-JavaScript fallback. The 48 authored
levels remain unchanged. Strict schemas and VO string references are validated
in development before boot and by the CLI/unit tests.
See `AGENTS.md` and `docs/02-technical-spec.md` for binding implementation rules,
and `docs/03-roadmap.md` for acceptance criteria.

## Pure core API (Phase 1)

`createLevelState(level, { now, idleHintSec })` builds independent fixed items and
starts play. `applyAction(state, action)` returns a new state for place, remove,
predict, requestHint, settle, and tick. Action `at` values are monotonic milliseconds;
omitting `at` preserves the current time. There are no wall-clock reads. Forward
`dragging` on tick/settle; releasing starts a new full 1,000 ms quiet interval.
Only changed positions are evaluated, once per change. Settled quantities reaching a new best gap update `bestSettledGap` and reset
hint failures. Improvements back to an earlier quantity are neutral activity:
they update `lastSettledGap` without attempts or resetting hint failures; overshoots
and invalid bond answers remain failures. Hint progress fading happens on settle,
so placing and returning a frog without net progress cannot reset failed attempts.
Fixed items, wrong pans,
unavailable sources, child limits, and physical capacities are enforced here.

`enumerateSolutions(level)` returns legal child `items`, canonical bond strings,
or the correct comparison `prediction`. Bond solutions clear child items and
preserve locks; `outcome: 'duplicate'` reports repeat answers. Wrong comparisons
enter `revealing` with `outcome: 'wrongPrediction'`. After the explanation, the
future scene layer starts a sibling via `generateLevel(seed, ['compare'], band,
index)` and `createLevelState`. Revealing and success states freeze input.

Hint state uses `updateHint(state, event, idleHintSec, clock)` with an injectable
clock. Activity restarts idle timing; improvement resets unsuccessful attempts
and fades the visible hint. Maximum assistance and usage survive fading for
`stars(hintsUsed, hint.maxLevel)`. New levels reset all hint state. Idle=0 disables
only automatic idle hints. Three failures without improvement escalate one step.

`generateLevel(seed, unlockedModes, band, index)` creates strict, solvable
`practice-<index>` levels; `unlockedModes(save)` supplies eligible modes.
`adaptBand(practice, correct)` uses a signed consecutive streak, raises the
1–10 band after three correct results, and lowers it after two wrong results.
Comparison bands 1–3 use differences 5–8; 4–6 use 3–5; 7–8 use 1–3; 9–10 use
0–2, with equality sampled 25% of the time. Siblings use the same band mapping.
Wrong predictions of the lighter pan record both `wrongPrediction` and
`compareFlip`; equality mistakes record only `wrongPrediction`. Duplicate bond
answers return child tiles and preserve fixed items without errors or attempts.
Recorded and duplicate bond solutions reset both settled gaps to the starting
gap so the next pair can make fresh progress.
`defaults()` and `migrate(raw)` handle versioned plain save data without storage
access. Version 0/unversioned saves with the same field layout receive missing
field defaults. Migration repairs settings and level entries independently,
preserves valid stars, discards unknown error tags, clamps negative counts and
practice fields, and resets wholly only for unreadable/non-object/future input.
`migrateWithReport(raw)` returns `{ save, droppedPaths }`; paths include discarded
or replaced values for later development logging without storage access.

`formatEquation(leftTerms, rightTerms, system)` returns separate, labelled
on-screen left/right groups and a central equals sign. Terms retain placement
order with RTL metadata, and `'?'` formats as the Arabic question-mark symbol.
Rendering can position each group over its own pan without swapping screen sides.

Core imports are restricted to sibling core modules, plain `src/config.ts`, and
zod. Vitest covers all runtime core modules, all 48 authored reducer playthroughs,
five intentionally broken levels, and 1,000 generator seeds per mode (5,000
levels total). `python3 tools/build_levels.py --check` validates authored content
without rewriting it; its original default invocation still builds the file.
CI runs both validators and checks their exact solution-count agreement.

## Vertical slice (Phase 2)

In development, press the play icon on Title to open the temporary Count level list
(`w1-l1`–`w2-l5`) and Sandbox. For a production preview, open `/?test=1`.
The development list is hidden on the production Title without that query.

Drag frogs or number tiles onto a pan, or tap a source to place a copy on the work
pan. Tap a child token or drag it outside both pans to return it to its source.
Fixed tokens have locks and reject drag
attempts. Count evaluates only after a full second without changes or dragging;
success plays a small celebration and returns to the list. Sandbox accepts both
pans, has no goal or stars, and reads their relation with the read icon. Tap a
Sandbox pan to select the destination for source taps (right initially).

The balance uses Phaser.CANVAS, a spring with stiffness
120/damping 14, and a single 200 ms tween when reduced motion is enabled. Artwork
uses all documented texture keys at the current render scale; numerals are Text
objects over blank tile textures. Sprite frames and number labels can be replaced
by the final atlas without changing the reducer.

Audio loads only local mp3 files found at build time. Missing files use queued
`ar-EG` speech synthesis, or subtitles when speech is unavailable. VO ducks music
to 30%. Settings use the existing save defaults/migration with guarded storage.
The authored VO scripts contain no `count_00`; zero uses the formatted numeral as
the speech fallback. Sandbox reads from the right pan, comparing it with the left;
each pan's terms retain placement order and use existing number/plus keys.

Gameplay layout reserves the tallest legal stack at either tilt extreme, including
spring overshoot and the placement hop, between the HUD and source controls.
Sources retain their specified design sizes; tiles wrap on landscape screens and
shrink only to fit portrait columns, with a 64×80 CSS-pixel minimum. Test mode also
provides `getBounds(name)` in CSS pixels and `getTextureHash(key)` for pixel contracts.

The test API navigates every new scene, exposes cloned reducer state and the
rendered beam angle, returns CSS pointer coordinates, records actions/feedback/VO,
and solves Count using `enumerateSolutions`. Fast mode passes a zero settle delay
to the reducer without advancing or inventing action timestamps. Sandbox is a
runtime core definition with a `none` goal; authored level schemas/content remain
unchanged. Other authored modes stay in Phase 3.

## Phase 4: Meta + quality

The production flow is Title → World Map → Level Select → Game → Result.
Completing a level saves its best stars and accumulated attempts, hints and error
patterns, and unlocks the next level/world. Sandbox and adaptive Practice are
available from Title and Map; the developer level list is registered only with
`?test=1`. Practice adapts after three correct or two incorrect answers.

Hold the Title lock continuously for three seconds to open the grown-up area.
Settings apply audio channels, numeral/equation direction, counting VO, motion
and idle hints immediately. Reset requires a second confirmation and preserves
preferences. Dashboard summarizes mastery and hints, names the three most common
errors in Arabic, recommends practice, and downloads a local UTF-8 CSV.

The PWA precaches all bundled assets and installs updates automatically. Update
activation preserves the current session; a notice appears on Title, and the new
code loads on the next visit. Visibility pauses audio, animation, success/reveal
deadlines and hint clocks. Every scene relayouts on rotation.

Chromium offline tests retain `context.setOffline(true)` unchanged. WebKit uses a
real origin outage because [Playwright #42775](https://github.com/microsoft/playwright/issues/42775)
rejects even local service-worker responses under its offline-emulation flag.
The WebKit test is never skipped: it shuts down its dedicated production server,
requires a fresh context without a worker to fail, then requires a 200 response
from the service worker and a complete level after reload.

Game, Practice and Sandbox use one CSS-pixel layout: portrait beam span 60–72%,
short landscape ≥45%, and taller landscape ≥62%. Pans use width-bounded grids
with at most three rows; frogs use up to four/five columns and tiles two/three
(portrait/landscape). Hanging strings follow the actual stack and tilt, while
dishes and the mascot size independently. Pan items retain the 36/48×60 minimums
and expand on larger screens (48/64×80 at 1366×768); hit areas stay ≥56 CSS px.
Canvas backgrounds, static tray/HUD caches, size-matched textures, token/drag
pools and Phaser's particle pool reduce frame work on software-rendered runners.

`npm run build` reports and enforces both size budgets. The four CI projects run
the complete E2E suite; desktop Chromium additionally performs 30 seconds of
native drags under CDP CPU ×4 with a ≥55 FPS assertion. Whiteboard logs all eleven
capacity drags and actual FPS at DPR 1. Screenshot thresholds, coverage thresholds
and the 60-second capacity timeout are unchanged. Review screenshots are under
`docs/screens/phase-4/`.

QA round-one regressions cover all 48 authored worst-case stacks, seven Sandbox
arrangements and Practice at seven viewports, at DPR 2 after a 2.5-second settle.
Set `QA_SCREENSHOTS=1` when running `qa-gameplay-layout.spec.ts` and
`qa-meta-layout.spec.ts` to save review images in `docs/screens/phase-4/fix/`.
The hidden test API can hold result navigation with `setResultNavigation(false)`
while success still evaluates normally; `getBeamGeometry()` exposes the rotated
shaft and rings for collision checks, and `getBounds('mascot-head')` returns the
top 35% of the mascot. The Phase-0 numeral font probe is hidden on Title; its text
and metrics remain in the ready event and test API.

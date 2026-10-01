# Frog Balance — Mizan Dofdou

An Arabic educational math game for children aged 4–8, built with Phaser 3,
strict TypeScript, and Vite. Phase 0 provides the title screen and tooling;
gameplay, audio, persistence, and offline PWA support arrive in later phases.

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

## Scripts

| Command                    | Purpose                                                                                                               |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`              | Development server on port 5173, accessible on the local network.                                                     |
| `npm run build`            | Strict type checking and production build into `dist/`.                                                               |
| `npm run preview`          | Serve the production build on port 4173. Run `build` first.                                                           |
| `npm run lint`             | ESLint and Prettier checks.                                                                                           |
| `npm test`                 | Run unit tests with Vitest.                                                                                           |
| `npm run test:coverage`    | V8 coverage; at least 90% lines, branches, functions, and statements in `src/core/**`.                                |
| `npm run validate:content` | Validate the 48 authored levels with Zod, including unique IDs matching world/index. Solvability is added in Phase 1. |
| `npm run test:e2e`         | Run Playwright against production preview; builds must already exist.                                                 |
| `npm run check`            | Lint, unit tests, content validation, build, and E2E in order.                                                        |

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

`ready` resolves after fonts load, preload completes, and the title's first frame
renders. Phase 0 registers `BootScene`, `PreloadScene`, and `TitleScene`;
`gotoScene` supports these keys and resolves when the title renders again.
Unknown scene keys reject. Events are capped at 2,000 entries and stay local.
The remaining API methods throw `not implemented in phase 0` until their phases
are implemented. Test mode is a local QA convenience, not an authentication gate.

## Structure and scope

`src/core/` contains pure TypeScript rules and schemas, with no Phaser or DOM
imports. `src/scenes/` renders the game, `src/layout/` computes responsive scaling,
and `src/testing/` implements the test bridge. Other modules and asset folders
from technical spec §3 contain TODOs or tracked placeholders for later phases.

The title label is read from `index.html` because the supplied VO content has no
title key; `content/levels.json` and `content/strings.ar.json` remain unchanged.
Level content is validated in development before boot and by the CLI/unit tests.
See `AGENTS.md` and `docs/02-technical-spec.md` for binding implementation rules,
and `docs/03-roadmap.md` for acceptance criteria.

# AGENTS.md — rules for the coding agent (Codex)

You are building **Mizan Dofdou / Frog Balance**, an Arabic (RTL) educational math game for children aged 4–8, as a Phaser 3 + TypeScript + Vite PWA.
A separate reviewer (Claude) will pull your branch, run `npm run check`, play-test with Playwright, and send you a QA report. Your job is to make every check pass and every acceptance criterion true.

## Source of truth (read before writing code, every phase)
1. `docs/02-technical-spec.md` — architecture, stack, schema, test API, budgets. **Binding.**
2. `docs/01-game-design.md` — gameplay & learning rules (Arabic). Behaviour questions are answered here.
3. `docs/03-roadmap.md` — the phase you are working on and its acceptance criteria.
4. `docs/05-assets.md` — texture keys, sizes, audio keys.
5. `content/levels.json`, `content/strings.ar.json` — authored content. **Do not edit content files** unless the task says so; if content seems wrong, report it in your summary.

## Non-negotiable rules
- Work only on the phase you were asked for. Do not start later phases.
- Keep `src/core/` free of Phaser/DOM imports. All game rules are pure functions with unit tests.
- TypeScript strict; no `any` except at the zod/JSON boundary; no `// @ts-ignore`.
- Never hard-code Arabic strings in code — use keys from `content/strings.ar.json`.
- Never hard-code level data in code — read `content/levels.json`.
- Every interactive object must have a stable `name` (see spec §9) and be reachable through `window.__FROG__` in test mode.
- No new runtime dependency without listing it in your summary with a one-line justification.
- No network calls at runtime (offline-first). No analytics/telemetry leaving the device.
- Storage access always wrapped in try/catch with in-memory fallback.
- Audio must never throw if a file is missing.
- Accessibility: touch targets ≥ 64 design px; respect reduced motion; no information conveyed by colour only.
- Zero console errors or warnings in a normal play session.

## Definition of done for each phase
Before you say a phase is finished, run and paste the tail of each output in your summary:
```
npm run lint
npm run test:coverage
npm run validate:content
npm run build
npm run test:e2e
```
All must pass. If something cannot pass, say exactly which and why — never hide failures, never weaken/skip/delete a test to make it pass, never lower coverage thresholds.

## Git workflow
- Branch per phase: `phase-<n>-<short-name>`. Small, meaningful commits (Conventional Commits: `feat:`, `fix:`, `test:`, `chore:`).
- Open a PR into `main` titled `Phase <n>: <name>`, body = summary (what was built, how to run, test output tails, known gaps).
- When fixing a QA report, reference bug IDs in commits: `fix(game): BUG-012 frogs overlap on pan`.

## Summary format you must return at the end of every task
```
## Phase / task
## What I built (bullets)
## Files changed (tree, brief)
## Commands & results (tail of each check)
## Acceptance criteria status (table: AC id | ✅/❌ | evidence)
## Known issues / questions for reviewer
```

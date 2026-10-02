import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import levels from '../../content/levels.json' with { type: 'json' };
import { boot } from './helpers';

test.use({ deviceScaleFactor: 2 });
type Box = { x: number; y: number; width: number; height: number };
const intersects = (a: Box, b: Box) =>
  a.x < b.x + b.width - 0.01 &&
  b.x < a.x + a.width - 0.01 &&
  a.y < b.y + b.height - 0.01 &&
  b.y < a.y + a.height - 0.01;
/** SAT against the actual rotated shaft: its enclosing AABB includes empty
 * triangles under a tilted beam and cannot diagnose a visual collision. */
function shaftIntersects(
  box: Box,
  shaft: Array<{ x: number; y: number }>,
): boolean {
  const corners = [
    { x: box.x, y: box.y },
    { x: box.x + box.width, y: box.y },
    { x: box.x + box.width, y: box.y + box.height },
    { x: box.x, y: box.y + box.height },
  ];
  const axes = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    ...shaft.slice(0, 2).map((p, i) => ({
      x: -(shaft[i + 1]!.y - p.y),
      y: shaft[i + 1]!.x - p.x,
    })),
  ];
  return axes.every((axis) => {
    const a = corners.map((p) => p.x * axis.x + p.y * axis.y),
      b = shaft.map((p) => p.x * axis.x + p.y * axis.y);
    return (
      Math.min(...a) < Math.max(...b) - 0.01 &&
      Math.min(...b) < Math.max(...a) - 0.01
    );
  });
}
const sandboxCases = [
  'left-numbers',
  'right-numbers',
  'left-frogs',
  'right-frogs',
  'left-mixed',
  'right-mixed',
  'both-full',
];
for (const [width, height] of [
  [844, 390],
  [1366, 768],
  [1024, 768],
  [1920, 1080],
  [390, 844],
  [360, 740],
  [768, 1024],
] as const) {
  test(`BUG-401/402: every authored stack and Sandbox at ${width}x${height}`, async ({
    page,
  }, info) => {
    // New exhaustive QA suite: 56 cases each measured after the reviewer's 2.5 s settle.
    test.setTimeout(process.env.QA_SCREENSHOTS === '1' ? 360000 : 240000);
    await page.setViewportSize({ width, height });
    await boot(page);
    await page.evaluate(() => {
      window.__FROG__!.setFastMode(true);
      window.__FROG__!.setResultNavigation(false);
    });
    const cases = [
      ...levels.levels.map((l) => l.id),
      ...sandboxCases,
      'practice',
    ];
    for (const id of cases) {
      const accepted = await page.evaluate(
        async ({ id, level }) => {
          const api = window.__FROG__!;
          const placements: boolean[] = [];
          if (level) {
            await api.gotoLevel(level.id);
            if (level.workPan) {
              for (let i = 0; i < level.childLimits.maxNumbers; i++)
                placements.push(
                  api.place(
                    'number',
                    level.workPan as 'left' | 'right',
                    level.tray.numbers.at(-1)!,
                  ),
                );
              for (let i = 0; i < level.childLimits.maxFrogs; i++)
                placements.push(
                  api.place('frog', level.workPan as 'left' | 'right'),
                );
            } else {
              const weight = (items: typeof level.fixed.left) =>
                items.reduce(
                  (s, i) =>
                    s + (i.kind === 'frog' ? 1 : 'value' in i ? i.value! : 0),
                  0,
                );
              const d = weight(level.fixed.left) - weight(level.fixed.right);
              api.predict(d === 0 ? 'equal' : d > 0 ? 'left' : 'right');
            }
          } else if (id === 'practice') {
            api.unlockAll();
            await api.gotoScene('PracticeScene');
            const l = api.getLevelState()!.level;
            if (l.workPan) {
              for (let i = 0; i < l.childLimits.maxNumbers; i++)
                placements.push(
                  api.place('number', l.workPan, l.tray.numbers.at(-1)!),
                );
              for (let i = 0; i < l.childLimits.maxFrogs; i++)
                placements.push(api.place('frog', l.workPan));
            }
          } else {
            await api.gotoScene('SandboxScene');
            const add = (side: 'left' | 'right', stack: string) => {
              if (stack === 'numbers')
                for (const value of [10, 9, 8])
                  placements.push(api.place('number', side, value));
              else {
                if (stack === 'mixed')
                  for (const value of [7, 6])
                    placements.push(api.place('number', side, value));
                for (let i = 0; i < (stack === 'mixed' ? 6 : 10); i++)
                  placements.push(api.place('frog', side));
              }
            };
            if (id === 'both-full') {
              add('left', 'numbers');
              add('right', 'mixed');
            } else {
              const [side, stack] = id.split('-');
              add(side as 'left' | 'right', stack!);
            }
          }
          return placements;
        },
        { id, level: levels.levels.find((l) => l.id === id) },
      );
      expect(
        accepted,
        `${id}: all worst-case placements accepted`,
      ).not.toContain(false);
      await page.waitForTimeout(2500);
      const report = await page.evaluate(() => {
        const api = window.__FROG__!,
          s = api.getLevelState()!;
        return {
          beam: api.getBounds('beam')!,
          geometry: api.getBeamGeometry(),
          head: api.getBounds('mascot-head')!,
          pans: ['pan-left', 'pan-right'].map((n) => api.getBounds(n)!),
          dishes: ['dish-left', 'dish-right'].map((n) => api.getBounds(n)!),
          hud: [
            'btn-home',
            'btn-sound',
            s.level.mode === 'sandbox' ? 'btn-read' : 'btn-hint',
          ].map((n) => api.getBounds(n)!),
          items: (['left', 'right'] as const).flatMap((side, i) =>
            s.pans[side].map((item) => ({
              side: i,
              kind: item.kind,
              hit: api.getHitAreaSize(`item-${side}-${item.uid}`)!,
              b: api.getBounds(`item-${side}-${item.uid}`)!,
            })),
          ),
        };
      });
      expect(
        report.beam,
        `${id}: gameplay remains available after settling`,
      ).not.toBeNull();
      const portrait = width < height;
      expect(
        report.beam.width / width,
        `${id}: beam span`,
      ).toBeGreaterThanOrEqual(portrait ? 0.6 : height < 500 ? 0.45 : 0.62);
      if (portrait) expect(report.beam.width / width).toBeLessThanOrEqual(0.72);
      expect(
        intersects(report.pans[0]!, report.pans[1]!),
        `${id}: pans overlap`,
      ).toBe(false);
      for (const dish of report.dishes) {
        expect(dish.x, `${id}: dish left margin`).toBeGreaterThanOrEqual(
          8 - 0.01,
        );
        expect(
          dish.x + dish.width,
          `${id}: dish right margin`,
        ).toBeLessThanOrEqual(width - 8 + 0.01);
        if (portrait)
          expect(dish.width).toBeGreaterThanOrEqual(width * 0.34 - 0.01);
      }
      for (const { kind, b, side, hit } of report.items) {
        expect(hit.width, `${id}: hit width`).toBeGreaterThanOrEqual(56 - 0.01);
        expect(hit.height, `${id}: hit height`).toBeGreaterThanOrEqual(
          56 - 0.01,
        );
        expect(b.x, `${id}: item left`).toBeGreaterThanOrEqual(0);
        expect(b.y, `${id}: item top`).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width, `${id}: item right`).toBeLessThanOrEqual(
          width + 0.01,
        );
        expect(b.y + b.height, `${id}: item bottom`).toBeLessThanOrEqual(
          height + 0.01,
        );
        expect(b.width, `${id}: ${kind} minimum`).toBeGreaterThanOrEqual(
          (kind === 'frog'
            ? width === 1366
              ? 48
              : 36
            : width === 1366
              ? 64
              : 48) - 0.01,
        );
        if (kind === 'number')
          expect(b.height).toBeGreaterThanOrEqual(
            (width === 1366 ? 80 : 60) - 0.01,
          );
        const dish = report.dishes[side]!;
        expect(b.x, `${id}: inside own dish left`).toBeGreaterThanOrEqual(
          dish.x - 0.01,
        );
        expect(
          b.x + b.width,
          `${id}: inside own dish right`,
        ).toBeLessThanOrEqual(dish.x + dish.width + 0.01);
        expect(
          shaftIntersects(b, report.geometry.shaft),
          `${id}: item touches beam`,
        ).toBe(false);
        expect(b.y, `${id}: stack below ring`).toBeGreaterThanOrEqual(
          report.geometry.rings[side]!.y +
            report.geometry.rings[side]!.height / 2 +
            8 -
            0.01,
        );
        for (const ring of report.geometry.rings)
          expect(intersects(b, ring), `${id}: item touches ring`).toBe(false);
        expect(
          intersects(b, report.head),
          `${id}: item covers mascot head`,
        ).toBe(false);
        for (const hud of report.hud)
          expect(intersects(b, hud), `${id}: item covers HUD`).toBe(false);
      }
      if (
        process.env.QA_SCREENSHOTS === '1' &&
        info.project.name === 'chromium-desktop'
      ) {
        mkdirSync('docs/screens/phase-4/fix', { recursive: true });
        await page.screenshot({
          path: resolve(
            `docs/screens/phase-4/fix/${id}-${width}x${height}.png`,
          ),
          scale: 'css',
        });
      }
    }
  });
}

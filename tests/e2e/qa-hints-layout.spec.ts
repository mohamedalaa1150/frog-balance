import { expect, test } from '@playwright/test';
import { boot } from './helpers';

test.use({ deviceScaleFactor: 2 });
test('BUG-401/402: large hint tallies share the fixed-item grid without collisions', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await boot(page);
  await page.evaluate(() => window.__FROG__!.setFastMode(true));
  for (const [width, height] of [
    [390, 844],
    [844, 390],
    [1366, 768],
  ]) {
    await page.setViewportSize({ width: width!, height: height! });
    for (const id of ['w5-l6', 'w5-l7', 'w6-l7']) {
      await page.evaluate(async (id) => {
        const api = window.__FROG__!;
        await api.gotoLevel(id);
        api.requestHint();
        api.requestHint();
      }, id);
      await page.waitForTimeout(2500);
      const report = await page.evaluate(() => {
        const api = window.__FROG__!,
          state = api.getLevelState()!;
        const side = state.level.workPan!;
        const boxes = state.pans[side].map((item) =>
          api.getBounds(`item-${side}-${item.uid}`)!,
        );
        for (let i = 1; ; i++) {
          const ghost = api.getBounds(`hint-ghost-${i}`);
          if (!ghost) break;
          boxes.push(ghost);
        }
        return {
          boxes,
          realCount: state.pans[side].length,
          dish: api.getBounds(`dish-${side}`)!,
          ring: api.getBeamGeometry().rings[side === 'left' ? 0 : 1]!,
        };
      });
      expect(
        report.boxes.length,
        `${id}: visible modelling tally`,
      ).toBeGreaterThan(report.realCount + 5);
      for (const [i, box] of report.boxes.entries()) {
        expect(box.x).toBeGreaterThanOrEqual(report.dish.x - 0.01);
        expect(box.x + box.width).toBeLessThanOrEqual(
          report.dish.x + report.dish.width + 0.01,
        );
        expect(box.y).toBeGreaterThanOrEqual(
          report.ring.y + report.ring.height / 2 + 8 - 0.01,
        );
        expect(box.y + box.height).toBeLessThanOrEqual(height! + 0.01);
        for (const other of report.boxes.slice(i + 1)) {
          const overlap =
            box.x < other.x + other.width - 0.01 &&
            other.x < box.x + box.width - 0.01 &&
            box.y < other.y + other.height - 0.01 &&
            other.y < box.y + box.height - 0.01;
          expect(overlap, `${id}: real item / ghost collision`).toBe(false);
        }
      }
    }
  }
  expect(errors).toEqual([]);
});

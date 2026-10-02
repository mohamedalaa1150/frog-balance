import { expect, test } from '@playwright/test';
import { beamAngle } from '../../src/core/balance';
import { boot } from './helpers';
for (const reduced of [false, true])
  test.describe(reduced ? 'reduced motion' : 'spring', () => {
    test.use({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    test('rendered angle settles within 0.5 degrees for zero, small and saturated differences', async ({
      page,
    }) => {
      await boot(page);
      await page.evaluate(() => window.__FROG__!.gotoScene('SandboxScene'));
      for (const d of [0, 1, -1, 3, -3, 9, -9]) {
        const prior = await page.evaluate(() =>
          window.__FROG__!.getBeamAngle(),
        );
        await page.evaluate((d) => {
          const api = window.__FROG__!;
          while (api.removeLast('left')) {
            /* Clear child items through the reducer. */
          }
          while (api.removeLast('right')) {
            /* Clear child items through the reducer. */
          }
          if (d) api.place('number', d > 0 ? 'right' : 'left', Math.abs(d));
        }, d);
        if (reduced && d !== 0) {
          await page.waitForTimeout(70);
          const angle = await page.evaluate(() =>
            window.__FROG__!.getBeamAngle(),
          );
          expect(angle).toBeGreaterThanOrEqual(
            Math.min(prior, beamAngle(d)) - 0.1,
          );
          expect(angle).toBeLessThanOrEqual(
            Math.max(prior, beamAngle(d)) + 0.1,
          );
        }
        await page.waitForTimeout(reduced ? 220 : 680);
        expect(
          Math.abs(
            (await page.evaluate(() => window.__FROG__!.getBeamAngle())) -
              beamAngle(d),
          ),
        ).toBeLessThan(0.5);
      }
    });
  });

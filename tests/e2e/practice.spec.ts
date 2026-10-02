import { test, expect } from '@playwright/test';
import { boot, tap } from './helpers';
test('three independent practice successes raise the saved band and next produces another question', async ({
  page,
}) => {
  await boot(page);
  await tap(page, 'btn-practice');
  for (let i = 0; i < 3; i++) {
    await expect
      .poll(() =>
        page.evaluate(() => window.__FROG__!.getLevelState()?.levelId),
      )
      .toBe(`practice-${i}`);
    await page.evaluate(() => {
      window.__FROG__!.setFastMode(true);
      return window.__FROG__!.solveCurrent();
    });
    await expect
      .poll(() =>
        page.evaluate(() => window.__FROG__!.getPointerTarget('btn-next')),
      )
      .not.toBeNull();
    await tap(page, 'btn-next');
    await expect
      .poll(() =>
        page.evaluate(() => ({
          id: window.__FROG__!.getLevelState()?.levelId,
          phase: window.__FROG__!.getLevelState()?.phase,
        })),
      )
      .toEqual({ id: `practice-${i + 1}`, phase: 'playing' });
  }
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('frogBalance.save')!).practice,
    ),
  ).toEqual({ band: 2, streak: 0 });
  expect(
    await page.evaluate(() => window.__FROG__!.getLevelState()?.levelId),
  ).toBe('practice-3');
});

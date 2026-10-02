import { test, expect } from '@playwright/test';
import { boot, tap } from './helpers';
test('P4 flow saves stars, unlocks levels, and survives reload', async ({
  page,
}) => {
  await boot(page);
  await tap(page, 'btn-play');
  await tap(page, 'world-1');
  await tap(page, 'level-w1-l1');
  await page.evaluate(() => {
    window.__FROG__!.setFastMode(true);
    return window.__FROG__!.solveCurrent();
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.__FROG__!.getPointerTarget('btn-next')),
    )
    .not.toBeNull();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('frogBalance.save')!).levels['w1-l1']
          .bestStars,
    ),
  ).toBe(3);
  await page.reload();
  await page.evaluate(() => window.__FROG__!.ready);
  await tap(page, 'btn-play');
  await tap(page, 'world-1');
  await expect
    .poll(() =>
      page.evaluate(() => window.__FROG__!.getText('level-w1-l2-number')),
    )
    .toBe('٢');
  await tap(page, 'level-w1-l2');
  await expect
    .poll(() => page.evaluate(() => window.__FROG__!.getLevelState()?.levelId))
    .toBe('w1-l2');
});
test('throwing localStorage keeps in-memory progress and gameplay usable', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('blocked');
      },
    }),
  );
  await boot(page);
  await page.evaluate(async () => {
    const api = window.__FROG__!;
    api.setFastMode(true);
    await api.gotoLevel('w1-l1');
    await api.solveCurrent();
    await api.gotoScene('LevelSelectScene');
  });
  await tap(page, 'level-w1-l2');
  await expect
    .poll(() => page.evaluate(() => window.__FROG__!.getLevelState()?.levelId))
    .toBe('w1-l2');
});
test('six completed levels celebrate unlocking a world once', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(async () => {
    const api = window.__FROG__!;
    api.setFastMode(true);
    for (let i = 1; i <= 6; i++) {
      await api.gotoLevel(`w1-l${i}`);
      await api.solveCurrent();
    }
    await api.gotoScene('WorldMapScene');
  });
  expect(await page.evaluate(() => window.__FROG__!.events)).toContainEqual(
    expect.objectContaining({ type: 'world-unlocked', data: { worlds: [2] } }),
  );
  await tap(page, 'world-2');
  await expect
    .poll(() =>
      page.evaluate(() => window.__FROG__!.getText('level-w2-l1-number')),
    )
    .toBe('١');
});

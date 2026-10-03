import { expect, test } from '@playwright/test';
import { boot, consoleErrors, drag, tap } from './helpers';
test('full Count level played by real pointer has no console errors or warnings', async ({
  page,
}) => {
  const errors = consoleErrors(page);
  await boot(page);
  await page.evaluate(() => window.__FROG__!.unlockAll());
  await tap(page, 'btn-play');
  await tap(page, 'world-1');
  await tap(page, 'level-w1-l3');
  for (let i = 0; i < 3; i++) await drag(page, 'frog-pile', 'pan-right');
  await expect
    .poll(() => page.evaluate(() => window.__FROG__!.getLevelState()!.phase))
    .toBe('success');
  // Result has Home / Replay / Next only; free play is reached from the map.
  await expect
    .poll(() =>
      page.evaluate(() => window.__FROG__!.getPointerTarget('btn-home')),
    )
    .not.toBeNull();
  await tap(page, 'btn-home');
  await expect
    .poll(() =>
      page.evaluate(() => window.__FROG__!.getPointerTarget('btn-sandbox')),
    )
    .not.toBeNull();
  await tap(page, 'btn-sandbox');
  await tap(page, 'btn-read');
  expect(errors).toEqual([]);
});

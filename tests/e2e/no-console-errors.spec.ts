import { expect, test } from '@playwright/test';
import { boot, consoleErrors, drag, tap } from './helpers';
test('full Count level played by real pointer has no console errors or warnings', async ({
  page,
}) => {
  const errors = consoleErrors(page);
  await boot(page);
  await tap(page, 'btn-play');
  await tap(page, 'level-w1-l3');
  for (let i = 0; i < 3; i++) await drag(page, 'frog-pile', 'pan-right');
  await expect
    .poll(() => page.evaluate(() => window.__FROG__!.getLevelState()!.phase))
    .toBe('success');
  await page.waitForTimeout(1850);
  await tap(page, 'btn-sandbox');
  await tap(page, 'btn-read');
  expect(errors).toEqual([]);
});

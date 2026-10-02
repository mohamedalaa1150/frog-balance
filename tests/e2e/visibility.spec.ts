import { test, expect } from '@playwright/test';
import { boot } from './helpers';
test('visibility pauses the hint idle clock and resumes gameplay', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(() => window.__FROG__!.gotoLevel('w1-l3'));
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const state = await page.evaluate(() => window.__FROG__!.getLevelState()!);
  // Stay hidden longer than the default 12-second idle-hint deadline.
  await page.waitForTimeout(13000);
  expect(
    (await page.evaluate(() => window.__FROG__!.getLevelState()!)).now,
  ).toBe(state.now);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect
    .poll(() => page.evaluate(() => window.__FROG__!.getLevelState()!.now))
    .toBeGreaterThan(state.now);
  const resumed = await page.evaluate(() => window.__FROG__!.getLevelState()!);
  expect(resumed.now - state.now).toBeLessThan(1200);
  expect(resumed.hintLevel).toBe(0);
});

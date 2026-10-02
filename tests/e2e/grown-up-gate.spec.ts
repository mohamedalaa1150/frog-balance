import { test, expect } from '@playwright/test';
import { boot, tap, target } from './helpers';
test('only an uninterrupted three-second hold opens the grown-up area', async ({
  page,
}) => {
  await boot(page);
  await tap(page, 'btn-lock');
  await tap(page, 'gate-lock');
  expect(
    await page.evaluate(() =>
      window.__FROG__!.getPointerTarget('setting-numerals'),
    ),
  ).toBeNull();
  let point = await target(page, 'gate-lock');
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.waitForTimeout(1500);
  await page.mouse.up();
  await page.mouse.down();
  await page.waitForTimeout(2000);
  expect(
    await page.evaluate(() =>
      window.__FROG__!.getPointerTarget('setting-numerals'),
    ),
  ).toBeNull();
  await page.mouse.up();
  point = await target(page, 'gate-lock');
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          window.__FROG__!.getPointerTarget('setting-numerals'),
        ),
      { timeout: 6000 },
    )
    .not.toBeNull();
  await page.mouse.up();
});

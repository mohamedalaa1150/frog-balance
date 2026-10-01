import { expect, test } from '@playwright/test';

test('production preview does not expose the API without test=1', async ({
  page,
}) => {
  for (const url of ['/', '/?test=0', '/?test=true']) {
    await page.goto(url);
    await expect(page.locator('#game > canvas')).toBeVisible();
    await page.waitForFunction(() => document.fonts.status === 'loaded');
    expect(await page.evaluate(() => '__FROG__' in window)).toBe(false);
  }
});

test('production preview exposes the API with test=1', async ({ page }) => {
  await page.goto('/?test=1');
  await page.waitForFunction(() => !!window.__FROG__);
  await page.evaluate(() => window.__FROG__!.ready);
  expect(await page.evaluate(() => typeof window.__FROG__!.gotoScene)).toBe(
    'function',
  );
  expect(
    await page.evaluate(() => Array.isArray(window.__FROG__!.events)),
  ).toBe(true);
});

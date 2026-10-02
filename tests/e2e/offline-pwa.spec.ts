import { test, expect } from '@playwright/test';
import { boot } from './helpers';
test('after precaching, offline reload can play a complete level', async ({
  page,
  context,
}) => {
  await boot(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), {
      timeout: 20000,
    })
    .toBe(true);
  const manifest = await page.evaluate(async () => {
    const url = document.querySelector<HTMLLinkElement>(
      'link[rel="manifest"]',
    )!.href;
    return (await fetch(url)).json();
  });
  expect(manifest).toMatchObject({
    lang: 'ar',
    dir: 'rtl',
    display: 'standalone',
  });
  expect(manifest.icons).toHaveLength(3);
  await context.setOffline(true);
  // Reload through the document so WebKit's protocol reload cannot bypass its SW.
  await Promise.all([
    page.waitForEvent('domcontentloaded'),
    page.evaluate(() => location.reload()),
  ]);
  await page.waitForFunction(() => !!window.__FROG__);
  await page.evaluate(() => window.__FROG__!.ready);
  await page.evaluate(async () => {
    const api = window.__FROG__!;
    api.setFastMode(true);
    await api.gotoLevel('w6-l3');
    await api.solveCurrent();
  });
  expect(
    await page.evaluate(() => window.__FROG__!.getLevelState()?.phase),
  ).toBe('success');
});

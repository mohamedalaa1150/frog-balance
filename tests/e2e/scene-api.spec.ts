import { expect, test, type Page } from '@playwright/test';

async function boot(page: Page) {
  await page.goto('/?test=1');
  await page.waitForFunction(() => !!window.__FROG__);
  await page.evaluate(() => window.__FROG__!.ready);
}

test('repeated title navigation and a non-title BaseScene render successfully', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(async () => {
    await window.__FROG__!.gotoScene('TitleScene');
    await window.__FROG__!.gotoScene('TitleScene');
    await window.__FROG__!.gotoScene('TestReadyScene');
  });
  const events = await page.evaluate(() =>
    window.__FROG__!.events.filter((event) => event.type === 'scene-ready'),
  );
  expect(
    events.filter(
      (event) => (event.data as { key: string }).key === 'TitleScene',
    ),
  ).toHaveLength(3);
  expect(events[events.length - 1]).toMatchObject({
    data: { key: 'TestReadyScene' },
  });
  await page.evaluate(() => window.__FROG__!.gotoScene('TitleScene'));
});

test('unknown scenes reject clearly', async ({ page }) => {
  await boot(page);
  await expect(
    page.evaluate(() => window.__FROG__!.gotoScene('DoesNotExist')),
  ).rejects.toThrow('Unknown scene');
});

test('a scene without readiness times out after ten seconds and allows recovery', async ({
  page,
}) => {
  test.setTimeout(25_000);
  await boot(page);
  const started = Date.now();
  await expect(
    page.evaluate(() => window.__FROG__!.gotoScene('TestSilentScene')),
  ).rejects.toThrow(
    'Scene readiness timed out after 10000 ms: TestSilentScene',
  );
  expect(Date.now() - started).toBeGreaterThanOrEqual(9500);
  expect(Date.now() - started).toBeLessThan(12_000);
  await page.evaluate(() => window.__FROG__!.gotoScene('TitleScene'));
  await expect(page.locator('#game > canvas')).toBeVisible();
});

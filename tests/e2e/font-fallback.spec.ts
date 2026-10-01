import { expect, test, type Page } from '@playwright/test';

async function start(page: Page) {
  await page.goto('/?test=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__FROG__);
  const started = Date.now();
  await page.evaluate(() => window.__FROG__!.ready);
  expect(Date.now() - started).toBeLessThan(5000);
  await expect(page.locator('#game > canvas')).toBeVisible();
  expect(await page.evaluate(() => window.__FROG__!.events)).toContainEqual(
    expect.objectContaining({
      type: 'ready',
      data: expect.objectContaining({ visible: true, title: 'ميزان ضفدوع' }),
    }),
  );
}

test('aborted fonts use fallback and still render the title', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route(/\.woff2?$/, (route) => route.abort());
  await start(page);
  expect(await page.evaluate(() => window.__FROG__!.events)).toContainEqual(
    expect.objectContaining({
      type: 'font-fallback',
      data: expect.objectContaining({ reason: 'failure' }),
    }),
  );
  expect(errors).toEqual([]);
});

test('one-second font delay completes without fallback', async ({ page }) => {
  await page.route(/\.woff2?$/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.continue();
  });
  await start(page);
  expect(
    await page.evaluate(() =>
      window.__FROG__!.events.some((event) => event.type === 'font-fallback'),
    ),
  ).toBe(false);
});

test('fonts delayed past the deadline render with a timeout event', async ({
  page,
}) => {
  await page.route(/\.woff2?$/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3500));
    if (!page.isClosed()) await route.continue();
  });
  await start(page);
  expect(await page.evaluate(() => window.__FROG__!.events)).toContainEqual(
    expect.objectContaining({
      type: 'font-fallback',
      data: expect.objectContaining({ reason: 'timeout' }),
    }),
  );
});

import { expect, test } from '@playwright/test';
import { boot, drag, tap } from './helpers';
test('Sandbox exposes 1–10, accepts both pans, reads their relation, and never succeeds', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(() => window.__FROG__!.gotoScene('SandboxScene'));
  for (let n = 1; n <= 10; n++)
    expect(
      await page.evaluate(
        (n) => window.__FROG__!.getPointerTarget(`tray-num-${n}`),
        n,
      ),
    ).not.toBeNull();
  await drag(page, 'tray-num-9', 'pan-left');
  await drag(page, 'tray-num-6', 'pan-right');
  await tap(page, 'btn-read');
  expect(await page.evaluate(() => window.__FROG__!.events)).toContainEqual(
    expect.objectContaining({
      type: 'read',
      data: {
        keys: ['count_09', 'phrase_greater_than', 'count_06'],
        left: 9,
        right: 6,
      },
    }),
  );
  await drag(page, 'frog-pile', 'pan-right');
  expect(
    await page.evaluate(() => window.__FROG__!.getLevelState()!.pans.right),
  ).toHaveLength(2);
  await tap(page, 'item-right-child-2');
  await page.waitForTimeout(1150);
  expect(
    await page.evaluate(() => window.__FROG__!.getLevelState()!.phase),
  ).toBe('playing');
  expect(
    await page.evaluate(() =>
      window.__FROG__!.events.filter((e) => e.type === 'success'),
    ),
  ).toHaveLength(0);
});
test('pan capacity rejects the eleventh frog and sources remain available', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(() => window.__FROG__!.gotoScene('SandboxScene'));
  test.setTimeout(60000);
  for (let i = 0; i < 11; i++) await drag(page, 'frog-pile', 'pan-left');
  expect(
    await page.evaluate(() => window.__FROG__!.getLevelState()!.pans.left),
  ).toHaveLength(10);
  expect(await page.evaluate(() => window.__FROG__!.events)).toContainEqual(
    expect.objectContaining({
      type: 'feedback',
      data: { key: 'feedback_pan_full' },
    }),
  );
  for (let i = 0; i < 10; i++)
    expect(
      await page.evaluate(
        (i) => window.__FROG__!.getPointerTarget(`item-left-child-${i}`),
        i,
      ),
    ).not.toBeNull();
});

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
        keys: ['count_06', 'phrase_less_than', 'count_09'],
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
  await drag(page, 'item-left-child-0', 'pan-right');
  expect(
    await page.evaluate(() => window.__FROG__!.getLevelState()!.pans.left),
  ).toHaveLength(0);
  expect(
    await page.evaluate(() => window.__FROG__!.getLevelState()!.pans.right),
  ).toHaveLength(2);
  expect(
    await page.evaluate(() => window.__FROG__!.getLevelState()!.dragging),
  ).toBe(false);
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
test('BUG-204: Arabic read starts with right-hand terms in placement order', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(async () => {
    const api = window.__FROG__!;
    await api.gotoScene('SandboxScene');
    api.place('number', 'left', 5);
    api.place('number', 'right', 2);
    api.place('number', 'right', 3);
  });
  await tap(page, 'btn-read');
  expect(await page.evaluate(() => window.__FROG__!.events)).toContainEqual(
    expect.objectContaining({
      type: 'read',
      data: {
        keys: [
          'count_02',
          'phrase_plus',
          'count_03',
          'phrase_equals',
          'count_05',
        ],
        left: 5,
        right: 5,
      },
    }),
  );
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

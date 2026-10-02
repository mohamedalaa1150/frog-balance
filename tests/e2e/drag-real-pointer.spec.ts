import { expect, test } from '@playwright/test';
import { boot, drag, tap, target } from './helpers';
test('real mouse drag places a copy; outside and non-work drops bounce back', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(() => window.__FROG__!.gotoLevel('w1-l3'));
  const origin = await target(page, 'frog-pile');
  await drag(page, 'frog-pile', 'pan-right');
  expect(
    await page.evaluate(() => window.__FROG__!.getLevelState()!.pans.right),
  ).toHaveLength(1);
  await drag(page, 'frog-pile', { x: origin.x, y: origin.y - 40 });
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__FROG__!.events.filter((e) => e.type === 'bounce').length,
      ),
    )
    .toBe(1);
  await page.waitForTimeout(250);
  expect(await target(page, 'frog-pile')).toEqual(origin);
  await drag(page, 'frog-pile', 'pan-left');
  expect(
    await page.evaluate(() => window.__FROG__!.getLevelState()!.pans.right),
  ).toHaveLength(1);
  expect(
    await page.evaluate(() => window.__FROG__!.getLevelState()!.pans.left),
  ).toHaveLength(1);
  expect(await page.evaluate(() => window.__FROG__!.events)).toContainEqual(
    expect.objectContaining({
      type: 'feedback',
      data: { key: 'feedback_wrong_pan' },
    }),
  );
  await tap(page, 'item-right-child-0');
  expect(
    await page.evaluate(() => window.__FROG__!.getLevelState()!.pans.right),
  ).toHaveLength(0);
  await drag(page, 'item-left-fixed-left-0', { x: origin.x, y: origin.y });
  expect(
    await page.evaluate(
      () => window.__FROG__!.getLevelState()!.pans.left[0]!.fixed,
    ),
  ).toBe(true);
  expect(await page.evaluate(() => window.__FROG__!.events)).toContainEqual(
    expect.objectContaining({
      type: 'feedback',
      data: { key: 'feedback_locked' },
    }),
  );
});
test.describe('touch taps', () => {
  test.use({ hasTouch: true });
  test('touch pile and child token use the same place and remove path', async ({
    page,
  }) => {
    await boot(page);
    await page.evaluate(() => window.__FROG__!.gotoLevel('w1-l3'));
    await tap(page, 'frog-pile', true);
    expect(
      await page.evaluate(() => window.__FROG__!.getLevelState()!.pans.right),
    ).toHaveLength(1);
    await tap(page, 'item-right-child-0', true);
    expect(
      await page.evaluate(() => window.__FROG__!.getLevelState()!.pans.right),
    ).toHaveLength(0);
  });
});
test('holding a real dragged token prevents success until a full second after release', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(async () => {
    await window.__FROG__!.gotoLevel('w1-l3');
  });
  const point = await target(page, 'frog-pile');
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 30, point.y - 30, { steps: 3 });
  await expect
    .poll(() => page.evaluate(() => window.__FROG__!.getLevelState()!.dragging))
    .toBe(true);
  await page.evaluate(() => {
    for (let i = 0; i < 3; i++) window.__FROG__!.place('frog', 'right');
  });
  await page.waitForTimeout(1250);
  expect(
    await page.evaluate(() => window.__FROG__!.getLevelState()!.phase),
  ).toBe('awaitingSettle');
  expect(
    await page.evaluate(() => window.__FROG__!.getLevelState()!.dragging),
  ).toBe(true);
  await page.mouse.up();
  await page.waitForTimeout(650);
  expect(
    await page.evaluate(() => window.__FROG__!.getLevelState()!.phase),
  ).toBe('awaitingSettle');
  await expect
    .poll(() => page.evaluate(() => window.__FROG__!.getLevelState()!.phase))
    .toBe('success');
});

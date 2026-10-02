import { expect, test } from '@playwright/test';
import { boot } from './helpers';
test('API solves w1-l3 and fast mode settles with scene timestamps', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(async () => {
    window.__FROG__!.setFastMode(true);
    await window.__FROG__!.gotoLevel('w1-l3');
    await window.__FROG__!.solveCurrent();
  });
  const state = await page.evaluate(() => window.__FROG__!.getLevelState());
  expect(state?.phase).toBe('success');
  expect(state?.pans.right).toHaveLength(3);
  expect(state!.now - state!.lastChangedAt).toBeLessThan(1000);
});
test('overshoot settles as overcount, removal waits one second, and success fires once', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(async () => {
    await window.__FROG__!.gotoLevel('w1-l3');
    for (let i = 0; i < 4; i++) window.__FROG__!.place('frog', 'right');
  });
  await expect
    .poll(() => page.evaluate(() => window.__FROG__!.getLevelState()!.errors))
    .toContain('overcount');
  expect(
    await page.evaluate(() => window.__FROG__!.getLevelState()!.attempts),
  ).toBe(1);
  await page.evaluate(() => window.__FROG__!.removeLast('right'));
  await page.waitForTimeout(650);
  expect(
    await page.evaluate(() => window.__FROG__!.getLevelState()!.phase),
  ).toBe('awaitingSettle');
  await expect
    .poll(() => page.evaluate(() => window.__FROG__!.getLevelState()!.phase))
    .toBe('success');
  await page.waitForTimeout(2100);
  expect(
    await page.evaluate(() =>
      window.__FROG__!.events.filter((e) => e.type === 'success'),
    ),
  ).toHaveLength(1);
  expect(
    await page.evaluate(() =>
      window
        .__FROG__!.events.filter((e) => e.type === 'audio')
        .map((e) => (e.data as { key: string }).key),
    ),
  ).toEqual(expect.arrayContaining(['count_01', 'count_04', 'count_03']));
  await expect
    .poll(() =>
      page.evaluate(() => window.__FROG__!.getPointerTarget('level-w1-l3')),
    )
    .not.toBeNull();
});
test('each authored Count level can be solved by the Phase 1 enumeration', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(() => window.__FROG__!.setFastMode(true));
  for (const world of [1, 2])
    for (let index = 1; index <= (world === 1 ? 8 : 5); index++) {
      await page.evaluate(async (id) => {
        await window.__FROG__!.gotoLevel(id);
        await window.__FROG__!.solveCurrent();
      }, `w${world}-l${index}`);
      expect(
        await page.evaluate(() => window.__FROG__!.getLevelState()!.phase),
      ).toBe('success');
    }
});

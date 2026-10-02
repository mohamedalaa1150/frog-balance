import { expect, test } from '@playwright/test';
import { boot, tap } from './helpers';
for (const [hints, expectedStars] of [
  [0, 3],
  [2, 2],
  [3, 1],
] as const) {
  test(`${hints} hint levels award ${expectedStars} stars and result navigation works`, async ({
    page,
  }) => {
    await boot(page);
    await page.evaluate(async (hints) => {
      const api = window.__FROG__!;
      api.setFastMode(true);
      await api.gotoLevel('w1-l8');
      for (let i = 0; i < hints; i++) api.requestHint();
    }, hints);
    // Let the scheduled count modelling action run before solving the remainder.
    if (hints === 3)
      await expect
        .poll(() =>
          page.evaluate(
            () => window.__FROG__!.getLevelState()!.pans.right.length,
          ),
        )
        .toBe(1);
    await page.evaluate(() => window.__FROG__!.solveCurrent());
    await expect
      .poll(() =>
        page.evaluate(() => window.__FROG__!.getPointerTarget('btn-next')),
      )
      .not.toBeNull();
    const result = await page.evaluate(
      () =>
        window.__FROG__!.events.find((event) => event.type === 'result')!.data,
    );
    expect(result).toMatchObject({ levelId: 'w1-l8', stars: expectedStars });
    await tap(page, 'btn-replay');
    await expect
      .poll(() => page.evaluate(() => window.__FROG__!.getLevelState()!.phase))
      .toBe('playing');
    expect(
      await page.evaluate(() => window.__FROG__!.getLevelState()!.levelId),
    ).toBe('w1-l8');
    await page.evaluate(() => window.__FROG__!.solveCurrent());
    await expect
      .poll(() =>
        page.evaluate(() => window.__FROG__!.getPointerTarget('btn-next')),
      )
      .not.toBeNull();
    await tap(page, 'btn-next');
    await expect
      .poll(() =>
        page.evaluate(() => window.__FROG__!.getLevelState()!.levelId),
      )
      .toBe('w2-l1');
    await page.evaluate(() => window.__FROG__!.solveCurrent());
    await expect
      .poll(() =>
        page.evaluate(() => window.__FROG__!.getPointerTarget('btn-next')),
      )
      .not.toBeNull();
    await tap(page, 'btn-home');
    await expect
      .poll(() =>
        page.evaluate(() => window.__FROG__!.getPointerTarget('level-w6-l8')),
      )
      .not.toBeNull();
  });
}
test('equation misconception and capacity are recorded in state and events', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(async () => {
    const api = window.__FROG__!;
    api.setFastMode(true);
    await api.gotoLevel('w6-l3');
    const level = api.getLevelState()!.level;
    const sum = level.fixed.left.reduce((n, item) => n + (item.value ?? 1), 0);
    api.place('number', 'right', sum);
  });
  await expect
    .poll(() => page.evaluate(() => window.__FROG__!.getLevelState()!.errors))
    .toContain('equalsAsResult');
  await page.evaluate(() => window.__FROG__!.place('number', 'right', 1));
  expect(
    await page.evaluate(() => window.__FROG__!.getLevelState()!.errors),
  ).toContain('capacity');
  const tags = await page.evaluate(() =>
    window
      .__FROG__!.events.filter((event) => event.type === 'error')
      .map((event) => (event.data as { tag: string }).tag),
  );
  expect(tags).toEqual(expect.arrayContaining(['equalsAsResult', 'capacity']));
});

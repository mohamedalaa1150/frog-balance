import { expect, test } from '@playwright/test';
import { boot, tap, consoleErrors } from './helpers';
import { comparisonBand } from '../../src/core/generator';

for (const id of ['w3-l1', 'w3-l7']) {
  test(`predict, unlock and reveal ${id}`, async ({ page }) => {
    const errors = consoleErrors(page);
    await boot(page);
    await page.evaluate(async (id) => {
      window.__FROG__!.setFastMode(true);
      await window.__FROG__!.gotoLevel(id);
    }, id);
    expect(await page.evaluate(() => window.__FROG__!.getBeamAngle())).toBe(0);
    expect(
      await page.evaluate(() => window.__FROG__!.isVisible('peg-lock')),
    ).toBe(true);
    for (const name of ['predict-left', 'predict-equal', 'predict-right'])
      expect(
        await page.evaluate((name) => window.__FROG__!.getBounds(name), name),
      ).not.toBeNull();
    const choice = await page.evaluate(() => {
      const state = window.__FROG__!.getLevelState()!;
      const weight = (side: 'left' | 'right') =>
        state.pans[side].reduce(
          (n, item) => n + (item.kind === 'frog' ? 1 : item.value!),
          0,
        );
      return weight('left') === weight('right')
        ? 'equal'
        : weight('left') > weight('right')
          ? 'left'
          : 'right';
    });
    await tap(page, `predict-${choice}`);
    await expect
      .poll(() => page.evaluate(() => window.__FROG__!.getLevelState()!.phase))
      .toBe('success');
    expect(
      await page.evaluate(() => window.__FROG__!.isVisible('peg-lock')),
    ).toBe(false);
    expect(
      await page.evaluate(() => window.__FROG__!.getText('equation-equals')),
    ).toBe(choice === 'equal' ? '=' : choice === 'left' ? '>' : '<');
    expect(
      (await page.evaluate(() => window.__FROG__!.events)).filter(
        (event) => event.type === 'success',
      ),
    ).toHaveLength(1);
    expect(errors).toEqual([]);
  });
}
test('wrong prediction explains from the right, keeps the difference band and completes its sibling once', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(async () => {
    window.__FROG__!.setFastMode(true);
    await window.__FROG__!.gotoLevel('w3-l1');
  });
  const before = await page.evaluate(() => window.__FROG__!.getLevelState()!);
  const left = before.pans.left[0]!.value!,
    right = before.pans.right[0]!.value!;
  await tap(page, left > right ? 'predict-right' : 'predict-left');
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__FROG__!.events.some((event) => event.type === 'sibling'),
      ),
    )
    .toBe(true);
  const state = await page.evaluate(() => window.__FROG__!.getLevelState()!);
  expect(state.phase).toBe('playing');
  expect(state.levelId).toBe('w3-l1');
  expect(state.errors).toEqual(['wrongPrediction', 'compareFlip']);
  expect(
    comparisonBand(
      Math.abs(state.pans.left[0]!.value! - state.pans.right[0]!.value!),
    ),
  ).toBe(comparisonBand(Math.abs(left - right)));
  expect(state.level.fixed).not.toEqual(before.level.fixed);
  const keys = await page.evaluate(() =>
    window
      .__FROG__!.events.filter(
        (event) =>
          event.type === 'audio' &&
          (event.data as { channel: string }).channel === 'vo',
      )
      .map((event) => (event.data as { key: string }).key),
  );
  const start = keys.indexOf('phrase_this_side_went_down_because');
  expect(keys.slice(start + 1, start + 4)).toEqual([
    `count_${String(right).padStart(2, '0')}`,
    right > left ? 'phrase_greater_than' : 'phrase_less_than',
    `count_${String(left).padStart(2, '0')}`,
  ]);
  await page.evaluate(() => window.__FROG__!.solveCurrent());
  expect(
    (await page.evaluate(() => window.__FROG__!.events)).filter(
      (event) => event.type === 'success',
    ),
  ).toHaveLength(1);
});

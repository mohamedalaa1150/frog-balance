import { expect, test } from '@playwright/test';
import { boot, drag, tap } from './helpers';
import { enumerateSolutions } from '../../src/core/levelLogic';

test('bond enforces exactly two tiles, returns new/duplicate solutions and completes the board', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(async () => {
    window.__FROG__!.setFastMode(true);
    await window.__FROG__!.gotoLevel('w4-l6');
  });
  const level = (await page.evaluate(() => window.__FROG__!.getLevelState()!))
    .level;
  if (level.mode === 'sandbox') throw new Error('Wrong mode');
  const solutions = enumerateSolutions(level);
  const first = solutions[0]!.items;
  expect(
    await page.evaluate(() => window.__FROG__!.place('frog', 'right')),
  ).toBe(false);
  const play = async (items: typeof first) => {
    for (const item of items) await tap(page, `tray-num-${item.value}`);
    await expect
      .poll(() =>
        page.evaluate(
          () => window.__FROG__!.getLevelState()!.pendingEvaluation,
        ),
      )
      .toBe(false);
  };
  await tap(page, `tray-num-${first[0]!.value}`);
  expect(
    (await page.evaluate(() => window.__FROG__!.getLevelState()!))
      .solutionsFound,
  ).toHaveLength(0);
  await tap(page, `tray-num-${first[1]!.value}`);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__FROG__!.getLevelState()!.solutionsFound.length,
      ),
    )
    .toBe(1);
  expect(
    (await page.evaluate(() => window.__FROG__!.getLevelState()!)).pans.right,
  ).toHaveLength(0);
  expect(
    await page.evaluate(() => window.__FROG__!.getText('solutions-board')),
  ).toContain('=');
  await play(first);
  expect(
    (await page.evaluate(() => window.__FROG__!.getLevelState()!))
      .solutionsFound,
  ).toHaveLength(1);
  expect(
    (await page.evaluate(() => window.__FROG__!.getLevelState()!)).pans.right,
  ).toHaveLength(0);
  expect(await page.evaluate(() => window.__FROG__!.events)).toContainEqual(
    expect.objectContaining({
      type: 'audio',
      data: { key: 'bond_already_found', channel: 'vo' },
    }),
  );
  await page.evaluate(() => window.__FROG__!.solveCurrent());
  const state = await page.evaluate(() => window.__FROG__!.getLevelState()!);
  expect(state.phase).toBe('success');
  expect(state.solutionsFound.length).toBe(
    level.goal.type === 'balanceMulti' ? level.goal.requiredSolutions : 0,
  );
  expect(
    (await page.evaluate(() => window.__FROG__!.events)).filter(
      (event) => event.type === 'success',
    ),
  ).toHaveLength(1);
});
test('bond rejects a real drop on the fixed pan', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__FROG__!.gotoLevel('w4-l2'));
  await drag(page, 'tray-num-1', 'pan-left');
  expect(await page.evaluate(() => window.__FROG__!.events)).toContainEqual(
    expect.objectContaining({
      type: 'feedback',
      data: { key: 'feedback_wrong_pan' },
    }),
  );
});

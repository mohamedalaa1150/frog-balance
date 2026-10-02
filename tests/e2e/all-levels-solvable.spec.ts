import { expect, test } from '@playwright/test';
import content from '../../content/levels.json' with { type: 'json' };
import { boot, consoleErrors } from './helpers';

test('all 48 authored levels complete exactly once through solveCurrent', async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors = consoleErrors(page);
  await boot(page);
  await page.evaluate(() => window.__FROG__!.setFastMode(true));
  for (const level of content.levels) {
    await page.evaluate(async (id) => {
      await window.__FROG__!.gotoLevel(id);
      await window.__FROG__!.solveCurrent();
      await window.__FROG__!.solveCurrent();
    }, level.id);
    const state = await page.evaluate(() => window.__FROG__!.getLevelState()!);
    expect(state.levelId).toBe(level.id);
    expect(state.phase).toBe('success');
    expect(
      (await page.evaluate(() => window.__FROG__!.events)).filter(
        (event) =>
          event.type === 'success' &&
          (event.data as { levelId: string }).levelId === level.id,
      ),
    ).toHaveLength(1);
  }
  expect(errors).toEqual([]);
});

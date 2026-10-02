import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { enumerateSolutions } from '../../src/core/levelLogic';
import { boot, consoleErrors, drag, tap } from './helpers';

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 390, height: 844 },
]) {
  test(`play all modes with real pointers at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    await page.setViewportSize(viewport);
    const errors = consoleErrors(page);
    await boot(page);
    const directory = resolve('docs/screens/phase-4');
    mkdirSync(directory, { recursive: true });
    const shot = async (mode: string, state: string) =>
      page.screenshot({
        path: resolve(
          directory,
          `${mode}-${state}-${viewport.width}x${viewport.height}.png`,
        ),
      });
    for (const id of ['w1-l3', 'w3-l1', 'w4-l6', 'w5-l6', 'w6-l3']) {
      await page.evaluate((id) => window.__FROG__!.gotoLevel(id), id);
      const level = (
        await page.evaluate(() => window.__FROG__!.getLevelState()!)
      ).level;
      if (level.mode === 'sandbox') throw new Error('Wrong mode');
      await shot(level.mode, 'start');
      const solutions = enumerateSolutions(level);
      if (level.goal.type === 'predict')
        await tap(page, `predict-${solutions[0]!.prediction}`);
      else {
        for (const solution of solutions.slice(
          0,
          level.goal.type === 'balanceMulti' ? level.goal.requiredSolutions : 1,
        )) {
          for (const item of solution.items)
            await drag(
              page,
              item.kind === 'frog' ? 'frog-pile' : `tray-num-${item.value}`,
              `pan-${level.workPan}`,
            );
          await expect
            .poll(() =>
              page.evaluate(
                () => window.__FROG__!.getLevelState()!.pendingEvaluation,
              ),
            )
            .toBe(false);
        }
      }
      await expect
        .poll(() =>
          page.evaluate(() => window.__FROG__!.getLevelState()!.phase),
        )
        .toBe('success');
      await shot(level.mode, 'success');
      await expect
        .poll(() =>
          page.evaluate(() => window.__FROG__!.getPointerTarget('btn-next')),
        )
        .not.toBeNull();
    }
    await page.evaluate(() => window.__FROG__!.gotoScene('SandboxScene'));
    await drag(page, 'tray-num-9', 'pan-left');
    await drag(page, 'tray-num-6', 'pan-right');
    await tap(page, 'btn-read');
    await shot('sandbox', 'play');
    expect(
      await page.evaluate(() => window.__FROG__!.getLevelState()!.level.mode),
    ).toBe('sandbox');
    expect(errors).toEqual([]);
  });
}

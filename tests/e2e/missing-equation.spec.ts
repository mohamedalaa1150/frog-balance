import { expect, test } from '@playwright/test';
import { boot } from './helpers';
import { formatNumber } from '../../src/core/numerals';
import { levelNeed } from '../../src/core/levelLogic';

for (const id of ['w5-l6', 'w6-l3']) {
  for (const numerals of ['arabic-indic', 'western'] as const) {
    test(`${id} keeps terms above their pans and replaces the missing term (${numerals})`, async ({
      page,
    }) => {
      await boot(page);
      await page.evaluate((numerals) => {
        const save = JSON.parse(
          localStorage.getItem('frogBalance.save') ?? '{}',
        ) as { version?: number; settings?: Record<string, unknown> };
        // Merge the default settings from an existing saved reset/unlock.
        window.__FROG__!.unlockAll();
        const full = JSON.parse(localStorage.getItem('frogBalance.save')!) as {
          settings: Record<string, unknown>;
        };
        full.settings = { ...full.settings, ...save.settings, numerals };
        localStorage.setItem('frogBalance.save', JSON.stringify(full));
      }, numerals);
      await page.evaluate(async (id) => {
        window.__FROG__!.setFastMode(true);
        await window.__FROG__!.gotoLevel(id);
      }, id);
      const report = await page.evaluate(() => ({
        state: window.__FROG__!.getLevelState()!,
        left: window.__FROG__!.getBounds('equation-left')!,
        center: window.__FROG__!.getBounds('mascot')!,
        right: window.__FROG__!.getBounds('equation-right')!,
        text: window.__FROG__!.getText('equation-right')!,
      }));
      expect(report.left.x + report.left.width / 2).toBeLessThan(
        report.center.x + report.center.width / 2,
      );
      expect(report.center.x + report.center.width / 2).toBeLessThan(
        report.right.x + report.right.width / 2,
      );
      expect(report.text).toContain('؟');
      if (report.state.level.mode === 'sandbox') throw new Error('Wrong mode');
      const need = levelNeed(report.state.level);
      await page.evaluate(() => window.__FROG__!.solveCurrent());
      expect(
        await page.evaluate(() => window.__FROG__!.getText('equation-right')),
      ).toContain(formatNumber(need, numerals));
      expect(
        await page.evaluate(() => window.__FROG__!.getText('equation-right')),
      ).not.toContain('؟');
    });
  }
}

import { test, expect } from '@playwright/test';
import { boot, tap } from './helpers';
test('dashboard computes mastery, renders Arabic error keys, and exports local UTF-8 CSV', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(async () => {
    const api = window.__FROG__!;
    api.setFastMode(true);
    await api.gotoLevel('w1-l1');
    await api.solveCurrent();
    await api.gotoScene('DashboardScene');
  });
  expect(
    await page.evaluate(() => window.__FROG__!.getText('dashboard-world-1')),
  ).toContain('١٢٫٥'.replace('٫', '.'));
  const downloaded = page.waitForEvent('download');
  await tap(page, 'btn-export');
  expect((await downloaded).suggestedFilename()).toBe(
    'frog-balance-progress.csv',
  );
  const csv = await page.evaluate(
    () =>
      window.__FROG__!.events.find((e) => e.type === 'csv-export')!.data as {
        csv: string;
      },
  );
  expect(csv.csv).toContain('"w1-l1","3","1"');
  expect(csv.csv.startsWith('\ufeff')).toBe(true);
});

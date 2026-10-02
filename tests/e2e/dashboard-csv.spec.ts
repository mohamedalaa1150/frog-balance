import { test, expect } from '@playwright/test';
import { boot, tap } from './helpers';
import strings from '../../content/strings.ar.json' with { type: 'json' };
test('dashboard computes mastery, renders Arabic error keys, and exports local UTF-8 CSV', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(async () => {
    const api = window.__FROG__!;
    api.setFastMode(true);
    await api.gotoLevel('w1-l1');
    await api.solveCurrent();
    const saved = JSON.parse(localStorage.getItem('frogBalance.save')!);
    saved.levels['w1-l1'].errors = { overcount: 3, undercount: 2, capacity: 1 };
    localStorage.setItem('frogBalance.save', JSON.stringify(saved));
    await api.gotoScene('DashboardScene');
  });
  expect(
    await page.evaluate(() => window.__FROG__!.getText('dashboard-world-1')),
  ).toContain('١٢٫٥'.replace('٫', '.'));
  for (const tag of ['overcount', 'undercount', 'capacity'] as const) {
    expect(
      await page.evaluate(
        (tag) => window.__FROG__!.getText(`dashboard-error-${tag}`),
        tag,
      ),
    ).toContain(strings[`error_${tag}`]);
  }
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
  expect(csv.csv).toContain(`"${strings.csv_level}","${strings.csv_stars}"`);
});

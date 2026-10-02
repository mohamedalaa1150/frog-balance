import { test, expect } from '@playwright/test';
import { boot } from './helpers';
for (const [width, height] of [
  [844, 390],
  [1366, 768],
  [1024, 768],
  [390, 844],
]) {
  test(`A1/A2: pan items and predictions at ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: width!, height: height! });
    await boot(page);
    for (const level of ['w1-l3', 'w2-l5', 'w6-l3', 'sandbox']) {
      await page.evaluate(async (level) => {
        const api = window.__FROG__!;
        api.setFastMode(true);
        if (level === 'sandbox') await api.gotoScene('SandboxScene');
        else await api.gotoLevel(level);
      }, level);
      if (level === 'sandbox')
        await page.evaluate(() => {
          for (let i = 0; i < 10; i++) window.__FROG__!.place('frog', 'left');
          window.__FROG__!.place('number', 'right', 10);
        });
      else if (level === 'w2-l5')
        await page.evaluate(() => {
          for (let i = 0; i < 10; i++) window.__FROG__!.place('frog', 'right');
        });
      if (width! > height! && height! < 500) {
        expect(
          (
            await page.evaluate(() =>
              window.__FROG__!.getBounds('tray-background')!,
            )
          ).height,
        ).toBeLessThanOrEqual(height! * 0.22 + 0.01);
      }
      const report = await page.evaluate(() => {
        const api = window.__FROG__!,
          s = api.getLevelState()!;
        return {
          mascot: api.getBounds('mascot')!,
          items: (['left', 'right'] as const).flatMap((side) =>
            s.pans[side].map((item) => ({
              kind: item.kind,
              bounds: api.getBounds(`item-${side}-${item.uid}`)!,
            })),
          ),
        };
      });
      for (const item of report.items) {
        expect(item.bounds.width).toBeGreaterThanOrEqual(
          item.kind === 'frog' ? 36 - 0.01 : 48 - 0.01,
        );
        if (item.kind === 'number')
          expect(item.bounds.height).toBeGreaterThanOrEqual(60 - 0.01);
      }
      if (width! >= height!)
        expect(report.mascot.height).toBeGreaterThanOrEqual(height! * 0.3);
    }
    await page.evaluate(() => window.__FROG__!.gotoLevel('w3-l1'));
    const bounds = await page.evaluate(() =>
      [
        'predict-left',
        'predict-equal',
        'predict-right',
        'mascot',
        'btn-home',
        'btn-sound',
        'btn-hint',
        'pan-left',
        'pan-right',
      ].map((name) => ({ name, b: window.__FROG__!.getBounds(name)! })),
    );
    const overlap = (
      a: (typeof bounds)[number]['b'],
      b: (typeof bounds)[number]['b'],
    ) =>
      a.x < b.x + b.width &&
      b.x < a.x + a.width &&
      a.y < b.y + b.height &&
      b.y < a.y + a.height;
    for (const a of bounds.filter((a) => a.name.startsWith('predict-')))
      for (const b of bounds)
        if (a !== b)
          expect(overlap(a.b, b.b), `${a.name} overlaps ${b.name}`).toBe(false);
  });
}

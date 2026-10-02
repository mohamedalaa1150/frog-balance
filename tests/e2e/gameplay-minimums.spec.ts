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
      // Read newly placed objects after their first render, without extra bridge calls.
      const report = await page.evaluate(async (level) => {
        const api = window.__FROG__!;
        if (level === 'sandbox') {
          for (let i = 0; i < 10; i++) api.place('frog', 'left');
          api.place('number', 'right', 10);
        } else if (level === 'w1-l3') {
          for (let i = 0; i < 3; i++) api.place('frog', 'right');
        } else if (level === 'w2-l5') {
          for (let i = 0; i < 10; i++) api.place('frog', 'right');
        }
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        const s = api.getLevelState()!;
        return {
          tray: api.getBounds('tray-background')!,
          beam: api.getBounds('beam')!,
          mascot: api.getBounds('mascot')!,
          items: (['left', 'right'] as const).flatMap((side) =>
            s.pans[side].map((item) => ({
              kind: item.kind,
              bounds: api.getBounds(`item-${side}-${item.uid}`)!,
            })),
          ),
        };
      }, level);
      expect(report.beam.width).toBeGreaterThanOrEqual(
        width! * (width! < height! ? 0.6 : height! < 500 ? 0.45 : 0.62),
      );
      if (width! < height!)
        expect(report.beam.width).toBeLessThanOrEqual(width! * 0.72);
      if (width! > height! && height! < 500) {
        expect(report.tray.height).toBeLessThanOrEqual(height! * 0.22 + 0.01);
      }
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

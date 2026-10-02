import { expect, test } from '@playwright/test';
import { boot } from './helpers';

const viewports = [
  [1366, 768],
  [844, 390],
  [390, 844],
  [768, 1024],
  [1920, 1080],
] as const;
for (const [width, height] of viewports) {
  test(`BUG-202: tallest pan stacks clear HUD and sources at ${width}×${height}`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height });
    await boot(page);
    for (const side of ['left', 'right'] as const) {
      for (const stack of ['numbers', 'frogs', 'mixed'] as const) {
        await page.evaluate(
          async ({ side, stack }) => {
            const api = window.__FROG__!;
            await api.gotoScene('SandboxScene');
            if (stack === 'numbers')
              for (const value of [10, 9, 8]) api.place('number', side, value);
            else {
              for (let i = 0; i < (stack === 'mixed' ? 6 : 10); i++)
                api.place('frog', side);
              if (stack === 'mixed')
                for (const value of [7, 6]) api.place('number', side, value);
            }
          },
          { side, stack },
        );
        await page.waitForTimeout(700);
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => resolve()),
              ),
            ),
        );
        const report = await page.evaluate((side) => {
          const api = window.__FROG__!;
          return {
            items: api
              .getLevelState()!
              .pans[side].map((item) =>
                api.getBounds(`item-${side}-${item.uid}`),
              ),
            hud: ['btn-home', 'btn-sound', 'btn-read'].map((name) =>
              api.getBounds(name)!,
            ),
            pan: api.getBounds(`pan-${side}`)!,
            sources: [
              api.getBounds('frog-pile')!,
              api.getBounds('tray-num-1')!,
            ],
          };
        }, side);
        const hudBottom = Math.max(
          ...report.hud.map((bounds) => bounds.y + bounds.height),
        );
        for (const bounds of report.items) {
          expect(bounds).not.toBeNull();
          expect(bounds!.x).toBeGreaterThanOrEqual(0);
          expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 0.01);
          expect(bounds!.y).toBeGreaterThanOrEqual(hudBottom + 8);
          expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height);
        }
        expect(report.pan.y + report.pan.height).toBeLessThanOrEqual(
          Math.min(...report.sources.map((bounds) => bounds.y)) - 8 + 0.01,
        );
      }
    }
  });
}

for (const [width, height] of [viewports[0], viewports[2]]) {
  test(`BUG-205: source sizes match the spec and fit at ${width}×${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await boot(page);
    const uiScale =
      width >= height
        ? Math.min(width / 1280, height / 720)
        : Math.min(width / 720, height / 1280);
    await page.evaluate(() => window.__FROG__!.gotoLevel('w1-l3'));
    const pile = await page.evaluate(() =>
      window.__FROG__!.getBounds('frog-pile')!,
    );
    expect(pile.width).toBeCloseTo(240 * uiScale, 2);
    expect(pile.height).toBeCloseTo(142 * uiScale, 2);
    await page.evaluate(() => window.__FROG__!.gotoScene('SandboxScene'));
    const tiles = await page.evaluate(() =>
      Array.from({ length: 10 }, (_, i) =>
        window.__FROG__!.getBounds(`tray-num-${i + 1}`)!,
      ),
    );
    for (const tile of tiles) {
      expect(tile.width).toBeCloseTo(Math.max(120 * uiScale, 64), 2);
      expect(tile.height).toBeCloseTo(Math.max(150 * uiScale, 80), 2);
      expect(tile.width).toBeGreaterThanOrEqual(64);
      expect(tile.height).toBeGreaterThanOrEqual(80);
      expect(tile.x).toBeGreaterThanOrEqual(0);
      expect(tile.x + tile.width).toBeLessThanOrEqual(width + 0.01);
      expect(tile.y + tile.height).toBeLessThanOrEqual(height);
    }
  });
}

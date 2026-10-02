import { expect, test } from '@playwright/test';
import meta from '../../public/assets/img/map_meta.json' with { type: 'json' };
import { boot } from './helpers';
import { mkdirSync } from 'node:fs';

test.use({ deviceScaleFactor: 2 });
for (const [width, height] of [
  [1366, 768],
  [844, 390],
  [390, 844],
] as const) {
  test(`BUG-403/404/405: Title and Map at ${width}x${height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await boot(page);
    const title = await page.evaluate(() => {
      const api = window.__FROG__!;
      return {
        play: api.getBounds('btn-play')!,
        visible: api.isVisible('numerals-text'),
        corners: ['btn-lock', 'btn-sandbox', 'btn-practice', 'btn-dev'].map(
          (n) => api.getBounds(n)!,
        ),
      };
    });
    expect(title.visible).toBe(false);
    expect(title.play.width).toBeGreaterThanOrEqual(96);
    expect(title.play.height).toBeGreaterThanOrEqual(96);
    for (const b of title.corners)
      expect(title.play.width).toBeGreaterThan(b.width);
    await page.waitForTimeout(700);
    expect(
      await page.evaluate(() => window.__FROG__!.getBounds('btn-play')!.width),
    ).toBeCloseTo(title.play.width, 2);
    if (
      process.env.QA_SCREENSHOTS === '1' &&
      info.project.name === 'chromium-desktop'
    ) {
      mkdirSync('docs/screens/phase-4/fix', { recursive: true });
      await page.screenshot({
        path: `docs/screens/phase-4/fix/TitleScene-${width}x${height}.png`,
        scale: 'css',
      });
    }
    await page.evaluate(() => {
      const api = window.__FROG__!;
      api.setFastMode(true);
      api.unlockAll();
      return api.gotoScene('WorldMapScene');
    });
    const map = await page.evaluate(() => {
      const api = window.__FROG__!;
      return {
        islands: Array.from({ length: 6 }, (_, i) => ({
          box: api.getBounds(`world-${i + 1}`)!,
          art: api.getBounds(`world-${i + 1}-art`)!,
          name: api.getBounds(`world-${i + 1}-label`)!,
          stars: api.getBounds(`world-${i + 1}-stars`)!,
        })),
        footer: ['btn-sandbox', 'btn-practice', 'btn-settings'].map((n) =>
          api.getBounds(n)!,
        ),
      };
    });
    const overlaps = (a: (typeof map.footer)[number], b: typeof a) =>
      a.x < b.x + b.width - 0.01 &&
      b.x < a.x + a.width - 0.01 &&
      a.y < b.y + b.height - 0.01 &&
      b.y < a.y + a.height - 0.01;
    for (const [i, island] of map.islands.entries()) {
      if (width > height) {
        const s = Math.max(width / 1680, height / 944),
          a = meta.islands[i]!;
        const x = (width - 1680 * s) / 2 + a.x * 1680 * s,
          y = (height - 944 * s) / 2 + a.y * 944 * s;
        expect(
          Math.hypot(
            island.art.x + island.art.width / 2 - x,
            island.art.y + island.art.height / 2 - y,
          ),
        ).toBeLessThanOrEqual(width * 0.06);
        expect(island.art.height).toBeGreaterThanOrEqual(height * 0.22 - 0.01);
      } else expect(island.art.width).toBeGreaterThanOrEqual(120);
      expect(island.name.height).toBeGreaterThanOrEqual(16);
      expect(island.stars.height).toBeGreaterThanOrEqual(16);
      for (const other of map.islands.slice(i + 1))
        expect(
          overlaps(island.box, other.box),
          `world ${i + 1} overlaps island`,
        ).toBe(false);
      for (const b of map.footer)
        expect(overlaps(island.box, b), `world ${i + 1} overlaps footer`).toBe(
          false,
        );
    }
    if (
      process.env.QA_SCREENSHOTS === '1' &&
      info.project.name === 'chromium-desktop'
    )
      await page.screenshot({
        path: `docs/screens/phase-4/fix/WorldMapScene-${width}x${height}.png`,
        scale: 'css',
      });
  });
}

test('BUG-403: main Play action gently pulses when motion is enabled', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await boot(page);
  const before = await page.evaluate(
    () => window.__FROG__!.getBounds('btn-play')!.width,
  );
  await page.waitForTimeout(900);
  const after = await page.evaluate(
    () => window.__FROG__!.getBounds('btn-play')!.width,
  );
  expect(after).toBeGreaterThan(before * 1.01);
});

test('BUG-404: each menu action uses the matching delivered icon', async ({
  page,
}) => {
  await boot(page);
  for (const scene of [
    'TitleScene',
    'WorldMapScene',
    'SettingsScene',
    'DashboardScene',
    'ResultScene',
  ]) {
    await page.evaluate(async (scene) => {
      const api = window.__FROG__!;
      api.setFastMode(true);
      if (scene === 'ResultScene') {
        await api.gotoLevel('w1-l3');
        await api.solveCurrent();
      } else await api.gotoScene(scene);
    }, scene);
    if (scene === 'ResultScene')
      await expect
        .poll(() =>
          page.evaluate(() => window.__FROG__!.getPointerTarget('btn-next')),
        )
        .not.toBeNull();
    const expected =
      scene === 'SettingsScene'
        ? [['btn-dashboard', 'btn_dashboard']]
        : scene === 'DashboardScene'
          ? [['btn-export', 'btn_download']]
          : scene === 'ResultScene'
            ? [['btn-sandbox', 'btn_sandbox']]
            : [
                ['btn-sandbox', 'btn_sandbox'],
                ['btn-practice', 'btn_practice'],
              ];
    for (const [name, key] of expected)
      expect(
        await page.evaluate(
          (name) => window.__FROG__!.getTextureKey(name!),
          name,
        ),
      ).toBe(key);
  }
});

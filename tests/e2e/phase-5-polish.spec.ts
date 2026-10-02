import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { boot, tap } from './helpers';
for (const [width, height] of [
  [390, 844],
  [360, 740],
  [844, 390],
  [1366, 768],
] as const) {
  test(`C-501–C-504: mascot, cap, Settings and map at ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await boot(page);
    await page.evaluate(async () => {
      window.__FROG__!.setFastMode(true);
      await window.__FROG__!.gotoLevel('w6-l3');
    });
    const balance = await page.evaluate(() => ({
      mascot: window.__FROG__!.getBounds('mascot')!,
      cap: window.__FROG__!.getBounds('pivot-cap')!,
      pans: ['pan-left', 'pan-right'].map((n) =>
        window.__FROG__!.getBounds(n)!,
      ),
    }));
    if (width < height)
      expect(balance.mascot.height).toBeGreaterThanOrEqual(
        height * 0.22 - 0.01,
      );
    expect(balance.cap.y + balance.cap.height).toBeLessThanOrEqual(
      balance.mascot.y + balance.mascot.height * 0.16,
    );
    expect(balance.pans[0]!.x + balance.pans[0]!.width).toBeLessThanOrEqual(
      balance.pans[1]!.x,
    );
    await page.evaluate(() => window.__FROG__!.gotoScene('SettingsScene'));
    const rows = await page.evaluate(() =>
      window
        .__FROG__!.getSceneBounds()
        .filter((b) => b.interactive && b.name.startsWith('setting-')),
    );
    expect(rows).toHaveLength(8);
    for (const row of rows) {
      expect(row.width).toBeGreaterThan(0);
      expect(row.height).toBeGreaterThan(0);
      if (width === 844) expect(row.height).toBeGreaterThanOrEqual(56);
    }
    await page.evaluate(() => window.__FROG__!.gotoScene('WorldMapScene'));
    const title = await page.evaluate(() =>
      window.__FROG__!.getBounds('menu-title')!,
    );
    if (width === 1366) {
      expect(title.height).toBeLessThan(40);
      expect(title.x).toBeLessThan(width / 2);
      expect(title.x + title.width).toBeGreaterThan(width / 2);
    }
  });
}
test('C-505: Dashboard percent sign follows numeral style', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(() => window.__FROG__!.gotoScene('DashboardScene'));
  expect(
    await page.evaluate(() => window.__FROG__!.getText('dashboard-world-1')),
  ).toMatch(/[٠-٩]٪/);
  await page.evaluate(() => window.__FROG__!.gotoScene('SettingsScene'));
  await tap(page, 'setting-numerals');
  await page.evaluate(() => window.__FROG__!.gotoScene('DashboardScene'));
  expect(
    await page.evaluate(() => window.__FROG__!.getText('dashboard-world-1')),
  ).toMatch(/[0-9]%/);
});
for (const [width, height] of [
  [1366, 768],
  [844, 390],
  [390, 844],
] as const) {
  test(`capture every scene for Phase 5 at ${width}x${height}`, async ({
    page,
  }, info) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await boot(page);
    await page.evaluate(() => {
      window.__FROG__!.setFastMode(true);
      window.__FROG__!.unlockAll();
    });
    for (const scene of [
      'TitleScene',
      'WorldMapScene',
      'LevelSelectScene',
      'GameScene',
      'ResultScene',
      'SandboxScene',
      'PracticeScene',
      'GrownUpGateScene',
      'SettingsScene',
      'DashboardScene',
      'DevLevelListScene',
    ]) {
      await page.evaluate(async (scene) => {
        const a = window.__FROG__!;
        if (scene === 'ResultScene') {
          await a.gotoLevel('w1-l3');
          await a.solveCurrent();
        } else if (scene === 'GameScene') await a.gotoLevel('w6-l3');
        else await a.gotoScene(scene);
      }, scene);
      if (scene === 'ResultScene')
        await expect
          .poll(() =>
            page.evaluate(() => window.__FROG__!.getPointerTarget('btn-next')),
          )
          .not.toBeNull();
      if (
        process.env.PHASE5_SCREENSHOTS === '1' &&
        info.project.name === 'chromium-desktop'
      ) {
        mkdirSync('docs/screens/phase-5', { recursive: true });
        await page.screenshot({
          path: `docs/screens/phase-5/${scene}-${width}x${height}.png`,
          scale: 'css',
        });
      }
    }
  });
}

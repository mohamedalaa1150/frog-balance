import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { boot } from './helpers';
const scenes = [
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
] as const;
for (const [width, height] of [
  [360, 640],
  [390, 844],
  [768, 1024],
  [1024, 768],
  [1366, 768],
  [1920, 1080],
  [2560, 1440],
  [844, 390],
] as const) {
  test(`every scene fits and relayouts at ${width}x${height}`, async ({
    page,
  }, info) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await boot(page);
    await page.evaluate(() => {
      window.__FROG__!.setFastMode(true);
      window.__FROG__!.unlockAll();
    });
    for (const scene of scenes) {
      await page.evaluate(async (scene) => {
        const api = window.__FROG__!;
        if (scene === 'ResultScene') {
          await api.gotoLevel('w1-l3');
          await api.solveCurrent();
        } else if (scene === 'GameScene') await api.gotoLevel('w6-l3');
        else await api.gotoScene(scene);
      }, scene);
      if (scene === 'ResultScene')
        await expect
          .poll(() =>
            page.evaluate(() => window.__FROG__!.getPointerTarget('btn-next')),
          )
          .not.toBeNull();
      const boxes = await page.evaluate(() =>
        window.__FROG__!.getSceneBounds(),
      );
      for (const b of boxes) {
        expect(b.x, `${scene}/${b.name} left`).toBeGreaterThanOrEqual(-0.01);
        expect(b.y, `${scene}/${b.name} top`).toBeGreaterThanOrEqual(-0.01);
        expect(b.x + b.width, `${scene}/${b.name} right`).toBeLessThanOrEqual(
          width + 0.01,
        );
        expect(b.y + b.height, `${scene}/${b.name} bottom`).toBeLessThanOrEqual(
          height + 0.01,
        );
      }
      const interactive = boxes.filter(
        (b) => b.interactive && !b.name.startsWith('pan-'),
      );
      for (const [i, a] of interactive.entries())
        for (const b of interactive.slice(i + 1))
          expect(
            a.x + a.width <= b.x + 0.01 ||
              b.x + b.width <= a.x + 0.01 ||
              a.y + a.height <= b.y + 0.01 ||
              b.y + b.height <= a.y + 0.01,
            `${scene}: ${a.name}/${b.name}`,
          ).toBe(true);
      if (
        info.project.name === 'chromium-desktop' &&
        [1366, 844, 390].includes(width)
      ) {
        mkdirSync('docs/screens/phase-4', { recursive: true });
        await page.screenshot({
          path: resolve(`docs/screens/phase-4/${scene}-${width}x${height}.png`),
        });
      }
    }
    // Rotate the live gameplay scene, preserving its placed state.
    await page.evaluate(() => window.__FROG__!.gotoLevel('w1-l3'));
    await page.setViewportSize({ width: height, height: width });
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.__FROG__!.getSceneBounds().find((b) => b.name === 'btn-home')
              ?.x,
        ),
      )
      .not.toBeUndefined();
    expect(
      await page.evaluate(() => window.__FROG__!.getLevelState()!.levelId),
    ).toBe('w1-l3');
  });
}

import { expect, test } from '@playwright/test';
import { boot } from './helpers';

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 390, height: 844 },
]) {
  test(`approved style B at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await boot(page);
    await page.evaluate(() => window.__FROG__!.setFastMode(true));
    const snapshot = async (name: string) => {
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      await expect(page).toHaveScreenshot(`${name}-${viewport.width}.png`, {
        maxDiffPixelRatio: 0.02,
      });
    };
    await snapshot('title');
    await page.evaluate(() => window.__FROG__!.gotoLevel('w1-l3'));
    await snapshot('count-start');
    // Hold the balanced state during its normal one-second settle, before ResultScene.
    await page.evaluate(() => {
      window.__FROG__!.setFastMode(false);
      for (let i = 0; i < 3; i++) window.__FROG__!.place('frog', 'right');
    });
    await snapshot('count-balanced');
    await page.evaluate(() => window.__FROG__!.gotoScene('SandboxScene'));
    await snapshot('sandbox');
  });
}

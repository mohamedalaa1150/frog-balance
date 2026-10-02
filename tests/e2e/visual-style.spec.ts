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
    // Seed random success subtitles after preload, keeping loader UUIDs unaffected.
    await page.evaluate(() => {
      let seed = 42;
      Math.random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      };
    });
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
    // Capture the completed balance after settling, during its Result reveal delay.
    await page.evaluate(() => {
      window.__FROG__!.setFastMode(false);
      for (let i = 0; i < 3; i++) window.__FROG__!.place('frog', 'right');
    });
    await expect
      .poll(() => page.evaluate(() => window.__FROG__!.getLevelState()?.phase))
      .toBe('success');
    await snapshot('count-balanced');
    await page.evaluate(() => window.__FROG__!.gotoScene('SandboxScene'));
    await snapshot('sandbox');
  });
}

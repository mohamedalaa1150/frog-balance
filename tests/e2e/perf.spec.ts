import { test, expect } from '@playwright/test';
import { boot, drag } from './helpers';
test('30 seconds of continuous native drags at CPU x4 average at least 55 FPS', async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(
    browserName !== 'chromium' || testInfo.project.name !== 'chromium-desktop',
    'CDP performance measurement runs once on desktop Chromium',
  );
  test.setTimeout(60000);
  await boot(page);
  await page.evaluate(() => window.__FROG__!.gotoScene('SandboxScene'));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  // Asset decoding and first-frame raster uploads are outside the sustained
  // 30-second workload; run the same throttled scene for two seconds first.
  await page.waitForTimeout(2000);
  const samples: number[] = [];
  const end = Date.now() + 30000;
  while (Date.now() < end) {
    await drag(page, 'frog-pile', 'pan-left');
    samples.push(await page.evaluate(() => window.__FROG__!.getActualFps()));
    await page.evaluate(() => window.__FROG__!.removeLast('left'));
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await cdp.detach();
  console.log(`FPS samples: ${samples.map((f) => f.toFixed(1)).join(', ')}`);
  const mean = samples.reduce((n, f) => n + f, 0) / samples.length;
  console.log(`CPU x4: ${samples.length} drags; mean ${mean.toFixed(2)} FPS`);
  expect(mean).toBeGreaterThanOrEqual(55);
});

import { consoleErrors } from './helpers';
import { expect, test, type Page } from '@playwright/test';

async function assertResolution(page: Page, dpr: number) {
  const size = await page.locator('#game > canvas').evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    return {
      width: canvas.width,
      height: canvas.height,
      cssWidth: canvas.clientWidth,
      cssHeight: canvas.clientHeight,
    };
  });
  expect(
    Math.abs(size.width - Math.round(size.cssWidth * Math.min(dpr, 2))),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs(size.height - Math.round(size.cssHeight * Math.min(dpr, 2))),
  ).toBeLessThanOrEqual(1);
  expect(size.cssWidth).toBe(page.viewportSize()!.width);
  expect(size.cssHeight).toBe(page.viewportSize()!.height);
  const title = await page.evaluate(() => {
    const data = [...window.__FROG__!.events]
      .reverse()
      .find((event) => event.type === 'title-ready')!.data as {
      titleBounds: { x: number; y: number; width: number; height: number };
    };
    const bounds = data.titleBounds;
    return {
      topLeft: window.__FROG__!.toCssPoint(bounds.x, bounds.y),
      bottomRight: window.__FROG__!.toCssPoint(
        bounds.x + bounds.width,
        bounds.y + bounds.height,
      ),
    };
  });
  expect(title.topLeft.x).toBeGreaterThanOrEqual(0);
  expect(title.topLeft.y).toBeGreaterThanOrEqual(0);
  expect(title.bottomRight.x).toBeLessThanOrEqual(size.cssWidth);
  expect(title.bottomRight.y).toBeLessThanOrEqual(size.cssHeight);
  const point = await page.evaluate(
    ({ width, height }) => window.__FROG__!.toCssPoint(width / 2, height / 2),
    size,
  );
  expect(point.x).toBeCloseTo(size.cssWidth / 2, 1);
  expect(point.y).toBeCloseTo(size.cssHeight / 2, 1);
}

for (const dpr of [1, 2, 3]) {
  test.describe(`DPR ${dpr}`, () => {
    test.use({ deviceScaleFactor: dpr, viewport: { width: 390, height: 844 } });
    test('caps physical rendering at 2x and preserves CSS coordinates on rotation', async ({
      page,
    }) => {
      const errors = consoleErrors(page);
      await page.goto('/?test=1');
      await page.waitForFunction(() => !!window.__FROG__);
      await page.evaluate(() => window.__FROG__!.ready);
      await assertResolution(page, dpr);
      for (const viewport of [
        { width: 1024, height: 768 },
        { width: 768, height: 1024 },
      ]) {
        await page.setViewportSize(viewport);
        await expect
          .poll(() =>
            page
              .locator('#game > canvas')
              .evaluate((canvas) => canvas.clientWidth),
          )
          .toBe(viewport.width);
        await page.evaluate(() => window.__FROG__!.gotoScene('TitleScene'));
        await assertResolution(page, dpr);
      }
      expect(errors).toEqual([]);
    });
  });
}

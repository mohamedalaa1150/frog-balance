import { consoleErrors } from './helpers';
import { expect, test } from '@playwright/test';
import packageInfo from '../../package.json' with { type: 'json' };

test('boots with the self-hosted Arabic title and no console errors', async ({
  page,
}) => {
  const errors = consoleErrors(page);
  await page.goto('/?test=1');
  await page.waitForFunction(() => !!window.__FROG__);
  await page.evaluate(() => window.__FROG__!.ready);
  await expect(page.locator('#game > canvas')).toBeVisible();
  const state = await page.evaluate(() => ({
    version: window.__FROG__!.version,
    events: window.__FROG__!.events,
    lang: document.documentElement.lang,
    direction: document.documentElement.dir,
    fonts: [500, 700, 800].every((weight) =>
      document.fonts.check(`${weight} 32px "Baloo Bhaijaan 2"`, document.title),
    ),
  }));
  expect(state.version).toBe(packageInfo.version);
  expect(state.lang).toBe('ar');
  expect(state.direction).toBe('rtl');
  expect(state.fonts).toBe(true);
  expect(state.events).toContainEqual(
    expect.objectContaining({
      type: 'ready',
      data: expect.objectContaining({
        scene: 'TitleScene',
        title: 'ميزان ضفدوع',
        numerals: '١٢٣٤٥٦٧٨٩١٠',
        rtl: true,
        visible: true,
        numeralProbeVisible: false,
      }),
    }),
  );
  const readyEvent = state.events.find((event) => event.type === 'ready');
  const rendered = readyEvent!.data as {
    titleBounds: { x: number; y: number; width: number; height: number };
    numeralBounds: { x: number; y: number; width: number; height: number };
    viewport: { width: number; height: number };
  };
  for (const bounds of [rendered.titleBounds, rendered.numeralBounds]) {
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(
      rendered.viewport.width,
    );
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(
      rendered.viewport.height,
    );
    expect(bounds.width).toBeGreaterThan(rendered.viewport.width * 0.15);
  }
  expect(
    await page.evaluate(() => window.__FROG__!.isVisible('numerals-text')),
  ).toBe(false);
  // ready is emitted only after TitleScene's first rendered frame.
  expect(errors).toEqual([]);
});

test('gotoScene resolves after Title is rendered again and records navigation', async ({
  page,
}) => {
  await page.goto('/?test=1');
  await page.waitForFunction(() => !!window.__FROG__);
  await page.evaluate(async () => {
    await window.__FROG__!.ready;
    await window.__FROG__!.gotoScene('TitleScene');
    await window.__FROG__!.gotoScene('BootScene');
    await window.__FROG__!.gotoScene('PreloadScene');
  });
  expect(
    await page.evaluate(
      () =>
        window.__FROG__!.events.filter((event) => event.type === 'gotoScene')
          .length,
    ),
  ).toBe(3);
  await expect(page.locator('#game > canvas')).toBeVisible();
});

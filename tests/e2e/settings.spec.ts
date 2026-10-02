import { test, expect } from '@playwright/test';
import { boot, tap, drag } from './helpers';
test('numerals, equation order, voice count, motion, idle hints and volume persist live', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(() => window.__FROG__!.gotoScene('SettingsScene'));
  await tap(page, 'setting-numerals');
  for (const name of [
    'equationDirection',
    'voCount',
    'reducedMotion',
    'idleHintSec',
  ])
    await tap(page, `setting-${name}`);
  for (const name of ['music', 'sfx', 'vo']) {
    const point = await page.evaluate(
      (name) => window.__FROG__!.getPointerTarget(`setting-${name}`)!,
      name,
    );
    await drag(page, `setting-${name}`, { x: point.x - 70, y: point.y });
  }
  const settings = await page.evaluate(
    () => JSON.parse(localStorage.getItem('frogBalance.save')!).settings,
  );
  expect(settings).toMatchObject({
    numerals: 'western',
    equationDirection: 'ltr',
    voCount: false,
    reducedMotion: 'on',
    idleHintSec: 20,
  });
  for (const channel of ['music', 'sfx', 'vo'])
    expect(settings[channel]).toBeGreaterThanOrEqual(0);
  await page.evaluate(() => window.__FROG__!.gotoLevel('w6-l3'));
  expect(
    await page.evaluate(() => window.__FROG__!.getText('equation-left')),
  ).toMatch(/[0-9]/);
  expect(
    await page.evaluate(() => window.__FROG__!.getText('equation-left')),
  ).not.toMatch(/[٠-٩]/);
  await page.evaluate(() => window.__FROG__!.gotoScene('TitleScene'));
  expect(
    await page.evaluate(() => window.__FROG__!.getText('numerals-text')),
  ).toBe('12345678910');
});
test('progress reset needs a separate confirmation action', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(() => {
    window.__FROG__!.unlockAll();
    return window.__FROG__!.gotoScene('SettingsScene');
  });
  await tap(page, 'setting-numerals');
  await tap(page, 'btn-reset');
  expect(
    await page.evaluate(() =>
      Object.keys(JSON.parse(localStorage.getItem('frogBalance.save')!).levels),
    ),
  ).toHaveLength(48);
  await tap(page, 'btn-reset');
  const reset = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('frogBalance.save')!),
  );
  expect(reset.levels).toEqual({});
  expect(reset.practice).toMatchObject({ band: 1, streak: 0 });
  expect(reset.settings.numerals).toBe('western');
});

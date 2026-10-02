import { expect, test } from '@playwright/test';
import { boot, target } from './helpers';
import strings from '../../content/strings.ar.json' with { type: 'json' };
import { THEME, tileColor, initializeTileColors } from '../../src/theme';
import tileColors from '../../public/assets/svg/tile_colors.json' with { type: 'json' };

test('button holds speak Arabic labels without activating navigation or settings', async ({
  page,
}) => {
  await boot(page);
  for (const [scene, name, key] of [
    ['TitleScene', 'btn-practice', 'ui_practice'],
    ['TitleScene', 'btn-play', 'ui_play'],
    ['WorldMapScene', 'btn-home', 'ui_home'],
    ['WorldMapScene', 'world-1', 'world_1'],
    ['LevelSelectScene', 'level-w1-l1', 'count_01'],
    ['SettingsScene', 'setting-numerals', 'settings_numerals'],
    ['SandboxScene', 'btn-home', 'ui_home'],
  ] as const) {
    await page.evaluate((scene) => window.__FROG__!.gotoScene(scene), scene);
    const point = await target(page, name);
    const count = await page.evaluate(() => window.__FROG__!.events.length);
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await expect
      .poll(() =>
        page.evaluate(
          ({ count, key }) =>
            window
              .__FROG__!.events.slice(count)
              .some(
                (e) =>
                  e.type === 'audio' &&
                  (e.data as { key?: string }).key === key,
              ),
          { count, key },
        ),
      )
      .toBe(true);
    await page.mouse.up();
    expect(strings[key]).toMatch(/[\u0600-\u06ff]/);
    await expect
      .poll(() =>
        page.evaluate((name) => window.__FROG__!.getPointerTarget(name), name),
      )
      .not.toBeNull();
    if (scene === 'SettingsScene')
      expect(
        await page.evaluate(() =>
          window.__FROG__!.getText('setting-numerals-value'),
        ),
      ).toBe(strings.numerals_arabic);
  }
});

test('all ten tile digits meet WCAG 4.5:1 contrast against cream', () => {
  initializeTileColors(tileColors);
  const luminance = (color: number) => {
    const channels = [16, 8, 0].map((shift) => {
      const c = ((color >>> shift) & 255) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return (
      channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
    );
  };
  for (let n = 1; n <= 10; n++)
    expect(
      (luminance(THEME.cream) + 0.05) / (luminance(tileColor(n)) + 0.05),
    ).toBeGreaterThanOrEqual(4.5);
});

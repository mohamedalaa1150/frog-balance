import { expect, test } from '@playwright/test';
import { boot, tap } from './helpers';

const voiceKeys = async (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    window
      .__FROG__!.events.filter((event) => event.type === 'audio')
      .map((event) => (event.data as { key: string }).key),
  );
test('idle settings trigger hint 1, then button advances visual and modelling hints with VO', async ({
  page,
}) => {
  test.setTimeout(20000);
  await boot(page);
  await page.evaluate(() => {
    window.__FROG__!.unlockAll();
    const save = JSON.parse(localStorage.getItem('frogBalance.save')!) as {
      settings: { idleHintSec: number };
    };
    save.settings.idleHintSec = 8;
    localStorage.setItem('frogBalance.save', JSON.stringify(save));
  });
  await page.evaluate(async () => {
    window.__FROG__!.setFastMode(true);
    await window.__FROG__!.gotoLevel('w1-l8');
    window.__FROG__!.place('frog', 'right');
  });
  await expect
    .poll(() => page.evaluate(() => window.__FROG__!.getHintLevel()), {
      timeout: 10000,
    })
    .toBe(1);
  await tap(page, 'btn-hint');
  expect(await page.evaluate(() => window.__FROG__!.getHintLevel())).toBe(2);
  expect(
    await page.evaluate(() => window.__FROG__!.getBounds('hint-count-right-1')),
  ).not.toBeNull();
  await tap(page, 'btn-hint');
  await expect
    .poll(() =>
      page.evaluate(() => window.__FROG__!.getLevelState()!.pans.right.length),
    )
    .toBe(2);
  expect(await voiceKeys(page)).toEqual(
    expect.arrayContaining(['hint_count_1', 'hint_count_2', 'hint_count_3']),
  );
  expect(await page.evaluate(() => window.__FROG__!.events)).toContainEqual(
    expect.objectContaining({
      type: 'hint-model',
      data: { mode: 'count', kind: 'frog' },
    }),
  );
});
for (const [id, mode] of [
  ['w4-l6', 'bond'],
  ['w5-l2', 'missing'],
  ['w6-l3', 'missing'],
] as const) {
  test(`${id} speaks all three hints and renders its visual aids`, async ({
    page,
  }) => {
    await boot(page);
    await page.evaluate(async (id) => {
      window.__FROG__!.setFastMode(true);
      await window.__FROG__!.gotoLevel(id);
      window.__FROG__!.requestHint();
      window.__FROG__!.requestHint();
    }, id);
    expect(await page.evaluate(() => window.__FROG__!.getHintLevel())).toBe(2);
    expect(
      await page.evaluate(
        (mode) =>
          window.__FROG__!.getBounds(
            mode === 'bond' ? 'hint-number-line' : 'hint-ghost-1',
          ),
        mode,
      ),
    ).not.toBeNull();
    await tap(page, 'btn-hint');
    expect(await voiceKeys(page)).toEqual(
      expect.arrayContaining([
        `hint_${mode}_1`,
        `hint_${mode}_2`,
        `hint_${mode}_3`,
      ]),
    );
    if (mode === 'bond')
      expect(
        await page.evaluate(() => window.__FROG__!.getBounds('hint-pair-1')),
      ).not.toBeNull();
    else {
      expect(
        await page.evaluate(() =>
          window.__FROG__!.getBounds('hint-ghost-count-1'),
        ),
      ).not.toBeNull();
      expect(await voiceKeys(page)).toContain('count_01');
    }
  });
}

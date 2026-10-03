import { expect, test } from '@playwright/test';
import manifest from '../../public/assets/audio/vo/manifest.json' with { type: 'json' };
import { boot, tap, consoleErrors } from './helpers';
import type { Page } from '@playwright/test';
import { verifyWebkitOriginOutage } from './webkitOriginOutage';

test('every manifest VO loads with HTTP 200 in production and no music is preloaded', async ({
  page,
}) => {
  const responses = new Map<string, number>();
  page.on('response', (response) => {
    if (response.url().includes('/audio/vo/'))
      responses.set(response.url().split('/').at(-1)!, response.status());
  });
  const errors = consoleErrors(page);
  await boot(page);
  for (const { key } of manifest.lines)
    expect(responses.get(`${key}.mp3`), key).toBe(200);
  const precache = await page.request.get('/sw.js');
  expect(await precache.text()).not.toContain('url:"assets/audio/music/');
  expect(errors).toEqual([]);
});
test('three frogs schedule counts 01→03; exact wrong 9|2 explanation; music changes 2→3; live duck and mute', async ({
  page,
}) => {
  const errors = consoleErrors(page);
  await boot(page);
  await tap(page, 'btn-play');
  await page.evaluate(async () => {
    const a = window.__FROG__!;
    a.setResultNavigation(false);
    await a.gotoLevel('w1-l4');
    a.events.length = 0;
    for (let i = 0; i < 3; i++) a.place('frog', 'right');
  });
  expect(
    await page.evaluate(() =>
      window
        .__FROG__!.events.filter((e) => e.type === 'audio-vo')
        .map((e) => (e.data as { key: string }).key),
    ),
  ).toEqual(['count_01', 'count_02', 'count_03']);
  await page.waitForTimeout(200);
  const mix = await page.evaluate(() => window.__FROG__!.getAudioState()!);
  expect(mix.voPlaying).toBe(true);
  expect(mix.musicVolume).toBeLessThanOrEqual(
    mix.musicSetting * 0.25 + 0.00001,
  );
  await tap(page, 'btn-sound');
  expect(
    await page.evaluate(() => window.__FROG__!.getAudioState()!.muted),
  ).toBe(true);
  await tap(page, 'btn-sound');
  await page.evaluate(() => window.__FROG__!.gotoLevel('w2-l1'));
  await expect
    .poll(() => page.evaluate(() => window.__FROG__!.getAudioState()!.musicKey))
    .toBe('music_worlds_1_2');
  await page.evaluate(async () => {
    await window.__FROG__!.gotoLevel('w3-l1');
    window.__FROG__!.events.length = 0;
    window.__FROG__!.predict('right');
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        window
          .__FROG__!.events.filter((e) => e.type === 'audio-vo')
          .map((e) => (e.data as { key: string }).key),
      ),
    )
    .toEqual([
      'phrase_this_side_went_down_because',
      'count_09',
      'phrase_greater_than',
      'count_02',
      'compare_try_another',
    ]);
  await expect
    .poll(() => page.evaluate(() => window.__FROG__!.getAudioState()!.musicKey))
    .toBe('music_worlds_3_4');
  await page.evaluate(async () => {
    const a = window.__FROG__!;
    await a.gotoScene('SandboxScene');
    a.place('number', 'left', 9);
    a.place('number', 'right', 2);
    a.events.length = 0;
  });
  await tap(page, 'btn-read');
  const scheduled = await page.evaluate(() =>
    window
      .__FROG__!.events.filter((e) => e.type === 'audio-vo')
      .map(
        (e) =>
          e.data as {
            key: string;
            scheduledStart: number;
            scheduledEnd: number;
          },
      ),
  );
  expect(scheduled.map((e) => e.key)).toEqual([
    'count_02',
    'phrase_less_than',
    'count_09',
  ]);
  for (let i = 1; i < scheduled.length; i++) {
    const gap = scheduled[i]!.scheduledStart - scheduled[i - 1]!.scheduledEnd;
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThanOrEqual(0.06);
  }
  expect(errors).toEqual([]);
});

test('first-visited level retains music and real VO through an offline reload', async ({
  page,
  context,
  browserName,
}) => {
  const errors = consoleErrors(page);
  const before = async (page: Page) => {
    await tap(page, 'btn-play');
    await page.evaluate(() => window.__FROG__!.gotoLevel('w1-l4'));
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.__FROG__!.events.some(
            (e) =>
              e.type === 'audio-music' &&
              (e.data as { key: string }).key === 'music_worlds_1_2',
          ),
        ),
      )
      .toBe(true);
    await expect
      .poll(() =>
        page.evaluate(async () =>
          (await (await caches.open('frog-music')).keys()).some((r) =>
            r.url.includes('music_worlds_1_2'),
          ),
        ),
      )
      .toBe(true);
  };
  const after = async (page: Page) => {
    await tap(page, 'btn-play');
    await page.evaluate(async () => {
      await window.__FROG__!.gotoLevel('w1-l4');
      window.__FROG__!.events.length = 0;
      window.__FROG__!.place('frog', 'right');
    });
    expect(
      await page.evaluate(() =>
        window.__FROG__!.events.some(
          (e) =>
            e.type === 'audio-vo' &&
            (e.data as { key: string }).key === 'count_01',
        ),
      ),
    ).toBe(true);
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.__FROG__!.events.some(
            (e) =>
              e.type === 'audio-music' &&
              (e.data as { key: string }).key === 'music_worlds_1_2',
          ),
        ),
      )
      .toBe(true);
  };
  if (browserName === 'webkit')
    await verifyWebkitOriginOutage(page, { before, after });
  else {
    await boot(page);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), {
        timeout: 20000,
      })
      .toBe(true);
    await before(page);
    await context.setOffline(true);
    await page.reload();
    await page.waitForFunction(() => !!window.__FROG__);
    await page.evaluate(() => window.__FROG__!.ready);
    await after(page);
  }
  expect(errors).toEqual([]);
});

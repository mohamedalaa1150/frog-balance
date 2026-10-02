import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { RASTER_KEYS } from '../../src/assets';
import { boot } from './helpers';
const section = readFileSync(
  new URL('../../docs/05-assets.md', import.meta.url),
  'utf8',
)
  .split('## 1.')[1]!
  .split('## 2.')[0]!;
const listed = [...section.matchAll(/`([a-z0-9_]+)`/g)]
  .map((match) => match[1]!)
  .filter((key) => key !== '_p');
const expected = [
  ...new Set([
    ...listed,
    ...RASTER_KEYS,
    ...Array.from({ length: 6 }, (_, i) => `bg_world_${i + 1}`),
    ...Array.from({ length: 6 }, (_, i) => `bg_world_${i + 1}_p`),
    ...Array.from({ length: 6 }, (_, i) => `island_${i + 1}`),
    ...Array.from({ length: 10 }, (_, i) => `num_tile_${i + 1}`),
  ]),
];
test('all documented atlas keys exist at render-scale dimensions', async ({
  page,
}) => {
  await boot(page);
  const report = (await page.evaluate(
    () =>
      window.__FROG__!.events.find(
        (event) => event.type === 'placeholder-textures',
      )!.data,
  )) as {
    renderScale: number;
    textures: { key: string; width: number; height: number }[];
  };
  expect(report.textures.map((texture) => texture.key).sort()).toEqual(
    expected.sort(),
  );
  for (const [key, w, h] of [
    ['frog_token', 128, 140],
    ['num_tile_10', 120, 150],
    ['pan', 260, 220],
    ['beam', 840, 70],
    ['bg_world_1_p', 810, 1440],
    ['mascot_sheet', 2880, 380],
  ] as const) {
    expect(report.textures.find((texture) => texture.key === key)).toEqual({
      key,
      width: w * (RASTER_KEYS.includes(key) ? 1 : report.renderScale),
      height: h * (RASTER_KEYS.includes(key) ? 1 : report.renderScale),
    });
  }
  expect(
    await page.evaluate(
      () =>
        (
          window.__FROG__!.events.find((event) => event.type === 'asset-pack')!
            .data as { missing: string[] }
        ).missing,
    ),
  ).toEqual([]);
  expect(report.textures.some((texture) => texture.key === '__MISSING')).toBe(
    false,
  );
});

test('BUG-203: every btn texture has distinct generated pixels', async ({
  page,
}) => {
  await boot(page);
  const keys = expected.filter((key) => key.startsWith('btn_'));
  const hashes = await page.evaluate(
    (keys) => keys.map((key) => window.__FROG__!.getTextureHash(key)),
    keys,
  );
  expect(hashes).not.toContain(null);
  expect(new Set(hashes).size).toBe(keys.length);
});

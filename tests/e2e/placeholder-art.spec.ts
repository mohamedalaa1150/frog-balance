import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
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
    ['frog_token', 64, 64],
    ['num_tile_10', 120, 150],
    ['pan', 240, 56],
    ['beam', 820, 36],
    ['bg_world_1_p', 720, 1280],
    ['mascot_sheet', 2880, 380],
  ] as const) {
    expect(report.textures.find((texture) => texture.key === key)).toEqual({
      key,
      width: w * report.renderScale,
      height: h * report.renderScale,
    });
  }
  expect(report.textures.some((texture) => texture.key === '__MISSING')).toBe(
    false,
  );
});

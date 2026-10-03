import { afterEach, expect, test, vi } from 'vitest';
import { getGameplayLayout } from '../../src/layout/gameplayLayout';
import { getPanGrid } from '../../src/layout/panGrid';
import type { ItemKind } from '../../src/core/types';
import { CONFIG } from '../../src/config';

afterEach(() => vi.unstubAllGlobals());
const viewports = [
  [1366, 768],
  [844, 390],
  [390, 844],
  [768, 1024],
  [1920, 1080],
  [360, 640],
] as const;
const stacks: ItemKind[][] = [
  Array(3).fill('number'),
  Array(10).fill('frog'),
  [...Array(2).fill('number'), ...Array(6).fill('frog')],
  [...Array(6).fill('frog'), ...Array(2).fill('number')],
];
test('BUG-401/402/205: width-bounded grids, beam spans and sources across viewport and DPR changes', () => {
  for (const dpr of [1, 2, 3]) {
    vi.stubGlobal('window', { devicePixelRatio: dpr });
    const r = Math.min(dpr, CONFIG.maxRenderScale);
    for (const [w, h] of viewports) {
      for (const numbers of [0, 10]) {
        const layout = getGameplayLayout(w * r, h * r, numbers, true);
        const { balance, hud, tray, pile } = layout;
        expect(balance.scale).toBeGreaterThan(0);
        expect(tray.itemWidth / r).toBeGreaterThanOrEqual(64);
        expect(tray.itemHeight / r).toBeGreaterThanOrEqual(80);
        const sourceTop = Math.min(
          numbers ? tray.top : Infinity,
          pile.y - pile.height / 2,
        );
        const portrait = w < h;
        const gridLayout = balance.grid;
        for (const stack of stacks) {
          const grid = getPanGrid(stack, gridLayout);
          for (const [i, cell] of grid.entries()) {
            expect(Math.abs(cell.x) + cell.width / 2).toBeLessThanOrEqual(
              gridLayout.width / 2 + 0.001,
            );
            expect(cell.width).toBeGreaterThanOrEqual(
              stack[i] === 'frog' ? 36 : 48,
            );
            expect(cell.height).toBeGreaterThanOrEqual(
              stack[i] === 'frog' ? (36 * 70) / 64 : 60,
            );
          }
          for (const kind of ['frog', 'number']) {
            const cells = grid.filter((_, i) => stack[i] === kind);
            const rows = new Set(cells.map((c) => c.y));
            expect(rows.size).toBeLessThanOrEqual(3);
            for (const y of rows)
              expect(cells.filter((c) => c.y === y).length).toBeLessThanOrEqual(
                kind === 'frog' ? (portrait ? 4 : 5) : portrait ? 2 : 3,
              );
          }
        }
        for (const tilt of [-20, 0, 20]) {
          const angle = (tilt * Math.PI) / 180;
          const beamWidth =
            (2 * balance.halfSpan + 40) * Math.cos(angle) +
            56 * Math.abs(Math.sin(angle));
          expect(beamWidth / w).toBeGreaterThanOrEqual(
            portrait ? 0.6 : h < 500 ? 0.45 : 0.62,
          );
          if (portrait) expect(beamWidth / w).toBeLessThanOrEqual(0.72);
          for (const side of [-1, 1]) {
            const center = w / 2 + side * balance.halfSpan * Math.cos(angle);
            expect(center - gridLayout.width / 2).toBeGreaterThanOrEqual(
              8 - 0.001,
            );
            expect(center + gridLayout.width / 2).toBeLessThanOrEqual(
              w - 8 + 0.001,
            );
          }
        }
        expect(
          balance.y / r -
            balance.halfSpan * Math.sin((22 * Math.PI) / 180) -
            20,
        ).toBeGreaterThanOrEqual(8 - 0.001);
        expect(balance.y / r - 28).toBeGreaterThanOrEqual(8 - 0.001);
        expect(sourceTop).toBeGreaterThan(hud.bottom);
        const rectangles = [
          ...tray.positions.map(({ x, y }) => ({
            x: x - tray.itemWidth / 2,
            y: y - tray.itemHeight / 2,
            width: tray.itemWidth,
            height: tray.itemHeight,
          })),
          {
            x: pile.x - pile.width / 2,
            y: pile.y - pile.height / 2,
            width: pile.width,
            height: pile.height,
          },
        ];
        for (const a of rectangles) {
          expect(a.x).toBeGreaterThanOrEqual(0);
          expect(a.y + a.height).toBeLessThanOrEqual(h * r);
          expect(a.x + a.width).toBeLessThanOrEqual(w * r);
          for (const b of rectangles) {
            if (a === b) continue;
            expect(
              a.x + a.width <= b.x + 0.001 ||
                b.x + b.width <= a.x + 0.001 ||
                a.y + a.height <= b.y + 0.001 ||
                b.y + b.height <= a.y + 0.001,
            ).toBe(true);
          }
        }
      }
    }
  }
});

test('full legal grids have no overlapping token rectangles', () => {
  for (const stack of stacks) {
    const grid = getPanGrid(stack);
    for (const [i, a] of grid.entries())
      for (const b of grid.slice(i + 1))
        expect(
          Math.abs(a.x - b.x) >= (a.width + b.width) / 2 ||
            Math.abs(a.y - b.y) >= (a.height + b.height) / 2,
        ).toBe(true);
  }
});

test('number-tray hint tallies fit beside the fixed tile in at most three portrait rows', () => {
  const grid = getPanGrid(['number', ...Array<ItemKind>(9).fill('frog')], {
    portrait: true,
    width: 144,
    frogWidth: 36,
    tileWidth: 48,
  });
  expect(Math.max(...grid.map((c) => -c.y + c.height / 2))).toBeLessThanOrEqual(
    60 + (2 * 36 * 70) / 64,
  );
  for (const [i, a] of grid.entries()) {
    expect(Math.abs(a.x) + a.width / 2).toBeLessThanOrEqual(72);
    for (const b of grid.slice(i + 1))
      expect(
        Math.abs(a.x - b.x) >= (a.width + b.width) / 2 ||
          Math.abs(a.y - b.y) >= (a.height + b.height) / 2,
      ).toBe(true);
  }
});

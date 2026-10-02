import { afterEach, expect, test, vi } from 'vitest';
import { getGameplayLayout } from '../../src/layout/gameplayLayout';
import { getPanGrid, PLACEMENT_HOP } from '../../src/layout/panGrid';
import type { ItemKind } from '../../src/core/types';

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
test('BUG-202 / BUG-205: worst-case stacks clear the HUD and sources across viewport and DPR changes', () => {
  for (const dpr of [1, 2, 3]) {
    vi.stubGlobal('window', { devicePixelRatio: dpr });
    const r = Math.min(dpr, 2);
    for (const [w, h] of viewports) {
      for (const numbers of [0, 10]) {
        const layout = getGameplayLayout(w * r, h * r, numbers, true);
        const { balance, uiScale, hud, tray, pile } = layout;
        expect(balance.scale).toBeGreaterThan(0);
        expect(tray.itemWidth / r).toBeGreaterThanOrEqual(64);
        expect(tray.itemHeight / r).toBeGreaterThanOrEqual(80);
        const sourceTop = Math.min(
          numbers ? tray.top : Infinity,
          pile.y - pile.height / 2,
        );
        for (const stack of stacks) {
          const grid = getPanGrid(stack);
          for (const tilt of [-26, 0, 26]) {
            for (const side of [-1, 1]) {
              const panX =
                balance.x +
                side *
                  balance.halfSpan *
                  Math.cos((tilt * Math.PI) / 180) *
                  balance.scale;
              const panY =
                balance.y +
                (side * balance.halfSpan * Math.sin((tilt * Math.PI) / 180) -
                  70) *
                  balance.scale;
              expect(panY + 70 * balance.scale).toBeLessThanOrEqual(
                sourceTop - 8 * uiScale + 0.001,
              );
              for (const cell of grid) {
                const left = panX + (cell.x - cell.width / 2) * balance.scale;
                const right = panX + (cell.x + cell.width / 2) * balance.scale;
                const top =
                  panY +
                  (cell.y - cell.height / 2 - PLACEMENT_HOP) * balance.scale;
                expect(left).toBeGreaterThanOrEqual(0);
                expect(right).toBeLessThanOrEqual(w * r);
                expect(top).toBeGreaterThanOrEqual(hud.bottom + 8 * uiScale);
              }
            }
          }
        }
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

import type { LevelState, ItemKind } from '../core/types';
import { canPlace } from '../core/balance';

export interface PanGridLayout {
  portrait: boolean;
  width: number;
  frogWidth: number;
  tileWidth: number;
}
export const PLACEMENT_HOP = 6;

/** A width-bounded grid shared by gameplay, practice, Sandbox and hint ghosts.
 * Mixed stacks use adjacent columns when possible, rather than adding the
 * heights of a tile row and a frog grid. Input/placement order is preserved. */
export function getPanGrid(
  kinds: readonly ItemKind[],
  layout: PanGridLayout = {
    portrait: false,
    width: 272,
    frogWidth: 48,
    tileWidth: 64,
  },
) {
  const { portrait, width, frogWidth, tileWidth } = layout;
  const frogs = kinds.filter((k) => k === 'frog').length;
  const numbers = kinds.length - frogs;
  const frogColumns = Math.min(portrait ? 4 : 5, frogs);
  const numberColumns = Math.min(portrait ? 2 : 3, numbers);
  const frogHeight = (frogWidth * 70) / 64;
  const tileHeight = tileWidth * 1.25;
  const cells: Array<{
    kind: ItemKind;
    width: number;
    height: number;
    x: number;
    y: number;
  }> = [];
  const block = (
    kind: ItemKind,
    count: number,
    columns: number,
    left: number,
  ) => {
    const w = kind === 'frog' ? frogWidth : tileWidth;
    const h = kind === 'frog' ? frogHeight : tileHeight;
    for (let i = 0; i < count; i++)
      cells.push({
        kind,
        width: w,
        height: h,
        x: left + ((i % columns) + 0.5) * w,
        y: -(Math.floor(i / columns) + 0.5) * h,
      });
  };
  if (frogs && numbers) {
    // Find a compact side-by-side packing, at most three rows for each kind.
    let best:
      { f: number; n: number; width: number; height: number } | undefined;
    for (let f = 1; f <= frogColumns; f++)
      for (let n = 1; n <= numberColumns; n++) {
        const w = f * frogWidth + n * tileWidth;
        const h = Math.max(
          Math.ceil(frogs / f) * frogHeight,
          Math.ceil(numbers / n) * tileHeight,
        );
        if (
          w <= width + 1e-6 &&
          Math.ceil(frogs / f) <= 3 &&
          Math.ceil(numbers / n) <= 3 &&
          (!best || h < best.height || (h === best.height && w < best.width))
        )
          best = { f, n, width: w, height: h };
      }
    if (!best) throw new Error('Pan grid cannot fit a legal mixed stack');
    block('number', numbers, best.n, -best.width / 2);
    block('frog', frogs, best.f, -best.width / 2 + best.n * tileWidth);
  } else {
    const count = frogs || numbers;
    const columns = frogs ? frogColumns : numberColumns;
    const w = frogs ? frogWidth : tileWidth;
    if (count)
      block(frogs ? 'frog' : 'number', count, columns, (-columns * w) / 2);
  }
  return kinds.map((kind) => {
    const index = cells.findIndex((c) => c.kind === kind);
    const cell = cells.splice(index, 1)[0]!;
    return { x: cell.x, y: cell.y, width: cell.width, height: cell.height };
  });
}

/** Enumerate legal shapes, including the authored fixed pieces and child limits. */
export function legalStacks(level: LevelState['level']): ItemKind[][] {
  if (level.mode === 'sandbox')
    return [
      Array<ItemKind>(3).fill('number'),
      Array<ItemKind>(10).fill('frog'),
      [
        ...Array<ItemKind>(2).fill('number'),
        ...Array<ItemKind>(6).fill('frog'),
      ],
    ];
  const shapes: ItemKind[][] = [];
  for (const side of ['left', 'right'] as const) {
    const fixed = level.fixed[side];
    shapes.push(fixed.map((i) => i.kind));
    if (side !== level.workPan) continue;
    for (let n = 0; n <= level.childLimits.maxNumbers; n++)
      for (let f = 0; f <= level.childLimits.maxFrogs; f++) {
        const items = [...fixed];
        let valid = true;
        for (const item of [
          ...Array.from({ length: n }, () => ({
            kind: 'number' as const,
            value: 1,
          })),
          ...Array.from({ length: f }, () => ({ kind: 'frog' as const })),
        ]) {
          if (!canPlace(items, item)) {
            valid = false;
            break;
          }
          items.push(item);
        }
        if (valid) shapes.push(items.map((i) => i.kind));
      }
  }
  return shapes;
}

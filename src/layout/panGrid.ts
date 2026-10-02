import type { LevelState } from '../core/types';
import { canPlace } from '../core/balance';
import type { ItemKind } from '../core/types';
import { CONFIG } from '../config';

/** Rendering geometry only: the reducer remains responsible for legal capacity. */
export function getPanGrid(
  kinds: readonly ItemKind[],
  cssScale = Infinity,
  wide = false,
  vertical = false,
) {
  const mixed = kinds.includes('number') && kinds.includes('frog');
  const frog = Math.max(44, 36 / cssScale);
  const mixedWidth = Math.max(55, 48 / cssScale);
  const widths = kinds.map((kind) =>
    kind === 'number'
      ? Math.max(55, 48 / cssScale)
      : Math.max(44, 36 / cssScale),
  );
  const totalWidth = widths.reduce((sum, w) => sum + w, 0);
  let cursor = -totalWidth / 2;
  let top = 0;
  return kinds.map((kind, index) => {
    if (vertical) {
      const width = widths[index]!;
      const height = kind === 'number' ? width * 1.25 : (width * 70) / 64;
      const cell = { width, height, x: 0, y: -top - height / 2 };
      top += height;
      return cell;
    }
    if (mixed && wide) {
      const width = widths[index]!;
      const x = cursor + width / 2;
      cursor += width;
      const height = kind === 'number' ? width * 1.25 : (width * 70) / 64;
      return { width, height, x, y: -height / 2 };
    }
    if (mixed)
      return {
        width: mixedWidth,
        height: kind === 'number' ? mixedWidth * 1.25 : (mixedWidth * 70) / 64,
        x: ((index % 4) - (Math.min(4, kinds.length) - 1) / 2) * mixedWidth,
        y: (-mixedWidth * 1.25) / 2 - Math.floor(index / 4) * mixedWidth * 1.25,
      };
    if (kind === 'number') {
      const width = Math.max(kinds.length === 3 ? 70 : 88, 48 / cssScale);
      return {
        width,
        height: width * 1.25,
        x: (index - (kinds.length - 1) / 2) * width,
        y: (-width * 1.25) / 2,
      };
    }
    return {
      width: frog,
      height: (frog * 70) / 64,
      x: ((index % 5) - (Math.min(5, kinds.length) - 1) / 2) * frog,
      y: (-frog * 70) / 128 - (Math.floor(index / 5) * frog * 70) / 64,
    };
  });
}

export const PLACEMENT_HOP = 12;
const tallestGrids = [
  Array<ItemKind>(CONFIG.capacity.numbers).fill('number'),
  Array<ItemKind>(CONFIG.capacity.frogs).fill('frog'),
  [
    ...Array<ItemKind>(CONFIG.capacity.mixedFrogs).fill('frog'),
    ...Array<ItemKind>(CONFIG.capacity.mixedNumbers).fill('number'),
  ],
].flatMap((kinds) => getPanGrid(kinds));
export const PAN_STACK_RISE =
  Math.max(...tallestGrids.map((cell) => -cell.y + cell.height / 2)) +
  PLACEMENT_HOP;
export const PAN_STACK_HALF_WIDTH = Math.max(
  ...tallestGrids.map((cell) => Math.abs(cell.x) + cell.width / 2),
);

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

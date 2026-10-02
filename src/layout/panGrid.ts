import type { ItemKind } from '../core/types';
import { CONFIG } from '../config';

/** Rendering geometry only: the reducer remains responsible for legal capacity. */
export function getPanGrid(kinds: readonly ItemKind[]) {
  const mixed = kinds.includes('number') && kinds.includes('frog');
  return kinds.map((kind, index) => {
    if (mixed)
      return {
        width: 55,
        height: kind === 'number' ? 69 : 60,
        x: ((index % 4) - (Math.min(4, kinds.length) - 1) / 2) * 55,
        y: -34.5 - Math.floor(index / 4) * 70,
      };
    if (kind === 'number') {
      const width = kinds.length === 3 ? 70 : 88;
      return {
        width,
        height: width * 1.25,
        x: (index - (kinds.length - 1) / 2) * width,
        y: (-width * 1.25) / 2,
      };
    }
    return {
      width: 44,
      height: 48,
      x: ((index % 5) - (Math.min(5, kinds.length) - 1) / 2) * 44,
      y: -24 - Math.floor(index / 5) * 48,
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
].flatMap(getPanGrid);
export const PAN_STACK_RISE =
  Math.max(...tallestGrids.map((cell) => -cell.y + cell.height / 2)) +
  PLACEMENT_HOP;
export const PAN_STACK_HALF_WIDTH = Math.max(
  ...tallestGrids.map((cell) => Math.abs(cell.x) + cell.width / 2),
);

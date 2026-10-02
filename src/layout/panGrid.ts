import type { ItemKind } from '../core/types';
import { CONFIG } from '../config';

/** Rendering geometry only: the reducer remains responsible for legal capacity. */
export function getPanGrid(kinds: readonly ItemKind[]) {
  const mixed = kinds.includes('number') && kinds.includes('frog');
  return kinds.map((kind, index) => {
    if (mixed)
      return {
        width: 64,
        height: kind === 'number' ? 80 : 64,
        x: ((index % 4) - (Math.min(4, kinds.length) - 1) / 2) * 64,
        y: -50 - Math.floor(index / 4) * 88,
      };
    if (kind === 'number') {
      const width = kinds.length === 3 ? 72 : 88;
      return {
        width,
        height: 96,
        x: (index - (kinds.length - 1) / 2) * width,
        y: -65,
      };
    }
    return {
      width: 64,
      height: 64,
      x: ((index % 5) - (Math.min(5, kinds.length) - 1) / 2) * 64,
      y: -54 - Math.floor(index / 5) * 64,
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

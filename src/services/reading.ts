import { panWeight } from '../core/balance';
import type { PlacedItem, Side } from '../core/types';

/** Arabic speech starts at the right pan. Terms keep placement order, including
 * totals <= 20; the comparison still describes the complete pan weights. */
export function composePanReading(pans: Record<Side, readonly PlacedItem[]>) {
  const left = panWeight(pans.left),
    right = panWeight(pans.right);
  const keysFor = (side: Side): string[] =>
    pans[side].length
      ? pans[side].flatMap((item, i) => [
          ...(i ? ['phrase_plus'] : []),
          `count_${String(item.kind === 'frog' ? 1 : item.value).padStart(2, '0')}`,
        ])
      : ['count_00'];
  const relation =
    right === left
      ? 'phrase_equals'
      : right > left
        ? 'phrase_greater_than'
        : 'phrase_less_than';
  return {
    keys: [...keysFor('right'), relation, ...keysFor('left')],
    left,
    right,
  };
}

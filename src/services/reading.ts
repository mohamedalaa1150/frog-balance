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

/** Predictions explain the heavier pan first, independently of reading direction. */
export function composePredictionExplanation(
  pans: Record<Side, readonly PlacedItem[]>,
) {
  const left = panWeight(pans.left),
    right = panWeight(pans.right);
  const equal = left === right;
  const heavier: Side | null = equal ? null : left > right ? 'left' : 'right';
  const count = (n: number) => `count_${String(n).padStart(2, '0')}`;
  return {
    left,
    right,
    heavier,
    keys: [
      equal
        ? 'phrase_they_are_equal_because'
        : 'phrase_this_side_went_down_because',
      count(Math.max(left, right)),
      equal ? 'phrase_equals' : 'phrase_greater_than',
      count(Math.min(left, right)),
    ],
  };
}

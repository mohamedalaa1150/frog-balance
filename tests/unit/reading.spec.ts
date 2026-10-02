import { expect, test } from 'vitest';
import { composePanReading } from '../../src/services/reading';
import type { PlacedItem } from '../../src/core/types';
const numbers = (...values: number[]): PlacedItem[] =>
  values.map((value, i) => ({
    kind: 'number',
    value,
    uid: `child-${i}`,
    order: i,
    fixed: false,
  }));
test('BUG-204: comparison is spoken from the right pan’s point of view', () => {
  expect(composePanReading({ left: numbers(9), right: numbers(6) })).toEqual({
    keys: ['count_06', 'phrase_less_than', 'count_09'],
    left: 9,
    right: 6,
  });
  expect(
    composePanReading({ left: numbers(6), right: numbers(9) }).keys,
  ).toEqual(['count_09', 'phrase_greater_than', 'count_06']);
});
test('terms always retain placement order, for small and large totals', () => {
  expect(
    composePanReading({ left: numbers(5), right: numbers(2, 3) }).keys,
  ).toEqual([
    'count_02',
    'phrase_plus',
    'count_03',
    'phrase_equals',
    'count_05',
  ]);
  expect(
    composePanReading({ left: numbers(9), right: numbers(10, 9, 8) }).keys,
  ).toEqual([
    'count_10',
    'phrase_plus',
    'count_09',
    'phrase_plus',
    'count_08',
    'phrase_greater_than',
    'count_09',
  ]);
});
test('empty pans read zero and frog terms read one', () => {
  expect(composePanReading({ left: [], right: [] }).keys).toEqual([
    'count_00',
    'phrase_equals',
    'count_00',
  ]);
  expect(
    composePanReading({
      left: [],
      right: [{ uid: 'child-0', kind: 'frog', fixed: false, order: 0 }],
    }).keys,
  ).toEqual(['count_01', 'phrase_greater_than', 'count_00']);
});

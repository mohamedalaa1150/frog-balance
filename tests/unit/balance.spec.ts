import { expect, it } from 'vitest';
import {
  beamAngle,
  canPlace,
  diff,
  isBalanced,
  panWeight,
  weightOf,
  withinCapacity,
} from '../../src/core/balance';
import type { ItemSpec } from '../../src/core/types';
const frog: ItemSpec = { kind: 'frog' };
const n: ItemSpec = { kind: 'number', value: 7 };
const pan = (numbers: number, frogs: number): ItemSpec[] => [
  ...Array.from({ length: numbers }, () => n),
  ...Array.from({ length: frogs }, () => frog),
];
it.each([
  [0, 0],
  [1, 6],
  [-1, -6],
  [2, 9],
  [-2, -9],
  [5, 18],
  [-5, -18],
  [9, 20],
  [-9, -20],
])('angle %s => %s', (d, a) => expect(beamAngle(d)).toBe(a));
it('supports injected beam constants', () =>
  expect(beamAngle(-2, { base: 1, step: 2, maxAngle: 10 })).toBe(-3));
it.each([
  [frog, 1],
  [n, 7],
] as const)('weights %j', (item, weight) =>
  expect(weightOf(item)).toBe(weight),
);
it('weights empty/mixed pans and preserves signed screen sides', () => {
  expect(panWeight([])).toBe(0);
  expect(panWeight([frog, n])).toBe(8);
  expect(diff([n], [frog])).toBe(-6);
  expect(diff([frog], [n])).toBe(6);
  expect(isBalanced([n], pan(0, 7))).toBe(true);
  expect(isBalanced([n], [])).toBe(false);
});
it.each([
  [3, 0, true],
  [4, 0, false],
  [0, 10, true],
  [0, 11, false],
  [2, 6, true],
  [3, 1, false],
  [1, 7, false],
  [0, 0, true],
])('capacity %s numbers %s frogs', (numbers, frogs, ok) =>
  expect(withinCapacity(pan(numbers as number, frogs as number))).toBe(ok),
);
it.each([
  [2, 0, n, true],
  [3, 0, n, false],
  [0, 9, frog, true],
  [0, 10, frog, false],
  [2, 5, frog, true],
  [2, 6, frog, false],
  [0, 7, n, false],
  [3, 0, frog, false],
] as const)('placing with capacity %s %s', (numbers, frogs, item, ok) =>
  expect(canPlace(pan(numbers, frogs), item)).toBe(ok),
);
it('accepts custom capacity', () =>
  expect(
    withinCapacity([frog], {
      numbers: 1,
      frogs: 0,
      mixedNumbers: 0,
      mixedFrogs: 0,
    }),
  ).toBe(false));
it('placement accepts injected capacity constants', () => {
  expect(
    canPlace([], frog, {
      numbers: 1,
      frogs: 0,
      mixedNumbers: 1,
      mixedFrogs: 1,
    }),
  ).toBe(false);
});

import { describe, expect, it } from 'vitest';
import { formatNumber } from '../../src/core/numerals';

describe('formatNumber', () => {
  it.each([
    [0, '٠'],
    [1, '١'],
    [2, '٢'],
    [3, '٣'],
    [4, '٤'],
    [5, '٥'],
    [6, '٦'],
    [7, '٧'],
    [8, '٨'],
    [9, '٩'],
    [10, '١٠'],
    [1234567890, '١٢٣٤٥٦٧٨٩٠'],
    [-12.5, '-١٢.٥'],
    [1e21, '١e+٢١'],
  ])('converts %s to %s', (value, expected) => {
    expect(formatNumber(value, 'arabic-indic')).toBe(expected);
  });
  it.each([0, 10, 1234567890, -12.5, 1e21])('preserves western %s', (value) => {
    expect(formatNumber(value, 'western')).toBe(String(value));
  });
  it('formats the title sequence through the same function', () => {
    expect(
      Array.from({ length: 10 }, (_, i) =>
        formatNumber(i + 1, 'arabic-indic'),
      ).join(''),
    ).toBe('١٢٣٤٥٦٧٨٩١٠');
  });
});

import { formatEquation } from '../../src/core/numerals';
it.each(['arabic-indic', 'western'] as const)(
  'equation retains pan/placement alignment with %s digits',
  (system) => {
    const result = formatEquation([3, 4], [5, '?'], system);
    expect(result.left).toEqual({
      side: 'left',
      terms: system === 'western' ? ['3', '4'] : ['٣', '٤'],
      text: system === 'western' ? '3 + 4' : '٣ + ٤',
      direction: 'rtl',
    });
    expect(result.center).toBe('=');
    expect(result.right.side).toBe('right');
    expect(result.right.terms.at(-1)).toBe('؟');
    expect(result.right.text).toBe(system === 'western' ? '5 + ؟' : '٥ + ؟');
  },
);
it('formats empty, solved and repeated equation terms without mutating', () => {
  const left = [10, 2];
  const right = [1, 1];
  expect(formatEquation(left, right, 'western').left.terms).toEqual([
    '10',
    '2',
  ]);
  expect(left).toEqual([10, 2]);
  expect(formatEquation([], [], 'arabic-indic').left.text).toBe('');
  expect(formatEquation([10], [5, 5], 'arabic-indic').right.text).toBe('٥ + ٥');
});

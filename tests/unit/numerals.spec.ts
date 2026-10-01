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

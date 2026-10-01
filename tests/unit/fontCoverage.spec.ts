import { expect, it } from 'vitest';
import { coversText, failedFontRequest } from '../../src/services/fontCoverage';

it('selects the Arabic subset for the title and ignores whitespace-only Latin coverage', () => {
  expect(coversText('U+0600-06FF, U+0750-077F', 'ميزان ضفدوع ١٢٣')).toBe(true);
  expect(coversText('U+0000-00FF', 'ميزان ضفدوع ١٢٣')).toBe(false);
  expect(coversText('U+0102-0103, U+1EA0-1EF9', 'ميزان ضفدوع')).toBe(false);
});

it('distinguishes failed font resources from successful/cache hits and unrelated entries', () => {
  expect(
    failedFontRequest(
      { name: '/font.woff2', startTime: 20, decodedBodySize: 0 },
      10,
    ),
  ).toBe(true);
  expect(
    failedFontRequest(
      { name: '/font.woff', startTime: 20, decodedBodySize: 0 },
      10,
    ),
  ).toBe(true);
  expect(
    failedFontRequest(
      { name: '/font.woff2?v=1', startTime: 20, decodedBodySize: 100 },
      10,
    ),
  ).toBe(false);
  expect(
    failedFontRequest(
      { name: '/font.woff2', startTime: 5, decodedBodySize: 0 },
      10,
    ),
  ).toBe(false);
  expect(
    failedFontRequest(
      { name: '/app.js', startTime: 20, decodedBodySize: 0 },
      10,
    ),
  ).toBe(false);
});

it('supports wildcard and singleton CSS unicode ranges', () => {
  expect(coversText('U+6??', '١')).toBe(true);
  expect(coversText('U+0661', '١')).toBe(true);
  expect(coversText('U+0661', '٢')).toBe(false);
  expect(coversText('invalid', '١')).toBe(false);
});

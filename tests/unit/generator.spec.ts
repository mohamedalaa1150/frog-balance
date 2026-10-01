import { expect, it } from 'vitest';
import { adaptBand, generateLevel } from '../../src/core/generator';
import type { PracticeMode } from '../../src/core/generator';
import { Level } from '../../src/core/levelSchema';
import { isSolvable, levelNeed } from '../../src/core/levelLogic';
import { mulberry32 } from '../../src/core/rng';
import { hasString } from '../../src/services/strings';
const modes: PracticeMode[] = [
  'count',
  'compare',
  'bond',
  'missing',
  'equation',
];
it.each(modes)(
  '1000 seeds: %s levels are strict, deterministic, solvable and unlocked',
  (mode) => {
    for (let seed = 0; seed < 1000; seed++) {
      const band = (seed % 10) + 1;
      const level = generateLevel(seed, [mode], band, seed);
      expect(Level.safeParse(level).success).toBe(true);
      expect(isSolvable(level)).toBe(true);
      expect(level).toEqual(generateLevel(seed, [mode], band, seed));
      expect(level.id).toBe(`practice-${seed}`);
      expect(level.mode).toBe(mode);
      expect(hasString(level.vo.intro)).toBe(true);
      if (mode === 'compare')
        expect(
          Math.abs(level.fixed.left[0]!.value! - level.fixed.right[0]!.value!),
        ).toBeLessThanOrEqual(band);
      else expect(levelNeed(level)).toBeGreaterThan(0);
    }
  },
);
it('selects only unlocked modes and validates parameters', () => {
  const seen = new Set<PracticeMode>();
  for (let seed = 0; seed < 100; seed++)
    seen.add(generateLevel(seed, modes).mode);
  expect(seen).toEqual(new Set(modes));
  expect(() => generateLevel(0, [])).toThrow('unlocked');
  for (const index of [-1, 0.5, Infinity])
    expect(() => generateLevel(0, modes, 1, index)).toThrow('index');
  expect(generateLevel(1, ['count'], 0)).toEqual(
    generateLevel(1, ['count'], 1),
  );
  expect(generateLevel(1, ['count'], 100)).toEqual(
    generateLevel(1, ['count'], 10),
  );
  expect(() => generateLevel(0, ['sandbox' as PracticeMode])).toThrow();
  expect(() => generateLevel(0, ['count'], NaN)).toThrow();
});
it.each([
  [{ band: 3, streak: 0 }, true, { band: 3, streak: 1 }],
  [{ band: 3, streak: 2 }, true, { band: 4, streak: 0 }],
  [{ band: 3, streak: -1 }, false, { band: 2, streak: 0 }],
  [{ band: 3, streak: -1 }, true, { band: 3, streak: 1 }],
  [{ band: 3, streak: 2 }, false, { band: 3, streak: -1 }],
  [{ band: 10, streak: 2 }, true, { band: 10, streak: 0 }],
  [{ band: 1, streak: -1 }, false, { band: 1, streak: 0 }],
] as const)('adapts %j correct=%s', (state, correct, result) =>
  expect(adaptBand(state, correct)).toEqual(result),
);
it('signed consecutive streaks reach adaptive thresholds', () => {
  let s = { band: 4, streak: 0 };
  for (let i = 0; i < 3; i++) s = adaptBand(s, true);
  expect(s).toEqual({ band: 5, streak: 0 });
  for (let i = 0; i < 2; i++) s = adaptBand(s, false);
  expect(s).toEqual({ band: 4, streak: 0 });
});
it('mulberry32 reference vector, reproducibility, uint32 wrap and range', () => {
  const rng = mulberry32(1);
  expect(Array.from({ length: 3 }, () => rng())).toEqual([
    0.6270739405881613, 0.002735721180215478, 0.5274470399599522,
  ]);
  expect(mulberry32(-1)()).toBe(mulberry32(0xffffffff)());
  for (let seed = 0; seed < 1000; seed++) {
    const a = mulberry32(seed),
      b = mulberry32(seed);
    for (let j = 0; j < 10; j++) {
      const n = a();
      expect(n).toBe(b());
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  }
});

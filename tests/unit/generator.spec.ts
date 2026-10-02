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
        ).toBeGreaterThanOrEqual(
          band <= 3 ? 5 : band <= 6 ? 3 : band <= 8 ? 1 : 0,
        );
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

it('BUG-102: 500 seeds per band progress from large gaps to small/equal comparisons', () => {
  const means: number[] = [];
  for (let band = 1; band <= 10; band++) {
    const gaps: number[] = [];
    for (let seed = 0; seed < 500; seed++) {
      const level = generateLevel(seed, ['compare'], band, seed);
      const gap = Math.abs(
        level.fixed.left[0]!.value! - level.fixed.right[0]!.value!,
      );
      gaps.push(gap);
      const min = band <= 3 ? 5 : band <= 6 ? 3 : band <= 8 ? 1 : 0;
      const max = band <= 3 ? 8 : band <= 6 ? 5 : band <= 8 ? 3 : 2;
      expect(gap).toBeGreaterThanOrEqual(min);
      expect(gap).toBeLessThanOrEqual(max);
      // A sibling uses the same generator and the same difficulty band.
      const sibling = generateLevel(seed + 1000, ['compare'], band, seed + 1);
      const siblingGap = Math.abs(
        sibling.fixed.left[0]!.value! - sibling.fixed.right[0]!.value!,
      );
      expect(siblingGap).toBeGreaterThanOrEqual(min);
      expect(siblingGap).toBeLessThanOrEqual(max);
    }
    means.push(gaps.reduce((a, b) => a + b, 0) / gaps.length);
    if (band >= 9) {
      const equalCount = gaps.filter((d) => d === 0).length;
      expect(equalCount).toBeGreaterThan(0);
      expect(equalCount).toBeLessThanOrEqual(150);
    }
  }
  for (let i = 1; i < means.length; i++)
    expect(means[i]).toBeLessThanOrEqual(means[i - 1]!);
});

// Preserve challenge size, including equal questions, after a wrong prediction.
it('comparison siblings remain different and in the authored difference band', async () => {
  const { generateSibling, comparisonBand } =
    await import('../../src/core/generator');
  for (const gap of [0, 1, 2, 3, 5, 6, 9]) {
    const level = generateLevel(1, ['compare'], 5);
    level.fixed = {
      left: [{ kind: 'number', value: 10 }],
      right: [{ kind: 'number', value: 10 - gap }],
    };
    for (let seed = 0; seed < 20; seed++) {
      const sibling = generateSibling(level, seed);
      expect(sibling.id).toBe(level.id);
      expect(sibling.fixed).not.toEqual(level.fixed);
      expect(
        comparisonBand(
          Math.abs(
            sibling.fixed.left[0]!.value! - sibling.fixed.right[0]!.value!,
          ),
        ),
      ).toBe(comparisonBand(gap));
      expect(isSolvable(sibling)).toBe(true);
    }
  }
});

import { expect, it } from 'vitest';
import content from '../../content/levels.json';
import { LevelsFile } from '../../src/core/levelSchema';
import {
  classifyError,
  classifyPrediction,
  classifyRejection,
  stars,
} from '../../src/core/scoring';
import type { HintLevel } from '../../src/core/hints';
const levels = LevelsFile.parse(content).levels;
const frogs = (count: number) =>
  Array.from({ length: count }, () => ({ kind: 'frog' as const }));
it.each([
  [0, 0, 3],
  [1, 1, 2],
  [3, 2, 2],
  [3, 3, 1],
] as const)('stars %s %s', (used, max, expected) =>
  expect(stars(used, max as HintLevel)).toBe(expected),
);
it.each([
  [2, 0, []],
  [4, 1000, ['overcount']],
  [5, 0, ['overcount']],
  [6, 0, []],
  [2, 11999, []],
  [2, 12000, ['undercount']],
  [3, 20000, []],
])('count errors %s idle %s', (count, idle, expected) => {
  const level = levels.find((l) => l.id === 'w1-l3')!;
  expect(
    classifyError(
      level,
      { left: level.fixed.left, right: frogs(count as number) },
      idle as number,
    ),
  ).toEqual(expected);
});
it('supports left work-pan, disabled idle, equations and comparisons', () => {
  const level = structuredClone(levels[2]!);
  level.workPan = 'left';
  level.fixed = { left: [], right: [{ kind: 'number', value: 3 }] };
  expect(
    classifyError(
      level,
      { left: frogs(1), right: level.fixed.right },
      20000,
      0,
    ),
  ).toEqual([]);
  expect(
    classifyError(level, { left: frogs(4), right: level.fixed.right }, 1000),
  ).toEqual(['overcount']);
  const eq = levels.find((l) => l.id === 'w6-l1')!;
  expect(
    classifyError(
      eq,
      { left: eq.fixed.left, right: [{ kind: 'number', value: 9 }] },
      0,
    ),
  ).toEqual(['equalsAsResult']);
  expect(
    classifyError(eq, { left: eq.fixed.left, right: eq.fixed.right }, 0),
  ).toEqual([]);
  const compare = levels.find((l) => l.mode === 'compare')!;
  expect(classifyError(compare, compare.fixed, 100000)).toEqual([]);
  const missing = levels.find((l) => l.mode === 'missing')!;
  expect(classifyError(missing, missing.fixed, 100000)).toEqual([]);
  expect(classifyRejection('capacity')).toBe('capacity');
  expect(classifyRejection('wrongPrediction')).toBe('wrongPrediction');
});

it.each([
  ['w3-l1', 'left'],
  ['w3-l2', 'right'],
  ['w3-l3', 'left'],
  ['w3-l4', 'equal'],
  ['w3-l5', 'right'],
  ['w3-l6', 'left'],
  ['w3-l7', 'equal'],
  ['w3-l8', 'left'],
] as const)('BUG-104: classifies all three choices for %s', (id, expected) => {
  const level = levels.find((l) => l.id === id)!;
  for (const choice of ['left', 'right', 'equal'] as const) {
    const tags =
      choice === expected
        ? []
        : expected !== 'equal' && choice !== 'equal'
          ? ['wrongPrediction', 'compareFlip']
          : ['wrongPrediction'];
    expect(classifyPrediction(level, choice)).toEqual(tags);
  }
});

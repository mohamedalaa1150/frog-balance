import { test, expect } from 'vitest';
import { defaults } from '../../src/core/progress';
import {
  dashboard,
  recordCompletion,
  progressCsv,
} from '../../src/core/dashboard';
import { createLevelState, applyAction } from '../../src/core/levelLogic';
import levels from '../../content/levels.json';
import { LevelsFile } from '../../src/core/levelSchema';
const level = LevelsFile.parse(levels).levels[0]!;
test('completion accumulates statistics, preserves best stars, and unlocks the next world on six completions', () => {
  let save = defaults();
  const state = createLevelState(level);
  state.errors = ['capacity', 'overcount'];
  state.attempts = 2;
  state.hintsUsed = 2;
  state.hint.maxLevel = 2;
  for (let i = 1; i <= 6; i++) {
    state.levelId = `w1-l${i}`;
    const result = recordCompletion(save, state, 123);
    save = result.save;
    expect(result.unlocked).toEqual(i === 6 ? [2] : []);
  }
  state.levelId = 'w1-l1';
  state.hintsUsed = 0;
  state.hint.maxLevel = 0;
  save = recordCompletion(save, state, 456).save;
  state.hintsUsed = 3;
  state.hint.maxLevel = 3;
  save = recordCompletion(save, state, 789).save;
  expect(save.levels['w1-l1']).toMatchObject({
    bestStars: 3,
    plays: 3,
    totalAttempts: 6,
    totalHints: 5,
    errors: { capacity: 3, overcount: 3 },
  });
  expect(dashboard(save).worlds[0]).toMatchObject({
    mastery: 75,
    averageHints: 15 / 8,
  });
  state.levelId = 'practice-0';
  expect(recordCompletion(save, state, 0).save).toEqual(save);
});
test('dashboard selects a practical recommendation for each error pattern, and handles empty progress', () => {
  expect(dashboard(defaults())).toMatchObject({
    topErrors: [],
    recommendation: 'recommend_count',
  });
  for (const [tag, recommendation] of [
    ['equalsAsResult', 'recommend_equation'],
    ['compareFlip', 'recommend_compare'],
    ['wrongPrediction', 'recommend_compare'],
    ['overcount', 'recommend_count'],
  ] as const) {
    const save = defaults();
    const state = applyAction(createLevelState(level), { type: 'requestHint' });
    state.errors = [tag];
    const data = dashboard(recordCompletion(save, state, 0).save);
    expect(data.recommendation).toBe(recommendation);
    expect(data.topErrors).toEqual([{ tag, count: 1 }]);
  }
});
test('CSV preserves UTF-8, quotes embedded commas/quotes, and protects formulas', () => {
  const save = recordCompletion(defaults(), createLevelState(level), 0).save;
  const csv = progressCsv(save, ['=formula', 'comma,field', 'a"b']);
  expect(csv).toContain('"\'=formula","comma,field","a""b"');
  expect(csv).toContain('"w1-l1","3","1","0","0","{}"');
  expect(csv.startsWith('\ufeff')).toBe(true);
});

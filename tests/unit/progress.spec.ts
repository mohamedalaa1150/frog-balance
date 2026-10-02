import { expect, it } from 'vitest';
import {
  defaults,
  isLevelUnlocked,
  isWorldUnlocked,
  migrate,
  migrateWithReport,
  SAVE_KEY,
  unlockedModes,
} from '../../src/core/progress';
import type { SaveV1 } from '../../src/core/progress';
const complete = (save: SaveV1, world: number, index: number) => {
  save.levels[`w${world}-l${index}`] = {
    bestStars: 1,
    plays: 1,
    totalAttempts: 2,
    totalHints: 0,
    errors: { overcount: 1 },
    lastPlayed: 500,
  };
};
it('defaults are independent and match expected settings', () => {
  expect(SAVE_KEY).toBe('frogBalance.save');
  const a = defaults();
  a.settings.music = 0;
  a.practice.band = 3;
  expect(defaults()).toMatchObject({
    version: 1,
    settings: {
      numerals: 'arabic-indic',
      idleHintSec: 12,
      reducedMotion: 'system',
      voCount: true,
    },
    levels: {},
    practice: { band: 1, streak: 0 },
  });
  expect(defaults().settings.music).toBe(0.3);
});
it.each([
  null,
  undefined,
  '{bad',
  42,
  [],
  true,
  { version: 99 },
  { version: '1' },
  { settings: { music: 2 } },
  { levels: { bad: {} } },
  { extra: true },
  { practice: { band: 0 } },
])('migrate corrupt %j returns defaults', (raw) =>
  expect(migrate(raw)).toEqual(defaults()),
);
it.each([0, 1, undefined])(
  'migrates version %s with progress and missing settings',
  (version) => {
    const save = defaults();
    complete(save, 1, 1);
    const raw = {
      version,
      levels: save.levels,
      settings: { numerals: 'western' },
    };
    expect(migrate(raw)).toEqual({
      ...save,
      settings: { ...save.settings, numerals: 'western' },
    });
    expect(migrate(JSON.stringify(raw))).toEqual(migrate(raw));
  },
);
it('round trips settings and catches throwing data access', () => {
  const save = defaults();
  save.settings = {
    numerals: 'western',
    idleHintSec: 0,
    reducedMotion: 'on',
    voCount: false,
    music: 0,
    sfx: 0.4,
    vo: 0.5,
  };
  save.practice = { band: 10, streak: -1 };
  complete(save, 1, 1);
  expect(migrate(JSON.stringify(save))).toEqual(save);
  expect(
    migrate({
      get version() {
        throw new Error('bad');
      },
    }),
  ).toEqual(defaults());
});
it.each([
  [1, 1, true],
  [1, 2, false],
  [2, 1, false],
  [0, 1, false],
  [7, 1, false],
  [1, 0, false],
  [1, 9, false],
  [1, 1.5, false],
])('level unlock w%s l%s => %s', (w, i, ok) =>
  expect(isLevelUnlocked(defaults(), w as number, i as number)).toBe(ok),
);
it('one star unlocks next; six completions unlock world and no skipped worlds', () => {
  const save = defaults();
  expect(unlockedModes(save)).toEqual(['count']);
  complete(save, 1, 1);
  expect(isLevelUnlocked(save, 1, 2)).toBe(true);
  for (let i = 2; i <= 5; i++) complete(save, 1, i);
  expect(isWorldUnlocked(save, 2)).toBe(false);
  complete(save, 1, 6);
  expect(isWorldUnlocked(save, 2)).toBe(true);
  expect(isLevelUnlocked(save, 2, 2)).toBe(false);
  for (let i = 1; i <= 5; i++) complete(save, 2, i);
  expect(unlockedModes(save)).toContain('missing');
  complete(save, 2, 6);
  expect(unlockedModes(save)).toContain('compare');
  for (let w = 3; w <= 5; w++)
    for (let i = 1; i <= 6; i++) complete(save, w, i);
  expect(new Set(unlockedModes(save))).toEqual(
    new Set(['count', 'compare', 'bond', 'missing', 'equation']),
  );
  save.levels['w1-l1']!.bestStars = 0;
  expect(isWorldUnlocked(save, 6)).toBe(false);
  expect(isWorldUnlocked(save, 1.5)).toBe(false);
});
it('world-five missing mode is included even when earlier missing entry is unplayed', () => {
  const save = defaults();
  for (let w = 1; w <= 4; w++)
    for (const i of [1, 2, 3, 4, 6, 7]) complete(save, w, i);
  expect(isLevelUnlocked(save, 2, 6)).toBe(false);
  expect(unlockedModes(save)).toContain('missing');
});

it.each(['entry', 'setting', 'error tag'])(
  'BUG-103: one corrupt %s preserves valid stars',
  (kind) => {
    const save = defaults();
    complete(save, 1, 1);
    complete(save, 1, 2);
    const raw: Record<string, unknown> = { ...structuredClone(save) };
    if (kind === 'entry')
      raw.levels = { ...save.levels, 'w1-l3': { bestStars: 'x' } };
    if (kind === 'setting') raw.settings = { ...save.settings, music: 7 };
    if (kind === 'error tag')
      raw.levels = {
        ...save.levels,
        'w1-l1': {
          ...save.levels['w1-l1'],
          errors: { overcount: 1, unknown: 3 },
        },
      };
    const result = migrateWithReport(raw);
    expect(result.save.levels).toEqual(save.levels);
    expect(result.save.settings).toEqual(save.settings);
    expect(result.droppedPaths).toContain(
      kind === 'entry'
        ? 'levels.w1-l3'
        : kind === 'setting'
          ? 'settings.music'
          : 'levels.w1-l1.errors.unknown',
    );
    expect(migrate(JSON.stringify(raw))).toEqual(result.save);
  },
);
it('BUG-103: valid saves round-trip without discarded paths; future versions reset', () => {
  const save = defaults();
  complete(save, 1, 1);
  save.practice = { band: 6, streak: 2 };
  expect(migrateWithReport(save)).toEqual({ save, droppedPaths: [] });
  expect(migrateWithReport({ ...save, version: 2 })).toEqual({
    save: defaults(),
    droppedPaths: ['version'],
  });
});
it('BUG-103: repairs settings independently and clamps counts and practice fields', () => {
  const save = defaults();
  complete(save, 1, 1);
  const raw = {
    ...save,
    settings: {
      ...save.settings,
      numerals: 'western',
      music: 7,
      sfx: -1,
      idleHintSec: 8,
    },
    levels: {
      ...save.levels,
      'w1-l1': {
        ...save.levels['w1-l1'],
        plays: -2,
        totalAttempts: -3,
        totalHints: -4,
        errors: { overcount: -3, undercount: 'bad' },
      },
    },
    practice: { band: 20, streak: -10 },
  };
  const { save: result, droppedPaths } = migrateWithReport(raw);
  expect(result.settings).toMatchObject({
    numerals: 'western',
    music: 0.3,
    sfx: 0.8,
    idleHintSec: 8,
  });
  expect(result.levels['w1-l1']).toMatchObject({
    bestStars: 1,
    plays: 0,
    totalAttempts: 0,
    totalHints: 0,
    errors: { overcount: 0 },
  });
  expect(result.practice).toEqual({ band: 10, streak: -1 });
  expect(droppedPaths).toEqual(
    expect.arrayContaining([
      'settings.music',
      'settings.sfx',
      'levels.w1-l1.plays',
      'levels.w1-l1.totalAttempts',
      'levels.w1-l1.totalHints',
      'levels.w1-l1.errors.overcount',
      'levels.w1-l1.errors.undercount',
      'practice.band',
      'practice.streak',
    ]),
  );
  expect(raw.levels['w1-l1'].plays).toBe(-2);
});
it.each([
  { band: 0, streak: 30 },
  { band: NaN, streak: 'x' },
  { band: 2.9, streak: 1.9 },
])('BUG-103: clamps or defaults practice %j', (practice) => {
  const result = migrate({ practice });
  expect(result.practice).toEqual(
    Number.isNaN(practice.band)
      ? { band: 1, streak: 0 }
      : practice.band === 0
        ? { band: 1, streak: 2 }
        : { band: 2, streak: 1 },
  );
});
it('BUG-103: invalid IDs and entries are isolated; unknown keys are reported', () => {
  const save = defaults();
  complete(save, 1, 1);
  const result = migrateWithReport({
    ...save,
    extra: true,
    settings: { ...save.settings, extra: true },
    practice: { extra: true },
    levels: {
      ...save.levels,
      'w7-l1': save.levels['w1-l1'],
      'w1-l2': null,
      'w1-l3': { ...save.levels['w1-l1'], errors: null, extra: true },
    },
  });
  expect(result.save.levels['w1-l1']).toEqual(save.levels['w1-l1']);
  expect(result.save.levels['w1-l3']?.errors).toEqual({});
  expect(result.droppedPaths).toEqual(
    expect.arrayContaining([
      'extra',
      'settings.extra',
      'practice.extra',
      'levels.w7-l1',
      'levels.w1-l2',
      'levels.w1-l3.errors',
      'levels.w1-l3.extra',
    ]),
  );
  for (const field of ['settings', 'levels', 'practice'])
    expect(
      migrateWithReport({ ...save, [field]: null }).droppedPaths,
    ).toContain(field);
});

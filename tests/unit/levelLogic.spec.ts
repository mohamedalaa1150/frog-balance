import { expect, it } from 'vitest';
import content from '../../content/levels.json';
import { Level, LevelsFile } from '../../src/core/levelSchema';
import type { LevelDefinition } from '../../src/core/levelSchema';
import {
  applyAction,
  canonicalSolution,
  correctPrediction,
  createLevelState,
  enumerateSolutions,
  isSolvable,
  levelNeed,
} from '../../src/core/levelLogic';
import type { ItemSpec, LevelState } from '../../src/core/types';
import { brokenLevels } from '../fixtures/broken-levels';
const levels = LevelsFile.parse(content).levels;
const get = (id: string) => structuredClone(levels.find((l) => l.id === id)!);
const place = (state: LevelState, items: ItemSpec[]) =>
  items.reduce(
    (s, item) =>
      applyAction(s, { type: 'place', side: s.level.workPan!, item }),
    state,
  );
const solve = (state: LevelState, items: ItemSpec[]) =>
  applyAction(place(state, items), { type: 'settle', at: state.now + 1000 });
it.each(levels)('authored $id is solvable and playable', (level) => {
  expect(isSolvable(level)).toBe(true);
  const solutions = enumerateSolutions(level);
  let state = createLevelState(level);
  if (level.goal.type === 'predict') {
    state = applyAction(state, {
      type: 'predict',
      choice: solutions[0]!.prediction!,
    });
    state = applyAction(state, { type: 'settle', at: 1000 });
  } else
    for (const solution of solutions.slice(
      0,
      level.goal.type === 'balanceMulti' ? level.goal.requiredSolutions : 1,
    ))
      state = solve(state, solution.items);
  expect(state.phase).toBe('success');
});
it.each(['count', 'compare', 'bond', 'missing', 'equation'])(
  'full %s playthrough replays deterministically',
  (mode) => {
    const level = levels.find((l) => l.mode === mode)!;
    const replay = () => {
      let state = createLevelState(level, { now: 50 });
      state = applyAction(state, { type: 'tick', at: 100 });
      if (mode === 'compare')
        state = applyAction(state, {
          type: 'predict',
          choice: correctPrediction(level),
          at: 200,
        });
      else state = place(state, enumerateSolutions(level)[0]!.items);
      state = applyAction(state, { type: 'settle', at: 1200 });
      return state;
    };
    expect(replay().phase).toBe('success');
    expect(replay()).toEqual(replay());
  },
);
it.each(brokenLevels)(
  'broken $id is schema-valid but fails solvability',
  (level) => {
    expect(Level.safeParse(level).success).toBe(true);
    expect(isSolvable(level)).toBe(false);
  },
);
it('rejects invalid schema, mode/goal mismatch, null work-pan and invalid prediction setup', () => {
  const base = get('w1-l1');
  expect(isSolvable({ ...base, id: 'bad' })).toBe(false);
  expect(isSolvable({ ...base, workPan: null })).toBe(false);
  expect(enumerateSolutions({ ...base, workPan: null })).toEqual([]);
  expect(isSolvable({ ...base, mode: 'compare' })).toBe(false);
  expect(isSolvable({ ...base, mode: 'bond' })).toBe(false);
  const compare = get('w3-l1');
  expect(isSolvable({ ...compare, workPan: 'left' })).toBe(false);
  expect(isSolvable({ ...compare, mode: 'count' })).toBe(false);
  compare.fixed.right = [];
  expect(isSolvable(compare)).toBe(false);
  expect(
    isSolvable({
      ...base,
      fixed: {
        left: base.fixed.left,
        right: Array.from({ length: 11 }, () => ({ kind: 'frog' })),
      },
    } as LevelDefinition),
  ).toBe(false);
});
it('enumerates repeated sources, mixed solutions, canonical numbers and both work sides', () => {
  const base = get('w4-l4');
  base.fixed.left = [{ kind: 'number', value: 4 }];
  base.tray.numbers = [2, 2];
  expect(enumerateSolutions(base).map((s) => s.canonical)).toEqual(['2+2']);
  base.tray.frogs = true;
  base.childLimits.maxFrogs = 4;
  expect(enumerateSolutions(base)).toHaveLength(1);
  base.fixed.right = [{ kind: 'frog' }];
  expect(enumerateSolutions(base)).toEqual([]);
  const mixed = get('w5-l8');
  expect(
    enumerateSolutions(mixed).some(
      (s) =>
        s.items.some((i) => i.kind === 'frog') &&
        s.items.some((i) => i.kind === 'number'),
    ),
  ).toBe(true);
  const left = get('w1-l2');
  left.fixed = { left: [], right: left.fixed.left };
  left.workPan = 'left';
  expect(levelNeed(left)).toBe(2);
  expect(
    solve(createLevelState(left), enumerateSolutions(left)[0]!.items).phase,
  ).toBe('success');
  expect(
    canonicalSolution([
      { kind: 'number', value: 10 },
      { kind: 'number', value: 2 },
    ]),
  ).toBe('2+10');
  expect(levelNeed(get('w3-l1'))).toBe(0);
});
it('creates independent fixed items, stable identities and injectable start time', () => {
  const level = get('w5-l1');
  const state = createLevelState(level, { now: 123, idleHintSec: 8 });
  expect(state).toMatchObject({
    startedAt: 123,
    now: 123,
    idleHintSec: 8,
    hintLevel: 0,
  });
  expect(state.pans.right[0]).toMatchObject({
    uid: 'fixed-right-0',
    fixed: true,
    order: 0,
  });
  level.fixed.right[0]!.value = 1;
  expect(state.level.fixed.right[0]!.value).toBe(4);
});
it('settle requires a change and a full second without dragging; evaluates once', () => {
  let s = createLevelState(get('w1-l2'));
  expect(applyAction(s, { type: 'settle', at: 10000 }).attempts).toBe(0);
  s = place(s, [{ kind: 'frog' }]);
  s = applyAction(s, { type: 'settle', at: 999 });
  expect(s.attempts).toBe(0);
  s = applyAction(s, { type: 'tick', at: 1000, dragging: true });
  expect(s.attempts).toBe(0);
  s = applyAction(s, { type: 'settle', at: 5000 });
  expect(s.attempts).toBe(0);
  s = applyAction(s, { type: 'tick', at: 6000, dragging: false });
  expect(s.attempts).toBe(0);
  s = applyAction(s, { type: 'settle', at: 7000 });
  expect(s.attempts).toBe(0);
  expect(s.lastSettledGap).toBe(1);
  s = applyAction(s, { type: 'settle', at: 20000 });
  expect(s.attempts).toBe(0);
  s = applyAction(s, { type: 'tick', at: 0 });
  expect(s.now).toBe(20000);
});
it('rejects locked/wrong-side/unavailable/invalid items and enforces child and pan capacities', () => {
  const s = createLevelState(get('w5-l4'));
  for (const [side, item] of [
    ['left', { kind: 'frog' }],
    ['right', { kind: 'frog' }],
    ['right', { kind: 'number', value: 10 }],
    ['right', { kind: 'number' }],
  ] as const)
    expect(applyAction(s, { type: 'place', side, item })).toBe(s);
  expect(
    applyAction(s, { type: 'remove', side: 'right', uid: 'fixed-right-0' }),
  ).toBe(s);
  expect(applyAction(s, { type: 'remove', side: 'left', uid: 'child-0' })).toBe(
    s,
  );
  expect(
    applyAction(s, { type: 'remove', side: 'right', uid: 'missing' }),
  ).toBe(s);
  expect(applyAction(s, { type: 'predict', choice: 'equal' })).toBe(s);
  const full = place(s, [{ kind: 'number', value: 1 }]);
  const rejected = place(full, [{ kind: 'number', value: 1 }]);
  expect(rejected.errors).toEqual(['capacity']);
  expect(rejected.attempts).toBe(0);
  const level = get('w5-l1');
  level.fixed.right = [{ kind: 'number', value: 1 }];
  level.childLimits.maxFrogs = 10;
  const panFull = place(
    createLevelState(level),
    Array.from({ length: 7 }, () => ({ kind: 'frog' })),
  );
  expect(panFull.pans.right).toHaveLength(7);
  expect(panFull.errors).toEqual(['capacity']);
});
it('remove is pure; UID/order is not reused; hint activity and progress fade', () => {
  let s = createLevelState(get('w1-l2'));
  s = applyAction(s, { type: 'requestHint', at: 100 });
  s = place(s, [{ kind: 'frog' }]);
  expect(s.hintsUsed).toBe(1);
  expect(s.hintLevel).toBe(1);
  s = applyAction(s, { type: 'settle', at: 1100 });
  expect(s.hintLevel).toBe(0);
  const before = structuredClone(s);
  const removed = applyAction(s, {
    type: 'remove',
    side: 'right',
    uid: 'child-0',
    at: 1200,
  });
  expect(s).toEqual(before);
  expect(removed.pans.right).toEqual([]);
  s = place(removed, [{ kind: 'frog' }]);
  expect(s.pans.right[0]!.uid).toBe('child-1');
  s = applyAction(s, { type: 'tick', at: 13200 });
  expect(s.hintLevel).toBe(1);
});
it('bond records canonical solutions once, clears child items, preserves locks, and completes', () => {
  const level = get('w4-l5');
  const [a, b] = enumerateSolutions(level);
  let s = solve(createLevelState(level), a!.items);
  expect(s).toMatchObject({
    phase: 'playing',
    outcome: 'solution',
    solutionsFound: [a!.canonical],
    attempts: 0,
  });
  expect(s.pans.right).toEqual([]);
  s = solve(s, [...a!.items].reverse());
  expect(s.outcome).toBe('duplicate');
  expect(s.solutionsFound).toHaveLength(1);
  expect(s.attempts).toBe(0);
  expect(s.pans.right).toEqual([]);
  s = solve(s, b!.items);
  expect(s.phase).toBe('success');
  expect(s.solutionsFound).toHaveLength(2);
  const simplified = get('w4-l1');
  s = solve(
    createLevelState(simplified),
    enumerateSolutions(simplified)[0]!.items,
  );
  expect(s.pans.right).toHaveLength(1);
  expect(s.pans.right[0]!.fixed).toBe(true);
});
it('balanceMulti rejects wrong tile count or frogs even at equality', () => {
  const level = get('w4-l4');
  level.childLimits.maxNumbers = 3;
  level.tray.numbers = [6, 3];
  let s = solve(createLevelState(level), [{ kind: 'number', value: 6 }]);
  expect(s.phase).toBe('playing');
  expect(s.attempts).toBe(1);
  level.tray.frogs = true;
  level.childLimits.maxFrogs = 6;
  s = solve(
    createLevelState(level),
    Array.from({ length: 6 }, () => ({ kind: 'frog' })),
  );
  expect(s.attempts).toBe(1);
});
it.each(['left', 'right', 'equal'] as const)(
  'predict %s: locks input until settled and freezes reveal/success',
  (choice) => {
    const level = get('w3-l1');
    let s = createLevelState(level);
    expect(
      applyAction(s, { type: 'place', side: 'right', item: { kind: 'frog' } }),
    ).toBe(s);
    s = applyAction(s, { type: 'predict', choice, at: 1 });
    expect(applyAction(s, { type: 'predict', choice: 'equal' })).toBe(s);
    s = applyAction(s, { type: 'settle', at: 1001 });
    expect(s.phase).toBe(choice === 'left' ? 'success' : 'revealing');
    expect(s.errors).toEqual(
      choice === 'left'
        ? []
        : choice === 'right'
          ? ['wrongPrediction', 'compareFlip']
          : ['wrongPrediction'],
    );
    expect(s.attempts).toBe(choice === 'left' ? 0 : 1);
    expect(applyAction(s, { type: 'requestHint' })).toBe(s);
    expect(applyAction(s, { type: 'tick', at: 99999 })).toBe(s);
  },
);
it('three changed failures escalate hints; undercount and overcount classify on settle', () => {
  let s = createLevelState(get('w1-l3'), { idleHintSec: 8 });
  s = place(s, [{ kind: 'frog' }]);
  s = applyAction(s, { type: 'settle', at: 8000 });
  expect(s.errors).toEqual([]);
  expect(s.attempts).toBe(0);
  s = place(
    s,
    Array.from({ length: 3 }, () => ({ kind: 'frog' })),
  );
  s = applyAction(s, { type: 'settle', at: 9000 });
  expect(s.errors.at(-1)).toBe('overcount');
  s = place(s, [{ kind: 'frog' }]);
  s = applyAction(s, { type: 'settle', at: 10000 });
  expect(s.attempts).toBe(2);
  expect(s.hintLevel).toBe(0);
  s = place(s, [{ kind: 'frog' }]);
  s = applyAction(s, { type: 'settle', at: 11000 });
  expect(s.hintLevel).toBe(1);
});
it('settled success takes precedence over an idle hint and preserves independent stars', () => {
  let s = createLevelState(get('w1-l1'));
  s = place(s, [{ kind: 'frog' }]);
  s = applyAction(s, { type: 'tick', at: 12000 });
  expect(s.phase).toBe('success');
  expect(s.hintsUsed).toBe(0);
});

it('BUG-101: slow correct counting has no failed attempts, hints or errors', () => {
  let s = createLevelState(get('w1-l5'));
  for (let i = 0; i < 5; i++) {
    s = applyAction(s, {
      type: 'place',
      side: 'right',
      item: { kind: 'frog' },
      at: i * 2700,
    });
    s = applyAction(s, { type: 'tick', at: i * 2700 + 1200 });
    expect(s.lastSettledGap).toBe(4 - i);
  }
  expect(s).toMatchObject({
    phase: 'success',
    attempts: 0,
    hintsUsed: 0,
    errors: [],
  });
});
it('BUG-101: overshooting by one is an attempt and removing it succeeds', () => {
  let s = createLevelState(get('w1-l5'));
  s = solve(
    s,
    Array.from({ length: 6 }, () => ({ kind: 'frog' })),
  );
  expect(s).toMatchObject({
    attempts: 1,
    errors: ['overcount'],
    lastSettledGap: 1,
  });
  s = applyAction(s, {
    type: 'remove',
    side: 'right',
    uid: s.pans.right.at(-1)!.uid,
  });
  s = applyAction(s, { type: 'settle', at: s.now + 1000 });
  expect(s).toMatchObject({ phase: 'success', attempts: 1, lastSettledGap: 0 });
});
it('BUG-101: place/remove cycles without settled progress trigger a hint after three attempts', () => {
  let s = createLevelState(get('w1-l5'));
  for (let i = 1; i <= 3; i++) {
    s = place(s, [{ kind: 'frog' }]);
    s = applyAction(s, {
      type: 'remove',
      side: 'right',
      uid: s.pans.right.at(-1)!.uid,
    });
    s = applyAction(s, { type: 'settle', at: s.now + 1200 });
    expect(s.attempts).toBe(i);
    expect(s.lastSettledGap).toBe(5);
    expect(s.hintLevel).toBe(i === 3 ? 1 : 0);
  }
});
it('BUG-101: partial bonds progress without failure; recorded solutions restore starting gap', () => {
  let s = createLevelState(get('w4-l6'));
  s = solve(s, [{ kind: 'number', value: 3 }]);
  expect(s).toMatchObject({ attempts: 0, lastSettledGap: 4, errors: [] });
  s = solve(s, [{ kind: 'number', value: 4 }]);
  expect(s).toMatchObject({
    attempts: 0,
    lastSettledGap: 7,
    outcome: 'solution',
  });
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
] as const)(
  'BUG-104: %s records the expected misconception for all predictions',
  (id, expected) => {
    for (const choice of ['left', 'right', 'equal'] as const) {
      let s = createLevelState(get(id));
      s = applyAction(s, { type: 'predict', choice });
      s = applyAction(s, { type: 'settle', at: 1000 });
      const tags =
        choice === expected
          ? []
          : expected !== 'equal' && choice !== 'equal'
            ? ['wrongPrediction', 'compareFlip']
            : ['wrongPrediction'];
      expect(s.errors).toEqual(tags);
    }
  },
);

it('BUG-105: reversed duplicate bonds are correct maths and return child tiles', () => {
  let s = createLevelState(get('w4-l6'));
  s = solve(s, [
    { kind: 'number', value: 3 },
    { kind: 'number', value: 4 },
  ]);
  s = solve(s, [
    { kind: 'number', value: 4 },
    { kind: 'number', value: 3 },
  ]);
  expect(s).toMatchObject({
    outcome: 'duplicate',
    phase: 'playing',
    attempts: 0,
    errors: [],
    solutionsFound: ['3+4'],
    lastSettledGap: 7,
    hintsUsed: 0,
  });
  expect(s.pans.right).toEqual([]);
  s = solve(s, [
    { kind: 'number', value: 2 },
    { kind: 'number', value: 5 },
  ]);
  expect(s.phase).toBe('success');
});
it('BUG-105: duplicate returns preserve fixed tiles and send hint activity without failure', () => {
  const level = get('w4-l6');
  level.fixed.right = [{ kind: 'number', value: 1 }];
  let s = createLevelState(level);
  s = solve(s, [
    { kind: 'number', value: 2 },
    { kind: 'number', value: 4 },
  ]);
  s = applyAction(s, { type: 'requestHint' });
  const fixed = s.pans.right[0];
  for (let i = 0; i < 3; i++)
    s = solve(s, [
      { kind: 'number', value: 4 },
      { kind: 'number', value: 2 },
    ]);
  expect(s.pans.right).toEqual([fixed]);
  expect(s.lastSettledGap).toBe(6);
  expect(s).toMatchObject({
    attempts: 0,
    errors: [],
    outcome: 'duplicate',
    hintLevel: 1,
    hintsUsed: 1,
  });
  expect(s.hint.failures).toBe(0);
  expect(s.hint.lastActivityAt).toBe(s.now);
});

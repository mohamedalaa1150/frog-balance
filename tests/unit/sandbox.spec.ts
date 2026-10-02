import { expect, it } from 'vitest';
import content from '../../content/levels.json';
import { LevelsFile } from '../../src/core/levelSchema';
import {
  applyAction,
  createLevelState,
  createSandboxState,
} from '../../src/core/levelLogic';
it('Sandbox has infinite sources, both active pans, physical capacity and no success', () => {
  let state = createSandboxState(10);
  expect(state.level.mode).toBe('sandbox');
  expect(state.idleHintSec).toBe(0);
  for (const side of ['left', 'right'] as const) {
    for (let i = 0; i < 10; i++)
      state = applyAction(state, {
        type: 'place',
        side,
        item: { kind: 'frog' },
        at: 20,
      });
    const full = state.pans[side];
    state = applyAction(state, {
      type: 'place',
      side,
      item: { kind: 'frog' },
      at: 25,
    });
    expect(state.pans[side]).toEqual(full);
    expect(state.errors.at(-1)).toBe('capacity');
    state = applyAction(state, {
      type: 'remove',
      side,
      uid: full[9]!.uid,
      at: 30,
    });
    expect(state.pans[side]).toHaveLength(9);
  }
  state = applyAction(state, { type: 'settle', at: 1030 });
  expect(state.phase).toBe('playing');
  expect(state.attempts).toBe(0);
  for (const side of ['left', 'right'] as const)
    for (const item of state.pans[side])
      state = applyAction(state, { type: 'remove', side, uid: item.uid });
  state = applyAction(state, {
    type: 'place',
    side: 'left',
    item: { kind: 'number', value: 10 },
  });
  state = applyAction(state, {
    type: 'place',
    side: 'right',
    item: { kind: 'number', value: 10 },
  });
  state = applyAction(state, { type: 'tick', at: 2030 });
  expect(state.phase).toBe('playing');
});
it('fast settle keeps timestamps in scene time and retains drag protection', () => {
  const level = LevelsFile.parse(content).levels[0]!;
  let state = createLevelState(level, { now: 50 });
  state = applyAction(state, {
    type: 'place',
    side: 'right',
    item: { kind: 'frog' },
    at: 60,
  });
  state = applyAction(
    state,
    { type: 'tick', at: 60, dragging: true },
    { settleMs: 0 },
  );
  expect(state.phase).toBe('awaitingSettle');
  state = applyAction(
    state,
    { type: 'tick', at: 70, dragging: false },
    { settleMs: 0 },
  );
  expect(state.phase).toBe('success');
  expect(state.now).toBe(70);
});

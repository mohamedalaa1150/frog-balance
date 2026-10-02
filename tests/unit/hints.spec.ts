import { expect, it } from 'vitest';
import { createHintState, updateHint } from '../../src/core/hints';
import type { HintEvent, IdleHintSec } from '../../src/core/hints';
it.each([8, 12, 20] as IdleHintSec[])('idle threshold %s', (sec) => {
  const initial = createHintState(100);
  expect(
    updateHint(initial, 'tick', sec, () => 100 + sec * 1000 - 1).level,
  ).toBe(0);
  const first = updateHint(initial, 'tick', sec, () => 100 + sec * 1000);
  expect(first.level).toBe(1);
  expect(updateHint(first, 'tick', sec, () => 100 + sec * 1000).level).toBe(1);
  expect(updateHint(first, 'tick', sec, () => 100 + sec * 2000).level).toBe(2);
});
it.each(['manual', 'failure', 'tick'] as HintEvent[])(
  'escalates %s through 3 and caps',
  (event) => {
    let state = createHintState();
    let time = 0;
    for (let level = 1; level <= 3; level++) {
      for (let i = 0; i < (event === 'failure' ? 3 : 1); i++) {
        time += 12000;
        state = updateHint(state, event, 12, () => time);
      }
      expect(state.level).toBe(level);
    }
    expect(updateHint(state, 'manual', 12, () => time).used).toBe(3);
  },
);
it('disabled idle still supports attempts and manual assistance', () => {
  expect(updateHint(createHintState(), 'tick', 0, () => 100000).level).toBe(0);
  expect(updateHint(createHintState(), 'manual', 0, () => 100000).level).toBe(
    1,
  );
});
it('activity restarts idle; progress fades but retains scoring; reset clears usage', () => {
  let state = updateHint(createHintState(), 'manual', 12, () => 100);
  state = updateHint(state, 'activity', 12, () => 12000);
  expect(updateHint(state, 'tick', 12, () => 12001).level).toBe(1);
  state = updateHint(state, 'progress', 12, () => 13000);
  expect(state).toMatchObject({ level: 0, maxLevel: 1, used: 1, failures: 0 });
  expect(updateHint(state, 'reset', 12, () => 20000)).toEqual(
    createHintState(20000),
  );
  expect(updateHint(createHintState(), 'tick')).toEqual(createHintState());
});

export type HintLevel = 0 | 1 | 2 | 3;
export type IdleHintSec = 0 | 8 | 12 | 20;
export type Clock = () => number;
export interface HintState {
  level: HintLevel;
  maxLevel: HintLevel;
  used: number;
  failures: number;
  lastActivityAt: number;
  lastHintAt: number;
}
export type HintEvent =
  'tick' | 'manual' | 'failure' | 'activity' | 'progress' | 'reset';
export function createHintState(now = 0): HintState {
  return {
    level: 0,
    maxLevel: 0,
    used: 0,
    failures: 0,
    lastActivityAt: now,
    lastHintAt: now,
  };
}
/** Activity restarts idle timing; progress also fades the visible hint and resets failures.
 * Maximum assistance/usage survives fading for scoring. A new level resets everything.
 * Three failures are consumed per escalation; idle=0 disables only the idle trigger. */
export function updateHint(
  state: HintState,
  event: HintEvent,
  idleHintSec: IdleHintSec = 12,
  clock: Clock = () => 0,
): HintState {
  const now = clock();
  if (event === 'reset') return createHintState(now);
  if (event === 'progress')
    return {
      ...state,
      level: 0,
      failures: 0,
      lastActivityAt: now,
      lastHintAt: now,
    };
  if (event === 'activity') return { ...state, lastActivityAt: now };
  const failures = state.failures + (event === 'failure' ? 1 : 0);
  const due =
    event === 'manual' ||
    failures >= 3 ||
    (event === 'tick' &&
      idleHintSec > 0 &&
      now - Math.max(state.lastActivityAt, state.lastHintAt) >=
        idleHintSec * 1000);
  if (!due || state.level === 3) return { ...state, failures };
  const level = (state.level + 1) as HintLevel;
  return {
    ...state,
    level,
    maxLevel: Math.max(state.maxLevel, level) as HintLevel,
    used: state.used + 1,
    failures: 0,
    lastHintAt: now,
  };
}

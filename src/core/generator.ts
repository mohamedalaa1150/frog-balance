import { isSolvable } from './levelLogic';
import { Level } from './levelSchema';
import type { LevelDefinition } from './levelSchema';
import { mulberry32 } from './rng';
import type { ItemSpec } from './types';

export interface PracticeState {
  band: number;
  streak: number;
}
export type PracticeMode = LevelDefinition['mode'];
/** Signed streak: positive=correct, negative=wrong. Switching direction resets it. */
export function adaptBand(
  state: PracticeState,
  correct: boolean,
): PracticeState {
  const band = Math.max(1, Math.min(10, Math.trunc(state.band)));
  const streak = correct
    ? Math.max(0, state.streak) + 1
    : Math.min(0, state.streak) - 1;
  if (streak >= 3) return { band: Math.min(10, band + 1), streak: 0 };
  if (streak <= -2) return { band: Math.max(1, band - 1), streak: 0 };
  return { band, streak };
}
/** Construct from a witness solution rather than retrying random unsolvable puzzles. */
export function generateLevel(
  seed: number,
  unlockedModes: readonly PracticeMode[],
  band = 1,
  index = 0,
): LevelDefinition {
  if (!unlockedModes.length)
    throw new Error('Practice requires an unlocked mode');
  if (!Number.isSafeInteger(index) || index < 0)
    throw new Error('Practice index must be a nonnegative safe integer');
  const rng = mulberry32(seed);
  const pick = (min: number, max: number): number =>
    min + Math.floor(rng() * (max - min + 1));
  const difficulty = Math.max(1, Math.min(10, Math.trunc(band)));
  const mode = unlockedModes[pick(0, unlockedModes.length - 1)]!;
  const number = (value: number): ItemSpec => ({ kind: 'number', value });
  const target = pick(2, Math.max(2, difficulty));
  const level: LevelDefinition = {
    id: `practice-${index}`,
    world: 1,
    index: 1,
    mode,
    fixed: { left: [number(target)], right: [] },
    workPan: 'right',
    tray: { frogs: true, numbers: [] },
    childLimits: { maxNumbers: 0, maxFrogs: 10 },
    goal: { type: 'balance' },
    showEquation: false,
    guideArrow: false,
    vo: { intro: 'intro_count' },
  };
  if (mode === 'compare') {
    level.world = 3;
    // band also bounds the sibling's difference, including equality.
    const left = pick(1, 10);
    const right = pick(
      Math.max(1, left - difficulty),
      Math.min(10, left + difficulty),
    );
    level.fixed = { left: [number(left)], right: [number(right)] };
    level.workPan = null;
    level.tray.frogs = false;
    level.childLimits.maxFrogs = 0;
    level.goal = { type: 'predict' };
    level.vo.intro = 'intro_compare';
  } else if (mode === 'bond') {
    level.world = 4;
    const total = pick(3, Math.max(3, difficulty));
    const simple = difficulty < 4;
    level.fixed = { left: [number(total)], right: simple ? [number(1)] : [] };
    level.tray = {
      frogs: false,
      numbers: Array.from({ length: total - 1 }, (_, i) => i + 1),
    };
    level.childLimits = { maxNumbers: simple ? 1 : 2, maxFrogs: 0 };
    level.goal = {
      type: 'balanceMulti',
      childNumbersExactly: simple ? 1 : 2,
      requiredSolutions: simple ? 1 : Math.min(4, Math.floor(total / 2)),
    };
    level.showEquation = true;
    level.vo.intro = simple ? 'intro_bond_single' : 'intro_bond_multi';
  } else if (mode === 'missing' || mode === 'equation') {
    level.world = mode === 'missing' ? 5 : 6;
    const fixed = pick(1, target - 1);
    level.fixed.right = [number(fixed)];
    if (mode === 'equation') {
      const part = pick(1, target - 1);
      level.fixed.left = [number(part), number(target - part)];
    }
    const useFrogs = difficulty <= 6;
    level.tray = {
      frogs: useFrogs,
      numbers: useFrogs ? [] : Array.from({ length: 10 }, (_, i) => i + 1),
    };
    level.childLimits = {
      maxNumbers: useFrogs ? 0 : 1,
      maxFrogs: useFrogs ? 6 : 0,
    };
    level.showEquation = true;
    level.vo.intro =
      mode === 'equation'
        ? 'intro_equation'
        : useFrogs
          ? 'intro_missing_frogs'
          : 'intro_missing_number';
  }
  const parsed = Level.parse(level);
  if (!isSolvable(parsed))
    throw new Error('Generated level violated solvability invariant');
  return parsed;
}

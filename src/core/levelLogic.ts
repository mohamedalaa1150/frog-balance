import { CONFIG } from '../config';
import { canPlace, diff, panWeight, weightOf, withinCapacity } from './balance';
import { createHintState, updateHint } from './hints';
import type { HintEvent, IdleHintSec } from './hints';
import { Item, Level } from './levelSchema';
import type { LevelDefinition } from './levelSchema';
import {
  classifyError,
  classifyPrediction,
  classifyRejection,
} from './scoring';
import type {
  ItemSpec,
  LevelAction,
  LevelState,
  PlacedItem,
  Side,
} from './types';

export interface Solution {
  items: ItemSpec[];
  canonical?: string;
  prediction?: Side | 'equal';
}
export const canonicalSolution = (items: readonly ItemSpec[]): string =>
  items
    .map(weightOf)
    .sort((a, b) => a - b)
    .join('+');
export const correctPrediction = (level: LevelDefinition): Side | 'equal' => {
  const d = diff(level.fixed.left, level.fixed.right);
  return d === 0 ? 'equal' : d > 0 ? 'right' : 'left';
};
export function levelNeed(level: LevelDefinition): number {
  if (level.workPan === null) return 0;
  return (
    panWeight(level.fixed[level.workPan === 'left' ? 'right' : 'left']) -
    panWeight(level.fixed[level.workPan])
  );
}
/** Sources are infinite; enumerate combinations with replacement, never permutations. */
export function enumerateSolutions(level: LevelDefinition): Solution[] {
  if (level.goal.type === 'predict')
    return [{ items: [], prediction: correctPrediction(level) }];
  if (level.workPan === null || levelNeed(level) <= 0) return [];
  const solutions: Solution[] = [];
  const seen = new Set<string>();
  const numbers = [...new Set(level.tray.numbers)].sort((a, b) => a - b);
  const fixed = level.fixed[level.workPan];
  const visit = (chosen: ItemSpec[], start: number): void => {
    const maxFrogs = level.tray.frogs ? level.childLimits.maxFrogs : 0;
    for (let frogs = 0; frogs <= maxFrogs; frogs++) {
      const items: ItemSpec[] = [
        ...chosen,
        ...Array.from({ length: frogs }, (): ItemSpec => ({ kind: 'frog' })),
      ];
      if (
        !items.length ||
        panWeight(items) !== levelNeed(level) ||
        !withinCapacity([...fixed, ...items])
      )
        continue;
      if (
        level.goal.type === 'balanceMulti' &&
        (frogs > 0 ||
          chosen.length !== level.goal.childNumbersExactly ||
          fixed.some((i) => i.kind !== 'number'))
      )
        continue;
      const canonical = canonicalSolution([...fixed, ...items]);
      const key =
        level.goal.type === 'balanceMulti' ? canonical : JSON.stringify(items);
      if (!seen.has(key)) {
        seen.add(key);
        solutions.push({ items, canonical });
      }
    }
    if (chosen.length >= level.childLimits.maxNumbers) return;
    for (let i = start; i < numbers.length; i++)
      visit([...chosen, { kind: 'number', value: numbers[i]! }], i);
  };
  visit([], 0);
  return solutions;
}
export function isSolvable(level: LevelDefinition): boolean {
  if (
    !Level.safeParse(level).success ||
    !withinCapacity(level.fixed.left) ||
    !withinCapacity(level.fixed.right)
  )
    return false;
  if (level.goal.type === 'predict')
    return (
      level.mode === 'compare' &&
      level.workPan === null &&
      level.fixed.left.length > 0 &&
      level.fixed.right.length > 0
    );
  if (
    level.mode === 'compare' ||
    level.workPan === null ||
    (level.mode === 'bond') !== (level.goal.type === 'balanceMulti')
  )
    return false;
  return (
    enumerateSolutions(level).length >=
    (level.goal.type === 'balanceMulti' ? level.goal.requiredSolutions : 1)
  );
}
export function createLevelState(
  level: LevelDefinition,
  options: { now?: number; idleHintSec?: IdleHintSec } = {},
): LevelState {
  const now = options.now ?? 0;
  const copy = Level.parse(level);
  const placed = (side: Side): PlacedItem[] =>
    copy.fixed[side].map((item, order) => ({
      ...item,
      uid: `fixed-${side}-${order}`,
      fixed: true,
      order,
    }));
  return {
    levelId: copy.id,
    level: copy,
    pans: { left: placed('left'), right: placed('right') },
    phase: 'playing',
    solutionsFound: [],
    attempts: 0,
    hintLevel: 0,
    hintsUsed: 0,
    hint: createHintState(now),
    idleHintSec: options.idleHintSec ?? 12,
    errors: [],
    startedAt: now,
    now,
    lastChangedAt: now,
    lastSettledGap: Math.abs(diff(copy.fixed.left, copy.fixed.right)),
    bestSettledGap: Math.abs(diff(copy.fixed.left, copy.fixed.right)),
    dragging: false,
    pendingEvaluation: false,
    nextUid: 0,
  };
}
function hintEvent(state: LevelState, event: HintEvent): LevelState {
  const hint = updateHint(
    state.hint,
    event,
    state.idleHintSec,
    () => state.now,
  );
  return { ...state, hint, hintLevel: hint.level, hintsUsed: hint.used };
}
function changed(state: LevelState, pans: LevelState['pans']): LevelState {
  return hintEvent(
    {
      ...state,
      pans,
      phase: 'awaitingSettle',
      lastChangedAt: state.now,
      pendingEvaluation: true,
      outcome: undefined,
    },
    'activity',
  );
}
function settle(state: LevelState): LevelState {
  if (
    !state.pendingEvaluation ||
    state.dragging ||
    state.now - state.lastChangedAt < CONFIG.settleMs
  )
    return state;
  const gap = Math.abs(diff(state.pans.left, state.pans.right));
  const next: LevelState = {
    ...state,
    pendingEvaluation: false,
    lastSettledGap: gap,
    phase: 'playing',
  };
  const level = state.level;
  if (level.goal.type === 'predict') {
    if (state.prediction === correctPrediction(level))
      return { ...next, phase: 'success' };
    return hintEvent(
      {
        ...next,
        attempts: state.attempts + 1,
        phase: 'revealing',
        outcome: 'wrongPrediction',
        errors: [
          ...state.errors,
          ...classifyPrediction(level, state.prediction!),
        ],
      },
      'failure',
    );
  }
  const side = level.workPan!;
  const child = state.pans[side].filter((item) => !item.fixed);
  const balanced =
    diff(state.pans.left, state.pans.right) === 0 && child.length > 0;
  if (balanced && level.goal.type === 'balance')
    return { ...next, phase: 'success', bestSettledGap: 0 };
  if (
    balanced &&
    level.goal.type === 'balanceMulti' &&
    child.length === level.goal.childNumbersExactly &&
    state.pans[side].every((i) => i.kind === 'number')
  ) {
    const canonical = canonicalSolution(state.pans[side]);
    const duplicate = state.solutionsFound.includes(canonical);
    const solutionsFound = duplicate
      ? state.solutionsFound
      : [...state.solutionsFound, canonical];
    return hintEvent(
      {
        ...next,
        solutionsFound,
        pans: {
          ...state.pans,
          [side]: state.pans[side].filter((i) => i.fixed),
        },
        lastSettledGap: Math.abs(levelNeed(level)),
        bestSettledGap: Math.abs(levelNeed(level)),
        outcome: duplicate ? 'duplicate' : 'solution',
        phase:
          solutionsFound.length >= level.goal.requiredSolutions
            ? 'success'
            : 'playing',
      },
      duplicate ? 'activity' : 'progress',
    );
  }

  // Only a new best unfinished quantity resets failures and fades hints.
  // Overshoots and equality with invalid bond items remain incorrect answers.
  const other = side === 'left' ? 'right' : 'left';
  const shortOfTarget =
    panWeight(state.pans[side]) < panWeight(state.pans[other]);
  if (gap > 0 && gap < state.bestSettledGap && shortOfTarget)
    return hintEvent({ ...next, bestSettledGap: gap }, 'progress');
  // Reaching an earlier partial answer is neutral, not fresh progress.
  if (gap > 0 && gap < state.lastSettledGap && shortOfTarget)
    return hintEvent(next, 'activity');
  return hintEvent(
    {
      ...next,
      attempts: state.attempts + 1,
      errors: [
        ...state.errors,
        ...classifyError(
          level,
          state.pans,
          state.now - state.hint.lastActivityAt,
          state.idleHintSec,
        ),
      ],
    },
    'failure',
  );
}
/** Reducer owns all rules. at is monotonic simulation time; omitted at retains time.
 * Wrong comparisons stay revealing; the caller starts a generated sibling with
 * createLevelState after showing the explanation. Success/reveal freeze input. */
export function applyAction(
  state: LevelState,
  action: LevelAction,
): LevelState {
  if (state.phase === 'success' || state.phase === 'revealing') return state;
  const now = Math.max(state.now, action.at ?? state.now);
  let next = { ...state, now };
  const level = state.level;
  if (action.type === 'requestHint') return hintEvent(next, 'manual');
  if (action.type === 'place') {
    if (
      level.goal.type === 'predict' ||
      action.side !== level.workPan ||
      !Item.safeParse(action.item).success
    )
      return state;
    const children = state.pans[action.side].filter((i) => !i.fixed);
    const item = action.item;
    if (
      item.kind === 'frog'
        ? !level.tray.frogs
        : !level.tray.numbers.includes(item.value!)
    )
      return state;
    if (
      !canPlace(state.pans[action.side], item) ||
      children.filter((i) => i.kind === item.kind).length >=
        (item.kind === 'frog'
          ? level.childLimits.maxFrogs
          : level.childLimits.maxNumbers)
    )
      return {
        ...hintEvent(next, 'activity'),
        errors: [...state.errors, classifyRejection('capacity')],
      };
    const placed: PlacedItem = {
      ...item,
      uid: `child-${state.nextUid}`,
      fixed: false,
      order: state.nextUid + level.fixed[action.side].length,
    };
    next = { ...next, nextUid: state.nextUid + 1 };
    return changed(next, {
      ...state.pans,
      [action.side]: [...state.pans[action.side], placed],
    });
  }
  if (action.type === 'remove') {
    if (
      action.side !== level.workPan ||
      !state.pans[action.side].some((i) => i.uid === action.uid && !i.fixed)
    )
      return state;
    return changed(next, {
      ...state.pans,
      [action.side]: state.pans[action.side].filter(
        (i) => i.uid !== action.uid,
      ),
    });
  }
  if (action.type === 'predict') {
    if (level.goal.type !== 'predict' || state.pendingEvaluation) return state;
    return hintEvent(
      {
        ...next,
        prediction: action.choice,
        phase: 'awaitingSettle',
        pendingEvaluation: true,
        lastChangedAt: now,
      },
      'activity',
    );
  }
  const dragging = action.dragging ?? state.dragging;
  if (dragging || state.dragging) next = { ...next, lastChangedAt: now };
  next = { ...next, dragging };
  next = settle(next);
  if (
    action.type === 'tick' &&
    !dragging &&
    next.phase !== 'success' &&
    next.phase !== 'revealing'
  )
    next = hintEvent(next, 'tick');
  return next;
}

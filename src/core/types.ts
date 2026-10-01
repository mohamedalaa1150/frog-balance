import type { LevelDefinition } from './levelSchema';
import type { HintState, IdleHintSec } from './hints';

export type Side = 'left' | 'right';
export type ItemKind = 'frog' | 'number';
export interface ItemSpec {
  kind: ItemKind;
  value?: number;
}
export interface PlacedItem extends ItemSpec {
  uid: string;
  fixed: boolean;
  order: number;
}
export type Mode =
  'count' | 'compare' | 'bond' | 'missing' | 'equation' | 'sandbox';
export type ErrorTag =
  | 'overcount'
  | 'undercount'
  | 'compareFlip'
  | 'equalsAsResult'
  | 'capacity'
  | 'wrongPrediction';
export interface LevelState {
  levelId: string;
  pans: Record<Side, PlacedItem[]>;
  phase: 'intro' | 'playing' | 'awaitingSettle' | 'success' | 'revealing';
  solutionsFound: string[];
  prediction?: Side | 'equal';
  attempts: number;
  hintLevel: 0 | 1 | 2 | 3;
  hintsUsed: number;
  errors: ErrorTag[];
  startedAt: number;
  level: LevelDefinition;
  hint: HintState;
  idleHintSec: IdleHintSec;
  now: number;
  lastChangedAt: number;
  dragging: boolean;
  pendingEvaluation: boolean;
  nextUid: number;
  outcome?: 'solution' | 'duplicate' | 'wrongPrediction';
}

// Reducer metadata is explicit: no timers, random IDs, or wall-clock reads in core.

export type LevelAction =
  | { type: 'place'; side: Side; item: ItemSpec; at?: number }
  | { type: 'remove'; side: Side; uid: string; at?: number }
  | { type: 'predict'; choice: Side | 'equal'; at?: number }
  | { type: 'requestHint'; at?: number }
  | { type: 'settle'; at?: number; dragging?: boolean }
  | { type: 'tick'; at?: number; dragging?: boolean };

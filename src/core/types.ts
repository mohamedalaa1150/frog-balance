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
}

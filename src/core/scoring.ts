import { panWeight } from './balance';
import type { LevelDefinition } from './levelSchema';
import type { ErrorTag, ItemSpec } from './types';
import type { HintLevel } from './hints';

export function stars(hintsUsed: number, maxHintLevel: HintLevel): 1 | 2 | 3 {
  return hintsUsed === 0 ? 3 : maxHintLevel <= 2 ? 2 : 1;
}
export function classifyError(
  level: LevelDefinition,
  pans: Record<'left' | 'right', readonly ItemSpec[]>,
  idleMs: number,
  idleHintSec = 12,
): ErrorTag[] {
  if (level.workPan === null) return [];
  const work = panWeight(pans[level.workPan]);
  const otherSide = level.workPan === 'left' ? 'right' : 'left';
  const other = panWeight(pans[otherSide]);
  if (level.mode === 'count') {
    if (work - other === 1 || work - other === 2) return ['overcount'];
    if (work < other && idleHintSec > 0 && idleMs >= idleHintSec * 1000)
      return ['undercount'];
  }
  if (
    level.mode === 'equation' &&
    work ===
      panWeight(level.fixed[otherSide]) + panWeight(level.fixed[level.workPan])
  )
    return ['equalsAsResult'];
  return [];
}
export function classifyRejection(
  reason: 'capacity' | 'wrongPrediction',
): ErrorTag {
  return reason;
}

import type { SaveV1 } from './progress';
import type { ErrorTag, LevelState } from './types';
import { stars } from './scoring';
import { isWorldUnlocked } from './progress';

export function recordCompletion(save: SaveV1, state: LevelState, now: number) {
  const next = structuredClone(save);
  const unlocked: number[] = [];
  if (!/^w[1-6]-l[1-8]$/.test(state.levelId)) return { save: next, unlocked };
  const old = next.levels[state.levelId];
  const errors = { ...old?.errors };
  for (const tag of state.errors) errors[tag] = (errors[tag] ?? 0) + 1;
  next.levels[state.levelId] = {
    bestStars: Math.max(
      old?.bestStars ?? 0,
      stars(state.hintsUsed, state.hint.maxLevel),
    ) as 1 | 2 | 3,
    plays: (old?.plays ?? 0) + 1,
    totalAttempts: (old?.totalAttempts ?? 0) + state.attempts,
    totalHints: (old?.totalHints ?? 0) + state.hintsUsed,
    errors,
    lastPlayed: now,
  };
  for (let world = 2; world <= 6; world++)
    if (!isWorldUnlocked(save, world) && isWorldUnlocked(next, world))
      unlocked.push(world);
  return { save: next, unlocked };
}

export function dashboard(save: SaveV1) {
  const totals: Partial<Record<ErrorTag, number>> = {};
  const worlds = Array.from({ length: 6 }, (_, i) => {
    const entries = Object.entries(save.levels)
      .filter(([id]) => id.startsWith(`w${i + 1}-`))
      .map(([, value]) => value);
    let plays = 0,
      hints = 0,
      mastered = 0;
    for (const entry of entries) {
      plays += entry.plays;
      hints += entry.totalHints;
      if (entry.bestStars >= 2) mastered++;
      for (const [tag, count] of Object.entries(entry.errors)) {
        const key = tag as ErrorTag;
        totals[key] = (totals[key] ?? 0) + count;
      }
    }
    return {
      world: i + 1,
      mastery: (mastered / 8) * 100,
      averageHints: plays ? hints / plays : 0,
    };
  });
  const topErrors = Object.entries(totals)
    .sort((a, b) => b[1]! - a[1]!)
    .slice(0, 3)
    .map(([tag, count]) => ({ tag: tag as ErrorTag, count: count! }));
  const recommendation =
    topErrors[0]?.tag === 'equalsAsResult'
      ? 'recommend_equation'
      : topErrors[0]?.tag === 'compareFlip' ||
          topErrors[0]?.tag === 'wrongPrediction'
        ? 'recommend_compare'
        : 'recommend_count';
  return { worlds, topErrors, recommendation };
}

/** CSV cells are quoted, escaped, and protected against spreadsheet formulas. */
export function progressCsv(save: SaveV1, header: readonly string[]): string {
  const cell = (value: string | number) =>
    `"${String(value)
      .replace(/^[=+@-]/, "'$&")
      .replaceAll('"', '""')}"`;
  const rows: (string | number)[][] = [Array.from(header)];
  for (const [id, entry] of Object.entries(save.levels))
    rows.push([
      id,
      entry.bestStars,
      entry.plays,
      entry.totalAttempts,
      entry.totalHints,
      JSON.stringify(entry.errors),
    ]);
  return '\ufeff' + rows.map((row) => row.map(cell).join(',')).join('\r\n');
}

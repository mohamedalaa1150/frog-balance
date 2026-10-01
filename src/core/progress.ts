import { z } from 'zod';
import type { ErrorTag } from './types';
import type { NumeralSystem } from './numerals';
import type { IdleHintSec } from './hints';
import type { PracticeMode, PracticeState } from './generator';

export const SAVE_KEY = 'frogBalance.save';
export interface SaveV1 {
  version: 1;
  settings: {
    numerals: NumeralSystem;
    voCount: boolean;
    music: number;
    sfx: number;
    vo: number;
    reducedMotion: 'system' | 'on' | 'off';
    idleHintSec: IdleHintSec;
  };
  levels: Record<
    string,
    {
      bestStars: 0 | 1 | 2 | 3;
      plays: number;
      totalAttempts: number;
      totalHints: number;
      errors: Partial<Record<ErrorTag, number>>;
      lastPlayed: number;
    }
  >;
  practice: PracticeState;
}
const count = z.number().int().nonnegative();
const errorTags = z.enum([
  'overcount',
  'undercount',
  'compareFlip',
  'equalsAsResult',
  'capacity',
  'wrongPrediction',
]);
const volume = z.number().min(0).max(1);
const Settings = z.strictObject({
  numerals: z.enum(['arabic-indic', 'western']).default('arabic-indic'),
  voCount: z.boolean().default(true),
  music: volume.default(0.3),
  sfx: volume.default(0.8),
  vo: volume.default(1),
  reducedMotion: z.enum(['system', 'on', 'off']).default('system'),
  idleHintSec: z
    .union([z.literal(8), z.literal(12), z.literal(20), z.literal(0)])
    .default(12),
});
const Save = z.strictObject({
  version: z.literal(1),
  settings: Settings.prefault({}),
  levels: z
    .record(
      z.string().regex(/^w[1-6]-l[1-8]$/),
      z.strictObject({
        bestStars: z.union([
          z.literal(0),
          z.literal(1),
          z.literal(2),
          z.literal(3),
        ]),
        plays: count,
        totalAttempts: count,
        totalHints: count,
        errors: z.partialRecord(errorTags, count),
        lastPlayed: z.number().nonnegative(),
      }),
    )
    .default({}),
  practice: z
    .strictObject({
      band: z.number().int().min(1).max(10).default(1),
      streak: z.number().int().min(-1).max(2).default(0),
    })
    .prefault({}),
});
export function defaults(): SaveV1 {
  return Save.parse({ version: 1 });
}
/** Version 0 (or an unversioned save) used the same fields without defaults.
 * Fill missing fields, preserve validated progress, and reject corrupt/future saves. */
export function migrate(raw: unknown): SaveV1 {
  try {
    const value: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (typeof value !== 'object' || value === null || Array.isArray(value))
      return defaults();
    const record = value as Record<string, unknown>;
    if (
      record.version !== undefined &&
      record.version !== 0 &&
      record.version !== 1
    )
      return defaults();
    const parsed = Save.safeParse({ ...record, version: 1 });
    return parsed.success ? parsed.data : defaults();
  } catch {
    return defaults();
  }
}
export function isWorldUnlocked(save: SaveV1, world: number): boolean {
  if (!Number.isInteger(world) || world < 1 || world > 6) return false;
  if (world === 1) return true;
  let completed = 0;
  for (let i = 1; i <= 8; i++)
    if ((save.levels[`w${world - 1}-l${i}`]?.bestStars ?? 0) >= 1) completed++;
  return completed >= 6 && isWorldUnlocked(save, world - 1);
}
export function isLevelUnlocked(
  save: SaveV1,
  world: number,
  index: number,
): boolean {
  return (
    Number.isInteger(index) &&
    index >= 1 &&
    index <= 8 &&
    isWorldUnlocked(save, world) &&
    (index === 1 ||
      (save.levels[`w${world}-l${index - 1}`]?.bestStars ?? 0) >= 1)
  );
}
export function unlockedModes(save: SaveV1): PracticeMode[] {
  const modes: PracticeMode[] = ['count'];
  if (isLevelUnlocked(save, 2, 6)) modes.push('missing');
  if (isWorldUnlocked(save, 3)) modes.push('compare');
  if (isWorldUnlocked(save, 4)) modes.push('bond');
  if (isWorldUnlocked(save, 5) && !modes.includes('missing'))
    modes.push('missing');
  if (isWorldUnlocked(save, 6)) modes.push('equation');
  return modes;
}

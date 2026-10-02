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
const LevelProgress = z.strictObject({
  bestStars: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  plays: count,
  totalAttempts: count,
  totalHints: count,
  errors: z.partialRecord(errorTags, count),
  lastPlayed: z.number().nonnegative(),
});
const Save = z.strictObject({
  version: z.literal(1),
  settings: Settings.prefault({}),
  levels: z
    .record(z.string().regex(/^w[1-6]-l[1-8]$/), LevelProgress)
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
export interface MigrationResult {
  save: SaveV1;
  droppedPaths: string[];
}
const recordOf = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
/** Repair fields independently so one corrupt entry cannot erase valid stars.
 * Reports discarded or replaced paths; a valid save has an empty report. */
export function migrateWithReport(raw: unknown): MigrationResult {
  const save = defaults();
  const droppedPaths: string[] = [];
  const drop = (path: string): void => {
    droppedPaths.push(path);
  };
  try {
    const value: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const record = recordOf(value);
    if (!record) return { save, droppedPaths: ['$'] };
    if (typeof record.version === 'number' && record.version > 1)
      return { save, droppedPaths: ['version'] };
    if (
      record.version !== undefined &&
      record.version !== 0 &&
      record.version !== 1
    )
      drop('version');
    for (const key of Object.keys(record))
      if (!['version', 'settings', 'levels', 'practice'].includes(key))
        drop(key);

    const settings = recordOf(record.settings);
    if (record.settings !== undefined && !settings) drop('settings');
    const repairedSettings: Record<string, unknown> = {};
    for (const key of Object.keys(
      Settings.shape,
    ) as (keyof SaveV1['settings'])[]) {
      const parsed = Settings.shape[key].safeParse(settings?.[key]);
      repairedSettings[key] = parsed.success ? parsed.data : save.settings[key];
      if (!parsed.success) drop(`settings.${key}`);
    }
    for (const key of Object.keys(settings ?? {}))
      if (!Object.hasOwn(Settings.shape, key)) drop(`settings.${key}`);
    save.settings = Settings.parse(repairedSettings);

    const levels = recordOf(record.levels);
    if (record.levels !== undefined && !levels) drop('levels');
    const clampCount = (value: unknown, path: string): unknown => {
      if (typeof value === 'number' && Number.isFinite(value) && value < 0) {
        drop(path);
        return 0;
      }
      return value;
    };
    for (const [id, rawEntry] of Object.entries(levels ?? {})) {
      const path = `levels.${id}`;
      const entry = recordOf(rawEntry);
      if (!/^w[1-6]-l[1-8]$/.test(id) || !entry) {
        drop(path);
        continue;
      }
      const errors: SaveV1['levels'][string]['errors'] = {};
      const rawErrors = recordOf(entry.errors);
      if (entry.errors !== undefined && !rawErrors) drop(`${path}.errors`);
      for (const [tag, amount] of Object.entries(rawErrors ?? {})) {
        const errorPath = `${path}.errors.${tag}`;
        const parsedTag = errorTags.safeParse(tag);
        if (!parsedTag.success) {
          drop(errorPath);
          continue;
        }
        const parsedCount = count.safeParse(clampCount(amount, errorPath));
        if (parsedCount.success) errors[parsedTag.data] = parsedCount.data;
        else drop(errorPath);
      }
      const parsed = LevelProgress.safeParse({
        bestStars: entry.bestStars,
        plays: clampCount(entry.plays, `${path}.plays`),
        totalAttempts: clampCount(entry.totalAttempts, `${path}.totalAttempts`),
        totalHints: clampCount(entry.totalHints, `${path}.totalHints`),
        errors,
        lastPlayed: entry.lastPlayed,
      });
      if (parsed.success) save.levels[id] = parsed.data;
      else drop(path);
      for (const key of Object.keys(entry))
        if (!Object.hasOwn(LevelProgress.shape, key)) drop(`${path}.${key}`);
    }

    const practice = recordOf(record.practice);
    if (record.practice !== undefined && !practice) drop('practice');
    const clampPractice = (
      key: 'band' | 'streak',
      min: number,
      max: number,
    ): number => {
      const value = practice?.[key];
      if (value === undefined) return save.practice[key];
      const repaired =
        typeof value === 'number' && Number.isFinite(value)
          ? Math.max(min, Math.min(max, Math.trunc(value)))
          : save.practice[key];
      if (repaired !== value) drop(`practice.${key}`);
      return repaired;
    };
    save.practice = {
      band: clampPractice('band', 1, 10),
      streak: clampPractice('streak', -1, 2),
    };
    for (const key of Object.keys(practice ?? {}))
      if (key !== 'band' && key !== 'streak') drop(`practice.${key}`);
    return { save, droppedPaths };
  } catch {
    return { save: defaults(), droppedPaths: ['$'] };
  }
}
export function migrate(raw: unknown): SaveV1 {
  return migrateWithReport(raw).save;
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

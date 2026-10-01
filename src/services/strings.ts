import strings from '../../content/strings.ar.json' with { type: 'json' };
import type { LevelDefinition } from '../core/levelSchema';

export type StringKey = Exclude<keyof typeof strings, '_note'>;

export function hasString(key: string): key is StringKey {
  return (
    key !== '_note' &&
    Object.hasOwn(strings, key) &&
    typeof strings[key as StringKey] === 'string' &&
    strings[key as StringKey].trim().length > 0
  );
}

export function t(key: StringKey): string {
  if (hasString(key)) return strings[key];
  if (import.meta.env.DEV) throw new Error(`Missing string key: ${key}`);
  return key;
}

/** Content references must resolve even when the runtime production lookup is forgiving. */
export function validateVoKeys(levels: readonly LevelDefinition[]): void {
  for (const level of levels) {
    for (const field of ['intro', 'success'] as const) {
      const key = level.vo[field];
      if (key !== undefined && !hasString(key)) {
        throw new Error(
          `Missing string key '${key}' referenced by ${level.id}.vo.${field}`,
        );
      }
    }
  }
}

import { afterEach, describe, expect, it, vi } from 'vitest';
import strings from '../../content/strings.ar.json';
import content from '../../content/levels.json';
import { LevelsFile } from '../../src/core/levelSchema';
import {
  hasString,
  t,
  validateVoKeys,
  type StringKey,
} from '../../src/services/strings';

afterEach(() => vi.unstubAllEnvs());

describe('Arabic content strings', () => {
  it.each(
    Object.keys(strings).filter((key): key is StringKey => key !== '_note'),
  )('%s resolves to non-empty text', (key) => {
    expect(t(key).trim().length).toBeGreaterThan(0);
  });
  it('excludes metadata and inherited properties', () => {
    expect(hasString('_note')).toBe(false);
    expect(hasString('toString')).toBe(false);
  });
  it('throws for a missing key in development', () => {
    vi.stubEnv('DEV', true);
    expect(() => t('missing-key' as StringKey)).toThrow(
      'Missing string key: missing-key',
    );
  });
  it('returns a missing key in production', () => {
    vi.stubEnv('DEV', false);
    expect(t('missing-key' as StringKey)).toBe('missing-key');
  });
  it('resolves every authored VO key', () => {
    const levels = LevelsFile.parse(content).levels;
    expect(() => validateVoKeys(levels)).not.toThrow();
    for (const level of levels) expect(hasString(level.vo.intro)).toBe(true);
  });
  it('rejects a broken VO reference with its level and field', () => {
    const levels = LevelsFile.parse(content).levels;
    levels[0]!.vo.intro = 'missing-intro';
    expect(() => validateVoKeys(levels)).toThrow(
      "Missing string key 'missing-intro' referenced by w1-l1.vo.intro",
    );
  });
});

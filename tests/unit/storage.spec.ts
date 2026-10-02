import { afterEach, expect, it, vi } from 'vitest';
import { defaults, SAVE_KEY } from '../../src/core/progress';
import { readSave, resetSave, writeSave } from '../../src/services/storage';
afterEach(() => {
  vi.unstubAllGlobals();
  resetSave();
});
it('reads migrated settings and writes the versioned local save', () => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  });
  resetSave();
  const save = defaults();
  save.settings.voCount = false;
  save.settings.numerals = 'western';
  writeSave(save);
  expect(JSON.parse(store.get(SAVE_KEY)!)).toEqual(save);
  expect(readSave()).toEqual(save);
  store.set(SAVE_KEY, 'corrupt');
  expect(readSave()).toEqual(defaults());
});
it('disabled storage preserves an independent memory save and reset still works', () => {
  const blocked = () => {
    throw new Error('storage disabled');
  };
  vi.stubGlobal('localStorage', {
    getItem: blocked,
    setItem: blocked,
    removeItem: blocked,
  });
  resetSave();
  const save = defaults();
  save.settings.voCount = false;
  expect(() => writeSave(save)).not.toThrow();
  const copy = readSave();
  expect(copy.settings.voCount).toBe(false);
  copy.settings.voCount = true;
  expect(readSave().settings.voCount).toBe(false);
  expect(() => resetSave()).not.toThrow();
  expect(readSave()).toEqual(defaults());
});

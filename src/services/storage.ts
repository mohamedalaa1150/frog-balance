import { defaults, migrate, SAVE_KEY, type SaveV1 } from '../core/progress';
let memory = defaults();
export function readSave(): SaveV1 {
  try {
    memory = migrate(localStorage.getItem(SAVE_KEY) ?? memory);
  } catch {
    /* Use the last in-memory save. */
  }
  return structuredClone(memory);
}
export function writeSave(save: SaveV1): void {
  memory = structuredClone(save);
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(memory));
  } catch {
    /* Storage may be disabled. */
  }
}
export function resetSave(): void {
  memory = defaults();
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* In-memory reset remains available. */
  }
}

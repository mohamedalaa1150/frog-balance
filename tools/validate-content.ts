import { readFile } from 'node:fs/promises';
import { LevelsFile } from '../src/core/levelSchema';
import { validateVoKeys } from '../src/services/strings';

const raw: unknown = JSON.parse(
  await readFile(new URL('../content/levels.json', import.meta.url), 'utf8'),
);
const result = LevelsFile.safeParse(raw);
if (!result.success) {
  console.error(result.error.message);
  process.exitCode = 1;
} else {
  try {
    validateVoKeys(result.data.levels);
    console.log(
      `Validated ${result.data.levels.length} authored levels (schema + unique matching IDs + VO string keys).`,
    );
    console.log('Solvability validation is scheduled for Phase 1.');
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

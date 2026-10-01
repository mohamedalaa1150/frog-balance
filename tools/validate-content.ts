import { readFile } from 'node:fs/promises';
import { LevelsFile } from '../src/core/levelSchema';

const raw: unknown = JSON.parse(
  await readFile(new URL('../content/levels.json', import.meta.url), 'utf8'),
);
const result = LevelsFile.safeParse(raw);
if (!result.success) {
  console.error(result.error.message);
  process.exitCode = 1;
} else {
  console.log(
    `Validated ${result.data.levels.length} authored levels (schema + unique matching IDs).`,
  );
  console.log('Solvability validation is scheduled for Phase 1.');
}

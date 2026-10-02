import { readFile } from 'node:fs/promises';
import {
  enumerateSolutions,
  isSolvable,
  levelNeed,
} from '../src/core/levelLogic';
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
    const rows = result.data.levels.map((level) => ({
      id: level.id,
      mode: level.mode,
      need: levelNeed(level),
      '#solutions': enumerateSolutions(level).length,
      ok: isSolvable(level),
    }));
    console.table(rows);
    if (rows.some((row) => !row.ok))
      throw new Error('Unsolvable authored level(s)');
    console.log(`OK — ${rows.length} levels valid and solvable.`);
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

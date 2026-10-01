import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { LevelsFile } from '../src/core/levelSchema';
import {
  enumerateSolutions,
  isSolvable,
  levelNeed,
} from '../src/core/levelLogic';

const levels = LevelsFile.parse(
  JSON.parse(
    readFileSync(new URL('../content/levels.json', import.meta.url), 'utf8'),
  ),
).levels;
const python: unknown = JSON.parse(readFileSync(0, 'utf8'));
const ts = levels.map((level) => ({
  id: level.id,
  mode: level.mode,
  need: levelNeed(level),
  solutions: enumerateSolutions(level).length,
  ok: isSolvable(level),
}));
assert.deepEqual(ts, python);
console.log(
  'OK — TypeScript and Python agree on all 48 solution counts and solvability results.',
);

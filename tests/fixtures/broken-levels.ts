import content from '../../content/levels.json';
import { LevelsFile } from '../../src/core/levelSchema';

const levels = LevelsFile.parse(content).levels;
const clone = (id: string) => structuredClone(levels.find((l) => l.id === id)!);
const noSupply = clone('w1-l1');
noSupply.tray.frogs = false;
const noNeed = clone('w5-l1');
noNeed.fixed.right = structuredClone(noNeed.fixed.left);
const capacity = clone('w1-l1');
capacity.fixed.left = Array.from({ length: 4 }, () => ({
  kind: 'number' as const,
  value: 1,
}));
const bonds = clone('w4-l5');
bonds.tray.numbers = [1, 4];
const emptyCompare = clone('w3-l1');
emptyCompare.fixed.left = [];
export const brokenLevels = [noSupply, noNeed, capacity, bonds, emptyCompare];

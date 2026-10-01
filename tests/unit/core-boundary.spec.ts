import { ESLint } from 'eslint';
import { expect, it } from 'vitest';
const eslint = new ESLint();
it.each([
  'phaser',
  'phaser/src/phaser',
  'react-dom',
  'node:fs',
  '../scenes/TitleScene',
  '../../src/services/storage',
  '../core/../../scenes/TitleScene',
  '@/objects/Pan',
])('ESLint rejects core import %s', async (source) => {
  const results = await eslint.lintText(`import '${source}';`, {
    filePath: 'src/core/boundary.ts',
  });
  expect(
    results[0]!.messages.some((m) => m.ruleId === 'no-restricted-imports'),
  ).toBe(true);
});
it.each(['./balance', './types', '../config', '../config.ts', 'zod'])(
  'ESLint permits pure import %s',
  async (source) => {
    const results = await eslint.lintText(`import '${source}';`, {
      filePath: 'src/core/boundary.ts',
    });
    expect(results[0]!.messages).toEqual([]);
  },
);
it.each(['window', 'document', 'navigator', 'localStorage'])(
  'ESLint rejects browser global %s',
  async (name) => {
    const results = await eslint.lintText(`${name};`, {
      filePath: 'src/core/boundary.ts',
    });
    expect(
      results[0]!.messages.some((m) => m.ruleId === 'no-restricted-globals'),
    ).toBe(true);
  },
);
it('rejects renderer configs and dynamic imports', async () => {
  const results = await eslint.lintText(
    "import '../scenes/config'; import('phaser');",
    { filePath: 'src/core/boundary.ts' },
  );
  expect(results[0]!.messages.map((m) => m.ruleId)).toContain(
    'no-restricted-imports',
  );
  expect(results[0]!.messages.map((m) => m.ruleId)).toContain(
    'no-restricted-syntax',
  );
});

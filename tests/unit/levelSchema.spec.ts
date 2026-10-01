import { describe, expect, it } from 'vitest';
import content from '../../content/levels.json';
import { Item, Level, LevelsFile } from '../../src/core/levelSchema';

describe('level content schema', () => {
  it('accepts all 48 authored levels without changing content', () => {
    const parsed = LevelsFile.parse(content);
    expect(parsed.levels).toHaveLength(48);
    expect(new Set(parsed.levels.map((level) => level.world))).toEqual(
      new Set([1, 2, 3, 4, 5, 6]),
    );
  });
  it.each([
    { kind: 'frog' },
    { kind: 'number', value: 1 },
    { kind: 'number', value: 10 },
  ])('accepts valid item %j', (item) =>
    expect(Item.safeParse(item).success).toBe(true),
  );
  it.each([
    { kind: 'frog', value: 1 },
    { kind: 'number' },
    { kind: 'number', value: 0 },
    { kind: 'number', value: 11 },
    { kind: 'number', value: 1.5 },
    { kind: 'other' },
  ])('rejects invalid item %j', (item) =>
    expect(Item.safeParse(item).success).toBe(false),
  );
  it('requires exactly 48 authored levels', () => {
    const broken = structuredClone(content);
    broken.levels.pop();
    expect(LevelsFile.safeParse(broken).success).toBe(false);
  });
  it('rejects duplicate IDs', () => {
    const broken = structuredClone(content);
    broken.levels[1] = structuredClone(broken.levels[0]!);
    expect(
      LevelsFile.safeParse(broken).error?.issues.some(
        (issue) => issue.message === 'duplicate level ids',
      ),
    ).toBe(true);
  });
  it('requires the authored ID to match world and index', () => {
    const broken = structuredClone(content);
    broken.levels[0]!.id = 'w2-l1';
    expect(
      LevelsFile.safeParse(broken).error?.issues.some(
        (issue) => issue.message === 'authored ids must be w<world>-l<index>',
      ),
    ).toBe(true);
  });
  it('accepts practice IDs only outside the authored file', () => {
    const level = { ...content.levels[0], id: 'practice-42' };
    expect(Level.safeParse(level).success).toBe(true);
    const broken = structuredClone(content);
    broken.levels[0]!.id = 'practice-42';
    expect(LevelsFile.safeParse(broken).success).toBe(false);
  });
  it.each([
    { id: 'w7-l1' },
    { world: 0 },
    { index: 9 },
    { mode: 'sandbox' },
    { workPan: 'middle' },
    { childLimits: { maxNumbers: 4, maxFrogs: 10 } },
    { tray: { frogs: true, numbers: [11] } },
    {
      goal: {
        type: 'balanceMulti',
        requiredSolutions: 5,
        childNumbersExactly: 2,
      },
    },
    {
      goal: {
        type: 'balanceMulti',
        requiredSolutions: 2,
        childNumbersExactly: 0,
      },
    },
  ])('rejects out-of-schema level fields %j', (patch) => {
    expect(Level.safeParse({ ...content.levels[0], ...patch }).success).toBe(
      false,
    );
  });

  it.each([
    { showEqation: true },
    { fixed: { ...content.levels[0]!.fixed, lef: [] } },
    { tray: { ...content.levels[0]!.tray, frog: true } },
    { childLimits: { ...content.levels[0]!.childLimits, maxNumber: 1 } },
    { vo: { ...content.levels[0]!.vo, succes: 'success_1' } },
    { goal: { type: 'balance', typo: true } },
    { goal: { type: 'predict', typo: true } },
    {
      goal: {
        type: 'balanceMulti',
        requiredSolutions: 2,
        childNumbersExactly: 2,
        typo: true,
      },
    },
  ])('rejects unknown level/nested keys %j', (patch) => {
    const result = Level.safeParse({ ...content.levels[0], ...patch });
    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some((issue) => issue.code === 'unrecognized_keys'),
    ).toBe(true);
    const issue = result.error?.issues.find(
      (issue) => issue.code === 'unrecognized_keys',
    );
    if (issue?.code !== 'unrecognized_keys')
      throw new Error('Expected unknown-key error');
    for (const key of issue.keys) expect(issue.message).toContain(key);
  });

  it('reports the unknown key in both item and file-root errors', () => {
    expect(Item.safeParse({ kind: 'frog', vaule: 1 }).error?.message).toContain(
      'vaule',
    );
    expect(
      LevelsFile.safeParse({ ...content, verson: 1 }).error?.message,
    ).toContain('verson');
  });
});

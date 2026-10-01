import { z } from 'zod';

export const Item = z
  .object({
    kind: z.enum(['frog', 'number']),
    value: z.number().int().min(1).max(10).optional(),
  })
  .refine((item) =>
    item.kind === 'frog' ? item.value === undefined : item.value !== undefined,
  );

export const Level = z.object({
  id: z.string().regex(/^(w[1-6]-l[1-8]|practice-\d+)$/),
  world: z.number().int().min(1).max(6),
  index: z.number().int().min(1).max(8),
  mode: z.enum(['count', 'compare', 'bond', 'missing', 'equation']),
  fixed: z.object({ left: z.array(Item), right: z.array(Item) }),
  workPan: z.enum(['left', 'right']).nullable(),
  tray: z.object({
    frogs: z.boolean(),
    numbers: z.array(z.number().int().min(1).max(10)),
  }),
  childLimits: z.object({
    maxNumbers: z.number().int().min(0).max(3),
    maxFrogs: z.number().int().min(0).max(10),
  }),
  goal: z.discriminatedUnion('type', [
    z.object({ type: z.literal('balance') }),
    z.object({ type: z.literal('predict') }),
    z.object({
      type: z.literal('balanceMulti'),
      requiredSolutions: z.number().int().min(1).max(4),
      childNumbersExactly: z.number().int().min(1).max(2),
    }),
  ]),
  showEquation: z.boolean(),
  guideArrow: z.boolean(),
  vo: z.object({ intro: z.string(), success: z.string().optional() }),
});

export const LevelsFile = z
  .object({ version: z.literal(1), levels: z.array(Level).length(48) })
  .refine(
    (file) =>
      file.levels.every(
        (level) => level.id === `w${level.world}-l${level.index}`,
      ),
    'authored ids must be w<world>-l<index>',
  )
  .refine(
    (file) => new Set(file.levels.map((level) => level.id)).size === 48,
    'duplicate level ids',
  );

export type LevelDefinition = z.infer<typeof Level>;
export type LevelsContent = z.infer<typeof LevelsFile>;

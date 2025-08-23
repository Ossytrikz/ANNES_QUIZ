import { z } from 'zod';

export const OptionSchema = z.object({ id: z.string(), text: z.string().min(1) });

export const McSingleMeta = z.object({
  options: z.array(OptionSchema).min(2),
  correct: z.string(),
  shuffleOptions: z.boolean().optional().default(true),
});

export const McMultiMeta = z.object({
  options: z.array(OptionSchema).min(2),
  correct: z.array(z.string()).min(1),
  shuffleOptions: z.boolean().optional().default(true),
  partialCredit: z.enum(['none','proportional','all-or-nothing']).optional().default('proportional')
});

export const ShortTextMeta = z.object({
  accepted: z.array(z.string().min(1)).min(1),
  caseSensitive: z.boolean().optional().default(false),
  normalize: z.string().optional(),
  fuzzy: z.object({ maxDistance: z.number().int().min(0).max(3) }).optional()
});

export const TrueFalseMeta = z.object({ correct: z.boolean() });

export const OpenMeta = z.object({
  rubric: z.string().min(1),
  maxChars: z.number().int().min(1).max(10000).optional().default(1000),
  aiAssist: z.boolean().optional().default(false)
});

export const OrderingMeta = z.object({
  items: z.array(OptionSchema).min(2),
  correctOrder: z.array(z.string()).min(2),
  partialCredit: z.enum(['none','pairwise']).optional().default('pairwise')
});

export const MatchingMeta = z.object({
  left: z.array(OptionSchema).min(1),
  right: z.array(OptionSchema).min(1),
  correctMap: z.record(z.string(), z.string()),
  shuffleSides: z.boolean().optional().default(true),
  partialCredit: z.enum(['none','perPair']).optional().default('perPair')
});

export const MetaByType = {
  mc_single: McSingleMeta,
  mc_multi: McMultiMeta,
  short_text: ShortTextMeta,
  true_false: TrueFalseMeta,
  open: OpenMeta,
  ordering: OrderingMeta,
  matching: MatchingMeta,
} as const;

export const QuestionBase = z.object({
  id: z.string().uuid().optional(),
  quiz_id: z.string().uuid(),
  type: z.enum(['mc_single','mc_multi','short_text','true_false','open','ordering','matching']),
  stem: z.string().min(1),
  meta: z.unknown(),
  explanation: z.string().optional().nullable(),
  points: z.number().min(0.01).max(999999).default(1),
  order_index: z.number().int().min(0).default(0)
});

export const ResponseSchemas = {
  mc_single: z.object({ choice: z.string() }),
  mc_multi: z.object({ choices: z.array(z.string()) }),
  short_text: z.object({ text: z.string() }),
  true_false: z.object({ value: z.boolean() }),
  open: z.object({ text: z.string() }),
  ordering: z.object({ order: z.array(z.string()) }),
  matching: z.object({ map: z.record(z.string(), z.string()) }),
} as const;

export type QuestionInput = z.infer<typeof QuestionBase> & { meta: any };

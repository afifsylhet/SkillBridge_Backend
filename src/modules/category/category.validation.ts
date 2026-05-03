// zod schemas for category routes. See prd.md §5.3.2 / §8.7.
import { z } from 'zod';

export const ICON_KEYS = [
  'code',
  'chart',
  'palette',
  'book',
  'globe',
  'flask',
  'music',
  'briefcase',
] as const;

export const categoryCreateSchema = z.object({
  name: z.string().min(2).max(80),
  iconKey: z.enum(ICON_KEYS).optional(),
});

export const categoryUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  iconKey: z.enum(ICON_KEYS).nullable().optional(),
});

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;

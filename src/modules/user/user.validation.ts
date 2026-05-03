// zod schemas for user routes. See prd.md §5.3.
import { z } from 'zod';

export const updateMeSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

export type UpdateMeInput = z.infer<typeof updateMeSchema>;

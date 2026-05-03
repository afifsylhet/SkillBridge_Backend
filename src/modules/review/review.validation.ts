// zod schemas for review. See prd.md §5.3.5.
import { z } from 'zod';

export const reviewCreateSchema = z.object({
  bookingId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1).max(2000),
});

export const reviewListQuerySchema = z.object({
  tutorProfileId: z.string().optional(),
});

export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>;

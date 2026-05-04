// zod schemas for booking. See prd.md §5.3.4 / §6.
import { z } from 'zod';

export const ALLOWED_DURATIONS = [30, 60, 90, 120] as const;

export const bookingCreateSchema = z.object({
  tutorProfileId: z.string().min(1),
  scheduledAt: z
    .string()
    .datetime({ message: 'scheduledAt must be a valid ISO 8601 datetime' })
    .refine((s) => new Date(s).getTime() > Date.now(), {
      message: 'scheduledAt must be in the future',
    }),
  durationMin: z
    .number()
    .int()
    .refine((d) => (ALLOWED_DURATIONS as readonly number[]).includes(d), {
      message: 'durationMin must be 30, 60, 90, or 120',
    }),
  notes: z.string().max(2000).optional(),
});

export const bookingListQuerySchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).optional(),
});

export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
export type BookingListQuery = z.infer<typeof bookingListQuerySchema>;

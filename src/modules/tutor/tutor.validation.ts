// zod schemas for tutor profile + availability. See prd.md §5.3.3 / §6.
import { z } from 'zod';

export const profileSchema = z.object({
  bio: z.string().min(1).max(2000),
  headline: z.string().max(200).optional(),
  hourlyRate: z.number().int().nonnegative(),
  experience: z.number().int().min(0).max(80),
  categoryIds: z.array(z.string().min(1)),
  isPublished: z.boolean(),
});

export const weekdayEnum = z.enum([
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]);

export const availabilitySchema = z.object({
  slots: z
    .array(
      z
        .object({
          weekday: weekdayEnum,
          startMinute: z.number().int().min(0).max(1440),
          endMinute: z.number().int().min(0).max(1440),
        })
        .refine((s) => s.startMinute < s.endMinute, {
          message: 'startMinute must be less than endMinute',
        }),
    )
    .max(50),
});

export const tutorListQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(['rating', 'priceAsc', 'priceDesc', 'newest']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type AvailabilityInput = z.infer<typeof availabilitySchema>;
export type TutorListQuery = z.infer<typeof tutorListQuerySchema>;

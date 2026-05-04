// Admin endpoint validation schemas. See prd.md §5.3.6.
import { z } from 'zod';

export const updateUserBanStatusSchema = z.object({
  isBanned: z.boolean(),
});

export const adminUserListQuerySchema = z.object({
  role: z.enum(['STUDENT', 'TUTOR', 'ADMIN']).optional(),
  banned: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const adminBookingListQuerySchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export type UpdateUserBanStatusInput = z.infer<typeof updateUserBanStatusSchema>;
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
export type AdminBookingListQuery = z.infer<typeof adminBookingListQuerySchema>;

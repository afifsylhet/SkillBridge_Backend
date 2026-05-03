// Admin controller. See prd.md §5.3.6.
import type { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { ApiError } from '../../utils/ApiError.js';
import { adminService } from './admin.service.js';
import {
  adminBookingListQuerySchema,
  adminUserListQuerySchema,
  type UpdateUserBanStatusInput,
} from './admin.validation.js';

export const adminController = {
  stats: catchAsync(async (_req: Request, res: Response) => {
    const data = await adminService.getStats();
    res.json({ success: true, data });
  }),

  listUsers: catchAsync(async (req: Request, res: Response) => {
    const parsed = adminUserListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.unprocessableEntity('Invalid query', parsed.error.flatten());
    }
    const data = await adminService.listUsers(parsed.data);
    res.json({ success: true, data });
  }),

  updateUserBanStatus: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const { isBanned } = req.body as UpdateUserBanStatusInput;
    const data = await adminService.setUserBanStatus(req.user.id, req.params.id as string, isBanned);
    res.json({ success: true, data });
  }),

  listBookings: catchAsync(async (req: Request, res: Response) => {
    const parsed = adminBookingListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.unprocessableEntity('Invalid query', parsed.error.flatten());
    }
    const data = await adminService.listBookings(parsed.data);
    res.json({ success: true, data });
  }),
};

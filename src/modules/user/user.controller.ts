// User controller. See prd.md §5.3.
import type { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { userService } from './user.service.js';

export const userController = {
  getMe: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw new Error('User not authenticated');
    const user = await userService.getMe(req.user.id);
    res.json({ success: true, data: user });
  }),
  updateMe: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw new Error('User not authenticated');
    const updated = await userService.updateMe(req.user.id, req.body);
    res.json({ success: true, data: updated });
  }),
};

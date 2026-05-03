// Booking controller. See prd.md §5.3.4 / §6.
import type { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { ApiError } from '../../utils/ApiError.js';
import { bookingService } from './booking.service.js';
import { bookingListQuerySchema, type BookingCreateInput } from './booking.validation.js';

export const bookingController = {
  create: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const data = await bookingService.create(req.user.id, req.body as BookingCreateInput);
    res.status(201).json({ success: true, data });
  }),

  listForCurrentUser: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const parsed = bookingListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.unprocessableEntity('Invalid query', parsed.error.flatten());
    }
    const data = await bookingService.listForStudent(req.user.id, parsed.data.status);
    res.json({ success: true, data });
  }),

  getById: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const data = await bookingService.getByIdForUser(
      req.user.id,
      req.user.role,
      req.params.id as string,
    );
    res.json({ success: true, data });
  }),

  cancel: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const data = await bookingService.cancel(req.user.id, req.params.id as string);
    res.json({ success: true, data });
  }),
};

// Tutor controller — public + tutor-self routes. See prd.md §5.3.3 / §6.
import type { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { ApiError } from '../../utils/ApiError.js';
import { tutorService } from './tutor.service.js';
import { bookingService } from '../booking/booking.service.js';
import { tutorListQuerySchema } from './tutor.validation.js';
import type { ProfileInput, AvailabilityInput } from './tutor.validation.js';

export const tutorController = {
  list: catchAsync(async (req: Request, res: Response) => {
    const parsed = tutorListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.unprocessableEntity('Invalid query', parsed.error.flatten());
    }
    const data = await tutorService.list(parsed.data);
    res.json({ success: true, data });
  }),

  getById: catchAsync(async (req: Request, res: Response) => {
    const data = await tutorService.getById(req.params.id as string);
    res.json({ success: true, data });
  }),

  updateProfileForCurrentUser: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const data = await tutorService.updateProfileForCurrentUser(
      req.user.id,
      req.body as ProfileInput,
    );
    res.json({ success: true, data });
  }),

  setAvailabilityForCurrentUser: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const body = req.body as AvailabilityInput;
    const data = await tutorService.setAvailabilityForCurrentUser(req.user.id, body.slots);
    res.json({ success: true, data });
  }),

  getAvailabilityForCurrentUser: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const data = await tutorService.getAvailabilityForCurrentUser(req.user.id);
    res.json({ success: true, data });
  }),

  listSessionsForCurrentUser: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const data = await tutorService.listSessionsForCurrentUser(req.user.id);
    res.json({ success: true, data });
  }),

  completeSessionForCurrentUser: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const data = await tutorService.completeSessionForCurrentUser(
      req.user.id,
      req.params.id as string,
    );
    res.json({ success: true, data });
  }),

  confirmSessionForCurrentUser: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const data = await bookingService.confirmByTutor(req.user.id, req.params.id as string);
    res.json({ success: true, data });
  }),

  declineSessionForCurrentUser: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const data = await bookingService.declineByTutor(req.user.id, req.params.id as string);
    res.json({ success: true, data });
  }),
};

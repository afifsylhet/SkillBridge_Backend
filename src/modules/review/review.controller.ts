// Review controller. See prd.md §5.3.5.
import type { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { ApiError } from '../../utils/ApiError.js';
import { reviewService } from './review.service.js';
import { reviewListQuerySchema, type ReviewCreateInput } from './review.validation.js';

export const reviewController = {
  list: catchAsync(async (req: Request, res: Response) => {
    const parsed = reviewListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.unprocessableEntity('Invalid query', parsed.error.flatten());
    }
    const data = await reviewService.list(parsed.data.tutorProfileId);
    res.json({ success: true, data });
  }),

  create: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const data = await reviewService.create(req.user.id, req.body as ReviewCreateInput);
    res.status(201).json({ success: true, data });
  }),
};

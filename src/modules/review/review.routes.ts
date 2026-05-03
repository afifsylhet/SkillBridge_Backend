// Review routes. See prd.md §5.3.5.
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { reviewController } from './review.controller.js';
import { reviewCreateSchema } from './review.validation.js';

export const reviewRoutes = Router();

reviewRoutes.get('/', reviewController.list);
reviewRoutes.post(
  '/',
  authenticate,
  authorize('STUDENT'),
  validate(reviewCreateSchema),
  reviewController.create,
);

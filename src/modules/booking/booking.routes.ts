// Booking routes. See prd.md §5.3.4.
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { bookingController } from './booking.controller.js';
import { bookingCreateSchema } from './booking.validation.js';

export const bookingRoutes = Router();

bookingRoutes.use(authenticate);

bookingRoutes.post('/', authorize('STUDENT'), validate(bookingCreateSchema), bookingController.create);
bookingRoutes.get('/', authorize('STUDENT'), bookingController.listForCurrentUser);
bookingRoutes.get('/:id', bookingController.getById);
bookingRoutes.patch('/:id/cancel', authorize('STUDENT'), bookingController.cancel);

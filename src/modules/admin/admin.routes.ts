// Admin routes. See prd.md §5.3.6.
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { adminController } from './admin.controller.js';
import { updateUserBanStatusSchema } from './admin.validation.js';

export const adminRoutes = Router();

adminRoutes.use(authenticate, authorize('ADMIN'));

adminRoutes.get('/stats', adminController.stats);
adminRoutes.get('/users', adminController.listUsers);
adminRoutes.patch(
  '/users/:id',
  validate(updateUserBanStatusSchema),
  adminController.updateUserBanStatus,
);
adminRoutes.get('/bookings', adminController.listBookings);

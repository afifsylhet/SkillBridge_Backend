// Mounts all module routers under /api. See prd.md §5.3.
import { Router } from 'express';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { userRoutes } from '../modules/user/user.routes.js';
import { tutorPublicRoutes, tutorSelfRoutes } from '../modules/tutor/tutor.routes.js';
import { categoryRoutes } from '../modules/category/category.routes.js';
import { bookingRoutes } from '../modules/booking/booking.routes.js';
import { reviewRoutes } from '../modules/review/review.routes.js';
import { adminRoutes } from '../modules/admin/admin.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ success: true, data: { ok: true } });
});

apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/tutors', tutorPublicRoutes);
apiRouter.use('/tutor', tutorSelfRoutes);
apiRouter.use('/categories', categoryRoutes);
apiRouter.use('/bookings', bookingRoutes);
apiRouter.use('/reviews', reviewRoutes);
apiRouter.use('/admin', adminRoutes);

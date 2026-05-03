// Tutor routes — public + tutor-self. See prd.md §5.3.3.
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { tutorController } from './tutor.controller.js';
import { profileSchema, availabilitySchema } from './tutor.validation.js';

// Public routes mounted at /api/tutors
export const tutorPublicRoutes = Router();
tutorPublicRoutes.get('/', tutorController.list);
tutorPublicRoutes.get('/:id', tutorController.getById);

// Tutor self-service routes mounted at /api/tutor
export const tutorSelfRoutes = Router();
tutorSelfRoutes.use(authenticate, authorize('TUTOR'));
tutorSelfRoutes.put('/profile', validate(profileSchema), tutorController.updateProfileForCurrentUser);
tutorSelfRoutes.get('/availability', tutorController.getAvailabilityForCurrentUser);
tutorSelfRoutes.put('/availability', validate(availabilitySchema), tutorController.setAvailabilityForCurrentUser);
tutorSelfRoutes.get('/sessions', tutorController.listSessionsForCurrentUser);
tutorSelfRoutes.patch('/sessions/:id/complete', tutorController.completeSessionForCurrentUser);

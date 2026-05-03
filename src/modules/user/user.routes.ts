// User routes. See prd.md §5.3.
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { userController } from './user.controller.js';
import { updateMeSchema } from './user.validation.js';

export const userRoutes = Router();

userRoutes.use(authenticate);
userRoutes.get('/me', userController.getMe);
userRoutes.patch('/me', validate(updateMeSchema), userController.updateMe);

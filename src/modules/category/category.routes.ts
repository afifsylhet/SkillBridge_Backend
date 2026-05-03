// Category routes. See prd.md §5.3.
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { categoryController } from './category.controller.js';
import { categoryCreateSchema, categoryUpdateSchema } from './category.validation.js';

export const categoryRoutes = Router();

categoryRoutes.get('/', categoryController.list);
categoryRoutes.post('/', authenticate, authorize('ADMIN'), validate(categoryCreateSchema), categoryController.create);
categoryRoutes.patch('/:id', authenticate, authorize('ADMIN'), validate(categoryUpdateSchema), categoryController.update);
categoryRoutes.delete('/:id', authenticate, authorize('ADMIN'), categoryController.remove);

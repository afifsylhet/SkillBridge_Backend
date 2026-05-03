// Category controller. See prd.md §5.3.2.
import type { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { categoryService } from './category.service.js';
import type { CategoryCreateInput, CategoryUpdateInput } from './category.validation.js';

export const categoryController = {
  list: catchAsync(async (_req: Request, res: Response) => {
    const data = await categoryService.list();
    res.json({ success: true, data });
  }),

  create: catchAsync(async (req: Request, res: Response) => {
    const data = await categoryService.create(req.body as CategoryCreateInput);
    res.status(201).json({ success: true, data });
  }),

  update: catchAsync(async (req: Request, res: Response) => {
    const data = await categoryService.update(
      req.params.id as string,
      req.body as CategoryUpdateInput,
    );
    res.json({ success: true, data });
  }),

  remove: catchAsync(async (req: Request, res: Response) => {
    await categoryService.remove(req.params.id as string);
    res.json({ success: true, data: null });
  }),
};

// 404 handler for unmatched routes.
import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError.js';

export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound('Route not found'));
}

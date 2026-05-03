// Role guard middleware: authorize('ADMIN'), authorize('TUTOR', 'ADMIN'), etc.
import type { NextFunction, Request, Response } from 'express';
import type { Role } from '../types/api.js';
import { ApiError } from '../utils/ApiError.js';

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
    next();
  };
}

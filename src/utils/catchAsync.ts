// Wraps async controllers so thrown errors reach the centralized error handler.
import type { NextFunction, Request, Response } from 'express';

type Handler = (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>;

export const catchAsync =
  (fn: Handler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

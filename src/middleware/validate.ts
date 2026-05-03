// Generic zod-body validator. Replaces req.body with the parsed result.
import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { ApiError } from '../utils/ApiError.js';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(
        new ApiError(422, 'VALIDATION_ERROR', 'Invalid request body', result.error.flatten()),
      );
    }
    req.body = result.data;
    next();
  };
}

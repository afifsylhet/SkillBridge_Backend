// Centralized error → JSON envelope. See prd.md §5.1 / §5.2.
import type { ErrorRequestHandler } from 'express';
import { ApiError } from '../utils/ApiError.js';
import type { ApiFailure } from '../types/api.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    const body: ApiFailure = {
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    };
    res.status(err.status).json(body);
    return;
  }

  console.error('[unhandled]', err);
  const body: ApiFailure = {
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  };
  res.status(500).json(body);
};

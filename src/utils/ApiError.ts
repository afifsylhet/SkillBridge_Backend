// Typed error class flowing through the centralized error handler. See prd.md §5.2.
import type { ApiErrorCode } from '../types/api.js';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(status: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(code: ApiErrorCode, message: string, details?: unknown) {
    return new ApiError(400, code, message, details);
  }
  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, 'AUTH_REQUIRED', message);
  }
  static forbidden(message = 'Forbidden') {
    return new ApiError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, 'NOT_FOUND', message);
  }
  static conflict(message: string, details?: unknown) {
    return new ApiError(409, 'CONFLICT', message, details);
  }
  static unprocessableEntity(message: string, details?: unknown) {
    return new ApiError(422, 'VALIDATION_ERROR', message, details);
  }
}

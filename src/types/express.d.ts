// Augments Express.Request with the authenticated user payload.
import type { AuthUser } from './api.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};

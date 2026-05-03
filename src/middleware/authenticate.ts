// Reads JWT from cookie, attaches req.user. See prd.md §4.
import type { NextFunction, Request, Response } from 'express';
import { ACCESS_COOKIE_NAME } from '../utils/cookies.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[ACCESS_COOKIE_NAME];
  if (!token) return next(ApiError.unauthorized());
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired token'));
  }
}

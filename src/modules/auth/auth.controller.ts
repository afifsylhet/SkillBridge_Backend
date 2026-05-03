// Auth controller. See prd.md §5.3.1.
import type { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { ApiError } from '../../utils/ApiError.js';
import { signAccessToken } from '../../utils/jwt.js';
import {
  ACCESS_COOKIE_NAME,
  authCookieOptions,
  clearedCookieOptions,
} from '../../utils/cookies.js';
import { env } from '../../config/env.js';
import { authService } from './auth.service.js';
import type { LoginInput, RegisterInput } from './auth.validation.js';

function setAuthCookie(res: Response, token: string): void {
  res.cookie(ACCESS_COOKIE_NAME, token, authCookieOptions(env.NODE_ENV));
}

export const authController = {
  register: catchAsync(async (req: Request, res: Response) => {
    const input = req.body as RegisterInput;
    const user = await authService.registerUser(input);
    const token = signAccessToken({ id: user.id, role: user.role, email: user.email });
    setAuthCookie(res, token);
    res.status(201).json({ success: true, data: { user } });
  }),

  login: catchAsync(async (req: Request, res: Response) => {
    const input = req.body as LoginInput;
    const user = await authService.loginUser(input);
    const token = signAccessToken({ id: user.id, role: user.role, email: user.email });
    setAuthCookie(res, token);
    res.status(200).json({ success: true, data: { user } });
  }),

  logout: catchAsync(async (_req: Request, res: Response) => {
    res.clearCookie(ACCESS_COOKIE_NAME, clearedCookieOptions());
    res.status(200).json({ success: true, data: null });
  }),

  me: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const data = await authService.getCurrentUser(req.user.id);
    res.status(200).json({ success: true, data });
  }),
};

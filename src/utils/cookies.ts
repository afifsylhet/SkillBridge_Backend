// Cookie option presets. See prd.md §4.2.
import type { CookieOptions } from 'express';
import { env } from '../config/env.js';

export const ACCESS_COOKIE_NAME = 'sb_token';

export const authCookieOptions = (nodeEnv: 'development' | 'production' | 'test'): CookieOptions => ({
  httpOnly: true,
  secure: nodeEnv === 'production',
  sameSite: nodeEnv === 'production' ? ('none' as const) : ('lax' as const),
  path: '/',
  domain: env.COOKIE_DOMAIN || undefined,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

export function clearedCookieOptions(): CookieOptions {
  return { ...authCookieOptions(env.NODE_ENV as 'development' | 'production' | 'test'), maxAge: 0 };
}

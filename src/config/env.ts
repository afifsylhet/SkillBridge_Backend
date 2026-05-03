// Loads & validates process.env via zod. Throws on boot if missing. See prd.md §11.1.
import { z } from 'zod';
import dotenv from 'dotenv';

// Vercel/Render inject env vars natively; .env is only needed locally.
// dotenv.config() is a no-op if no .env file exists, so this is safe everywhere.
dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  FRONTEND_URL: z.string().url(),
  // Comma-separated extra origins (e.g. "https://staging.example.com,https://localhost:3000").
  ALLOWED_ORIGINS: z.string().optional(),
  // Optional regex (string form) matched against the request Origin header.
  // Useful for Vercel preview URLs, e.g. "^https://skillbridge-frontend-[a-z0-9]+-.*\\.vercel\\.app$".
  ALLOWED_ORIGIN_REGEX: z.string().optional(),
  COOKIE_DOMAIN: z.string().optional(),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Environment validation failed');
}

export const env = parsed.data;
export type Env = typeof env;

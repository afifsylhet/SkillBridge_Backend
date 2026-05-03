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
  COOKIE_DOMAIN: z.string().optional(),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Environment validation failed');
}

export const env = parsed.data;
export type Env = typeof env;

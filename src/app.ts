// Express app factory — CORS, cookies, routes, error handling. See prd.md §4.3.
import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import cors, { type CorsOptions } from 'cors';
import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';

function buildCorsOptions(): CorsOptions {
  const allowList = new Set<string>([env.FRONTEND_URL]);
  if (env.ALLOWED_ORIGINS) {
    for (const origin of env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)) {
      allowList.add(origin);
    }
  }
  const allowRegex = env.ALLOWED_ORIGIN_REGEX ? new RegExp(env.ALLOWED_ORIGIN_REGEX) : null;

  return {
    origin: (origin, callback) => {
      // Same-origin / non-browser requests (curl, server-to-server) have no Origin header.
      if (!origin) return callback(null, true);
      if (allowList.has(origin)) return callback(null, true);
      if (allowRegex?.test(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked: origin ${origin} is not allowed`));
    },
    credentials: true,
  };
}

export function createApp(): Express {
  const app = express();

  app.use(cors(buildCorsOptions()));
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));

  // Health check endpoint (used by Render for monitoring)
  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api', apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

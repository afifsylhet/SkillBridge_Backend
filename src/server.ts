import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

// Only listen if running locally (not on Vercel)
if (process.env.NODE_ENV !== 'production') {
  app.listen(env.PORT, () => {
    console.log(`[skillbridge-backend] listening on http://localhost:${env.PORT}`);
  });
}

// CRITICAL: Vercel needs this export to handle routing
export default app;
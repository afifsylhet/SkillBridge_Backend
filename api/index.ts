// Vercel serverless entry. Re-exports the Express app from src/.
// All routes are funnelled here via the rewrite rule in ../vercel.json.
import { createApp } from '../src/app.js';

const app = createApp();

export default app;

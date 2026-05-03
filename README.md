# skillbridge-backend

Express 5 + Prisma 6 + PostgreSQL API for SkillBridge.

## Quick start

```bash
npm install
cp .env.example .env        # then fill in DATABASE_URL, JWT_SECRET, etc.
npm run prisma:migrate      # create the dev database
npm run seed                # admin + categories + demo tutors
npm run dev                 # http://localhost:4000
```

## Environment Variables

See `.env` — required variables:

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Environment mode | `development` or `production` |
| `PORT` | Server port | `4000` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@host:5432/skillbridge` |
| `JWT_SECRET` | 64-char random secret for token signing | (auto-generated in `.env`) |
| `JWT_EXPIRES_IN` | Token expiration | `7d` |
| `FRONTEND_URL` | Frontend origin (CORS) | `http://localhost:3000` |
| `COOKIE_DOMAIN` | Cookie domain (leave empty in dev) | (empty in dev, set in prod if needed) |

## Seed Credentials (§12)

After running `npm run seed`, use these accounts:

| Role | Email | Password | Purpose |
|---|---|---|---|
| Admin | `admin@skillbridge.dev` | `Admin@12345` | Platform oversight, ban users, manage categories |
| Student | `student@skillbridge.dev` | `Student@123` | Browse tutors, book sessions, leave reviews |
| Tutor | `tutor1@skillbridge.dev` … `tutor6@skillbridge.dev` | `Tutor@123` | Create profiles, set availability, complete sessions |

## Scripts

| Script | Purpose |
|---|---|
| `dev` | tsx watch on `src/server.ts` |
| `build` | tsc → `dist/` |
| `start` | run compiled server |
| `prisma:generate` | regenerate Prisma client |
| `prisma:migrate` | dev migration |
| `prisma:deploy` | prod migration |
| `prisma:studio` | open Prisma Studio |
| `seed` | run `prisma/seed.ts` |

## API Endpoints

Base: `http://localhost:4000/api`

**Health check:** `GET /health` → `{ ok: true }`

See [prd.md](../prd.md) for the full spec — schema (§3), auth (§4), and REST contracts (§5).

## Deployment

### Render
1. Create a new Web Service, connect this repo.
2. Build command: `npm install && npx prisma migrate deploy && npm run seed && npm run build`
3. Start command: `npm start`
4. Environment: Set all variables from `.env` (see table above).
5. Health check: `GET /health` — Render will use this to confirm boot.

### Database (Neon / Supabase)
- Create a PostgreSQL 16+ database.
- Set `DATABASE_URL` in Render env.
- Run migrations: `npx prisma migrate deploy`.
- Run seed once: `npm run seed`.

### CORS / Cookies in Production
- Set `COOKIE_DOMAIN` if your frontend is on a subdomain.
- Cookies are `sameSite=none, secure=true` in production (see `src/utils/cookies.ts`).
- CORS allows single origin (set `FRONTEND_URL` in env).

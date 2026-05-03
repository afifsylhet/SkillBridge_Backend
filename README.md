# SkillBridge — Backend

A production-ready REST API powering the SkillBridge tutor-marketplace platform. Built on **Express 5**, **Prisma 6**, **PostgreSQL**, and **TypeScript**, with JWT cookie auth, role-based access control, and Zod-validated contracts.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [API Reference](#api-reference)
- [Authentication & Authorization](#authentication--authorization)
- [Scripts](#scripts)
- [Project Structure](#project-structure)
- [Seed Credentials](#seed-credentials)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Overview

SkillBridge connects students with tutors across configurable skill categories. The backend exposes a versioned JSON API consumed by the Next.js frontend, handling authentication, tutor profiles, weekly availability, bookings, reviews, and admin oversight.

**Key features**

- Role-based access (`STUDENT`, `TUTOR`, `ADMIN`) enforced at the route layer
- Stateless JWT authentication delivered via `HttpOnly` cookies
- Strict input validation through Zod schemas on every mutating endpoint
- Conflict-free booking model — same tutor + same start time is rejected at the DB level
- Denormalized rating aggregates on `TutorProfile` for fast list/filter queries

---

## Tech Stack

| Layer            | Technology                        |
| ---------------- | --------------------------------- |
| Runtime          | Node.js ≥ 22                      |
| Framework        | Express 5                         |
| Language         | TypeScript 5 (strict)             |
| ORM              | Prisma 6                          |
| Database         | PostgreSQL 16+                    |
| Auth             | `jsonwebtoken`, `bcrypt`, cookies |
| Validation       | `zod`                             |
| Dev tooling      | `tsx` (watch mode), `prisma`      |

---

## Architecture

The codebase follows a **modular, feature-first** layout. Each domain lives under `src/modules/<feature>/` and ships its own routes, controller, service, and validation schema. Cross-cutting concerns (auth middleware, error handler, env loader) live in `src/middleware/`, `src/config/`, and `src/utils/`.

```
HTTP request
   ↓ Express router (routes/index.ts)
   ↓ Module router (modules/<feature>/<feature>.routes.ts)
   ↓ auth + role middleware
   ↓ Zod validation
   ↓ Controller → Service → Prisma
   ↓ JSON response { success, data }
```

All responses follow a uniform envelope:

```jsonc
{ "success": true,  "data": { ... } }
{ "success": false, "error": { "code": "...", "message": "..." } }
```

---

## Getting Started

### Prerequisites

- Node.js **22+**
- PostgreSQL **16+** running locally or a hosted instance (Neon, Supabase, Render Postgres)
- npm 10+

### Installation

```bash
npm install
cp .env.example .env          # then edit DATABASE_URL, JWT_SECRET, FRONTEND_URL
npm run prisma:migrate        # apply schema and create the dev database
npm run seed                  # admin + categories + 6 demo tutors + 1 student
npm run dev                   # → http://localhost:4000
```

A successful boot logs:

```
[server] listening on http://localhost:4000
[server] env=development
```

Health check: `GET http://localhost:4000/api/health` → `{ "success": true, "data": { "ok": true } }`

---

## Environment Variables

Defined in `.env` (see `.env.example` for a template):

| Variable         | Required | Description                                          | Example                                            |
| ---------------- | :------: | ---------------------------------------------------- | -------------------------------------------------- |
| `NODE_ENV`       |    ✓     | Runtime mode                                         | `development` \| `production`                      |
| `PORT`           |          | HTTP listen port (default `4000`)                    | `4000`                                             |
| `DATABASE_URL`   |    ✓     | PostgreSQL connection string                         | `postgresql://user:pass@host:5432/skillbridge`     |
| `JWT_SECRET`     |    ✓     | 64-char random string used to sign tokens            | _(generate with `openssl rand -hex 32`)_           |
| `JWT_EXPIRES_IN` |          | Token lifetime (default `7d`)                        | `7d`                                               |
| `FRONTEND_URL`   |    ✓     | Canonical frontend origin (always allowed by CORS)   | `http://localhost:3000`                            |
| `ALLOWED_ORIGINS`|          | Comma-separated extra origins                        | `https://staging.example.com,https://other.app`    |
| `ALLOWED_ORIGIN_REGEX` |    | Regex (string) matched against the request `Origin`. Use this for Vercel/Netlify preview URLs. | `^https:\/\/skillbridge-frontend-[a-z0-9-]+-afif-ahmeds-projects\.vercel\.app$` |
| `COOKIE_DOMAIN`  |          | Cookie domain (leave empty in dev)                   | `.skillbridge.dev`                                 |

> **Never commit** `.env`. Rotate `JWT_SECRET` whenever it leaks — all sessions invalidate immediately.

---

## Database

Prisma schema: [`prisma/schema.prisma`](prisma/schema.prisma).

### Domain models

| Model           | Purpose                                                              |
| --------------- | -------------------------------------------------------------------- |
| `User`          | Account record; role-discriminated (`STUDENT`, `TUTOR`, `ADMIN`)     |
| `TutorProfile`  | Public tutor listing with bio, hourly rate, rating aggregates        |
| `Category`      | Skill taxonomy (slug-keyed)                                          |
| `TutorCategory` | M:N join between tutors and categories                               |
| `Availability`  | Recurring weekly windows (`weekday + startMinute + endMinute`)       |
| `Booking`       | Concrete session — unique on `(tutorProfileId, scheduledAt)`         |
| `Review`        | One review per booking, 1–5 rating, drives `ratingAvg` / `ratingCount` |

### Migrations

```bash
npm run prisma:migrate        # dev: create + apply migration, regenerate client
npm run prisma:deploy         # prod: apply pending migrations only
npm run prisma:studio         # GUI for local data inspection
```

---

## API Reference

All endpoints are mounted under `/api`. Routers are wired in [`src/routes/index.ts`](src/routes/index.ts).

| Prefix         | Module    | Description                                         |
| -------------- | --------- | --------------------------------------------------- |
| `/auth`        | `auth`    | Register, login, logout, current session            |
| `/users`       | `user`    | Profile read/update                                 |
| `/tutors`      | `tutor`   | Public browse, filter, and detail endpoints         |
| `/tutor`       | `tutor`   | Authenticated tutor self-service (profile, slots)   |
| `/categories`  | `category`| Public category list; admin-only writes             |
| `/bookings`    | `booking` | Create, list, cancel, complete                      |
| `/reviews`     | `review`  | Create review for a completed booking               |
| `/admin`       | `admin`   | Stats, user moderation, booking oversight           |
| `/health`      | —         | Liveness probe                                      |

Every mutating endpoint validates its body against a Zod schema; failures return a structured `400` with field-level messages.

---

## Authentication & Authorization

- **Strategy:** JWT signed with `JWT_SECRET`, set as an `HttpOnly` cookie named `sb_token`.
- **Cookie flags:**
  - `httpOnly: true` — never readable from JS
  - `sameSite: 'lax'` in dev, `'none'` + `secure: true` in production
  - `path: '/'`, optional `domain` from `COOKIE_DOMAIN`
- **Middleware:**
  - `requireAuth` — populates `req.user` or rejects with `401`
  - `requireRole(...roles)` — gates routes by role
- **Password hashing:** `bcrypt` with cost factor `12`.

---

## Scripts

| Script              | Purpose                                               |
| ------------------- | ----------------------------------------------------- |
| `npm run dev`       | `tsx watch src/server.ts` — hot reload on save        |
| `npm run build`     | `tsc -p .` → `dist/`                                  |
| `npm start`         | Run the compiled server (`node dist/server.js`)       |
| `prisma:generate`   | Regenerate the Prisma client after schema edits       |
| `prisma:migrate`    | Create + apply a dev migration                        |
| `prisma:deploy`     | Apply pending migrations (production)                 |
| `prisma:studio`     | Open Prisma Studio                                    |
| `npm run seed`      | Run [`prisma/seed.ts`](prisma/seed.ts)                |

---

## Project Structure

```
skillbridge-backend/
├── prisma/
│   ├── schema.prisma         # data model
│   └── seed.ts               # demo data
├── src/
│   ├── app.ts                # Express app assembly
│   ├── server.ts             # entry point
│   ├── config/               # env loader, prisma client singleton
│   ├── middleware/           # auth, error handler, request logger
│   ├── modules/
│   │   ├── auth/             # routes • controller • service • schemas
│   │   ├── user/
│   │   ├── tutor/
│   │   ├── category/
│   │   ├── booking/
│   │   ├── review/
│   │   └── admin/
│   ├── routes/index.ts       # router mount table
│   ├── types/                # shared types
│   └── utils/                # cookies, http errors, response helpers
└── tsconfig.json
```

---

## Seed Credentials

After `npm run seed`, the following accounts are available for local development:

| Role    | Email                                            | Password      |
| ------- | ------------------------------------------------ | ------------- |
| Admin   | `admin@skillbridge.com`                          | `admin123` |
| Student | `student@skillbridge.dev`                        | `Student@123` |
| Tutor   | `tutor1@skillbridge.dev` … `tutor6@skillbridge.dev` | `Tutor@123`   |

> **Demo only.** Never ship these credentials to a public environment.

---

## Deployment

### Render (recommended)

1. **New → Web Service**, connect this repository.
2. **Build command:**
   ```
   npm install && npx prisma migrate deploy && npm run build
   ```
3. **Start command:** `npm start`
4. **Environment:** add every variable from the [Environment Variables](#environment-variables) table.
5. **Health check path:** `/api/health` — Render uses this to confirm boot.
6. _(One-time)_ Run `npm run seed` from the Render shell to populate demo data.

### Vercel (serverless)

This repo is also deployable to Vercel — [api/index.ts](api/index.ts) wraps the Express app and [vercel.json](vercel.json) rewrites all paths to it.

1. **New Project** → import this repository.
2. **Root Directory:** `skillbridge-backend`.
3. **Framework Preset:** _Other_.
4. **Environment Variables** (Settings → Environment Variables — add for **Production**, **Preview**, and **Development**):
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = Postgres connection string (Neon / Supabase / Vercel Postgres)
   - `JWT_SECRET` = 64-char random string (generate via `openssl rand -hex 32`)
   - `JWT_EXPIRES_IN` = `7d`
   - `FRONTEND_URL` = full origin of your deployed frontend (e.g. `https://skillbridge.vercel.app`)
   - `COOKIE_DOMAIN` = leave empty unless serving across subdomains
5. **Deploy** — `postinstall` runs `prisma generate` automatically.
6. **One-time DB migration** — from your local machine, point `DATABASE_URL` at the production database and run:
   ```bash
   npx prisma migrate deploy
   npm run seed
   ```
7. **Verify:** `GET https://<your-deployment>.vercel.app/api/health` → `{ "success": true, "data": { "ok": true } }`

> ⚠️ Each cold start spins up a fresh Prisma client. For non-trivial traffic, use a connection pooler (Neon's pooled URL, Supabase's `pgbouncer`, or Prisma Accelerate) in `DATABASE_URL` to avoid exhausting Postgres connections.

### Database (Neon / Supabase / Render Postgres)

- Provision a PostgreSQL **16+** instance.
- Set `DATABASE_URL` in the platform's environment variables.
- Run `npx prisma migrate deploy` on first deploy and after every schema change.

### Production hardening checklist

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` rotated and stored in the platform's secret manager
- [ ] `FRONTEND_URL` matches the deployed frontend exactly (single origin CORS)
- [ ] Cookies issued with `sameSite=none; secure=true`
- [ ] Database backups / PITR enabled
- [ ] Health check wired to `/api/health`

---

## Troubleshooting

| Symptom                                            | Likely cause / fix                                                                  |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `PrismaClientInitializationError` on boot          | `DATABASE_URL` unset or unreachable — verify connectivity and SSL flag              |
| `401 Unauthorized` on every authenticated route    | Cookie not sent — confirm frontend uses `credentials: 'include'` and CORS matches   |
| `P2002` unique constraint on booking creation      | Tutor already has a booking at that exact `scheduledAt` — pick a different slot     |
| Migration drift between dev and prod               | Run `npx prisma migrate deploy` on prod; never edit applied migrations              |
| `JsonWebTokenError: invalid signature` after redeploy | `JWT_SECRET` changed — clients must log in again                                  |
| Vercel `FUNCTION_INVOCATION_FAILED` / 500 on all routes | Module-load crash — usually a missing env var. Check the function logs in the Vercel dashboard for the exact stack trace |
| Vercel build fails with `@prisma/client did not initialize` | `prisma generate` didn't run — confirm `postinstall` is present in `package.json` |
| `Access-Control-Allow-Origin` mismatch from a Vercel preview URL | The preview URL hash changes per deploy. Set `ALLOWED_ORIGIN_REGEX` to a pattern that matches all of your project's previews instead of pinning a single `FRONTEND_URL` |

---

## License

Private — internal project. All rights reserved.

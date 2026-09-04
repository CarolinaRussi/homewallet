# HomeWallet

Working title for a personal & shared finance app (solo or multi-person **spaces**).  
Public beta product + portfolio piece. First real users: a couple who today track money in spreadsheets.

> Status: **Part 8 — Poupancinha pots**. Saving entries + named pots. Invites/privacy are Part 9.

## Quick start

Requires **Node 24+** and **pnpm 10**, plus a **PostgreSQL** database.

```bash
cp apps/api/.env.example apps/api/.env
# set DATABASE_URL (Neon or local Docker — see below)
pnpm install
pnpm --filter @homewallet/api check:db   # optional: verify DB connection
pnpm dev
```

| App        | URL                          |
| ---------- | ---------------------------- |
| Web        | http://localhost:5173        |
| API health | http://localhost:3001/health |

### Database: Neon or Docker

Pick one. The API only cares about `DATABASE_URL` in `apps/api/.env`.

**Neon (recommended for day-to-day)**

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string (use the one with SSL; Neon usually includes `sslmode=require`)
3. Put it in `apps/api/.env`:

```env
DATABASE_URL=
JWT_SECRET=
WEB_ORIGIN=http://localhost:5173
```

4. Run `pnpm --filter @homewallet/api check:db` — you should see `OK connected (neon)` and tables `users,spaces,memberships` (created by migrations on first connect)
5. Browse tables in the Neon console

**Docker (local Postgres)**

```bash
docker compose up -d
```

```env
DATABASE_URL=
```

Same `check:db` command; expect `OK connected (local)`.

You can switch anytime by changing `DATABASE_URL` and restarting the API. Do not commit `.env`.

Google sign-in is optional: set `GOOGLE_CLIENT_ID` in `apps/api/.env` and `VITE_GOOGLE_CLIENT_ID` in `apps/web/.env`.

## Stack

- **Monorepo (pnpm):** `apps/web`, `apps/api`, `packages/shared`
- **Web:** Vite + React + TypeScript + Tailwind + TanStack Query
- **API:** Fastify + TypeORM (Active Record) + PostgreSQL (Neon or Docker locally)
- **Auth:** email/password + Google ID token; JWT httpOnly cookie
- **Deploy:** Vercel (web) + Render (API + Postgres) — later
- **Tooling:** ESLint, Prettier, TS strict, Husky, lint-staged, commitlint, GitHub Actions CI

## Commit convention

```
feat(frontend): short message in English
feat(backend): short message in English
```

Daily scopes: **`frontend`** | **`backend`**.

## Workflow

1. Agent delivers **one part**
2. You **review**
3. You **commit** (when ready)
4. Next part

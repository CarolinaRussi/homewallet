# HomeWallet

Working title for a personal & shared finance app (solo or multi-person **spaces**).  
Public beta product + portfolio piece. First real users: a couple who today track money in spreadsheets.

> Status: **Part 1 — scaffold**. Monorepo boots locally; product features start in Part 2.

## Quick start

Requires **Node 24+** and **pnpm 10**.

```bash
pnpm install
pnpm dev          # web :5173 + api :3001
pnpm dev:web      # Vite only
pnpm dev:api      # Fastify only
pnpm lint
pnpm typecheck
```

| App        | URL                          |
| ---------- | ---------------------------- |
| Web        | http://localhost:5173        |
| API health | http://localhost:3001/health |

## Quick links

| Doc                                          | What it covers                   |
| -------------------------------------------- | -------------------------------- |
| [docs/PRODUCT.md](docs/PRODUCT.md)           | Product decisions from the grill |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Monorepo, layers, stack          |
| [docs/UX.md](docs/UX.md)                     | Brand, IA, colors, typography    |
| [docs/ROADMAP.md](docs/ROADMAP.md)           | Parts 0–11 delivery plan         |
| [docs/DECISIONS/](docs/DECISIONS/)           | Short ADRs (why we chose X)      |
| [.cursor/rules/](.cursor/rules/)             | Persistent agent coding rules    |

## Stack

- **Monorepo (pnpm):** `apps/web`, `apps/api`, `packages/shared`
- **Web:** Vite + React + TypeScript + Tailwind + CSS variables
- **API:** Fastify + TypeScript (TypeORM in Part 2)
- **DB:** PostgreSQL (Part 2)
- **Deploy:** Vercel (web) + Render (API + Postgres)
- **Tooling:** ESLint, Prettier, TS strict, Husky, lint-staged, commitlint, GitHub Actions CI

## Commit convention

```
feat(frontend): short message in English
feat(backend): short message in English
fix(frontend): ...
docs: ...
chore(ci): ...
refactor(backend): ...
```

Daily scopes: **`frontend`** | **`backend`**.  
Other scopes only when it does not fit those two (e.g. `docs`, `chore(repo)`, `chore(ci)`, `chore(shared)`).

## Workflow

1. Agent delivers **one part**
2. You **review**
3. You **commit** (when ready)
4. Next part

Do not treat the product as “ready to use” until the big-bang scope is done — but we still ship internal parts for review.

## Local name / slug

- Product display name: **HomeWallet**
- Repo / folder slug: **`homewallet`**
- Final public name: TBD (working title only)

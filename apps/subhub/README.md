# SubHub

Latch business app (`subhub`) — service-trades / AV integration CRM on real Postgres.

**Start here:** [`STATUS.md`](./STATUS.md) · **Plan:** [`docs/README.md`](./docs/README.md) · **Tasks:** [`docs/tasks/01-task-index.md`](./docs/tasks/01-task-index.md)

Platform migrations `001`–`013` ship with the template (`013` = identity DB guards); business DDL from `014+`.

## Bootstrap

1. `npm install` (repo root — links this workspace)
2. `cp .env.example .env.local` — set `DATABASE_URL`, `AUTH_SECRET`, `LATCH_APP_ROLE_PASSWORD` (required on Neon), `LATCH_SETUP_KEY`; `BETTER_AUTH_URL` must match port **3003**
3. `npm run db:migrate -w @latch/subhub` (or `node scripts/db-migrate.mjs --dir=apps/subhub` from repo root)
4. Add `*.surface.yaml` under `modules/`, then `npm run codegen -w @latch/subhub`
5. `npm run dev -w @latch/subhub` (port **3003**)
6. Open `/setup` — install token + **login_name** + password (task **09**)

See [09-dev-roles-seed.md](./docs/tasks/09-dev-roles-seed.md) and [scaffold runbook](../../packages/codegen/docs/scaffold-runbook.md#first-run-setup).

## GitHub

SubHub lives in this monorepo under `apps/subhub`. Push the `latch` repo to GitHub as usual; CI runs `codegen:check`, tests, and lint from the repo root.

## Vercel

1. Import the GitHub repo in [Vercel](https://vercel.com).
2. Set **Root Directory** to `apps/subhub`.
3. **Install Command:** `cd ../.. && npm install`
4. **Build Command:** `npm run build` (default — runs in `apps/subhub`)
5. Environment variables (Production + Preview):

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Neon **pooled** connection string |
| `DATABASE_URL_DIRECT` | Neon **direct** string (optional; migrate runs locally) |
| `LATCH_APP_ROLE_PASSWORD` | Same value used when migrations ran |
| `AUTH_SECRET` / `BETTER_AUTH_SECRET` | `npx auth secret` |
| `BETTER_AUTH_URL` | `https://<your-vercel-domain>` |

Run migrations against the target database from your machine before first deploy:

```bash
node scripts/db-migrate.mjs --dir=apps/subhub
```

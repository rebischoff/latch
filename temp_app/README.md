# Temp App

Scaffolded Latch business app (`temp_app`). Platform migrations only — add Surface YAML under `modules/`, then run codegen.

## Bootstrap

1. `npm install` (repo root — links this workspace)
2. `cp .env.example .env.local` — set `DATABASE_URL`, `AUTH_SECRET`, `LATCH_APP_ROLE_PASSWORD` (required on Neon); `BETTER_AUTH_URL` must match port **3003**
3. `npm run db:migrate -w @latch/temp-app` (or `node scripts/db-migrate.mjs --dir=temp_app` from repo root)
4. Add `*.surface.yaml` under `modules/`, then `npm run codegen -w @latch/temp-app`
5. `npm run dev -w @latch/temp-app` (port **3003**)

See [scaffold runbook](../packages/codegen/docs/scaffold-runbook.md) for DB reset, verify steps, and lifting domain from `fixtures/crm-proof/`.

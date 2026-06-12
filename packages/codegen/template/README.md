# __APP_TITLE__

Scaffolded Latch business app (`__APP_SLUG__`). Platform migrations only — add Surface YAML under `modules/`, then run codegen.

## Bootstrap

1. `npm install` (repo root — links this workspace)
2. `cp .env.example .env.local` — set `DATABASE_URL`, `AUTH_SECRET`, `LATCH_APP_ROLE_PASSWORD` (required on Neon); `BETTER_AUTH_URL` must match port **__APP_PORT__**
3. `npm run db:migrate -w __APP_PACKAGE__` (or `node scripts/db-migrate.mjs --dir=__APP_SLUG__` from repo root)
4. Add `*.surface.yaml` under `modules/`, then `npm run codegen -w __APP_PACKAGE__`
5. `npm run dev -w __APP_PACKAGE__` (port **__APP_PORT__**)

See [scaffold runbook](../docs/scaffold-runbook.md) for DB reset, verify steps, and lifting domain from `fixtures/crm-proof/`.

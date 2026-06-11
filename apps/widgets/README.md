# Widgets

Scaffolded Latch business app (`widgets`). Platform migrations only — add Surface YAML under `modules/`, then run codegen.

## Bootstrap

1. `cp apps/widgets/.env.example apps/widgets/.env.local` — set `DATABASE_URL`, `AUTH_SECRET`, `LATCH_APP_ROLE_PASSWORD` (required on Neon).
2. `node scripts/db-migrate.mjs --app=widgets`
3. Add `*.surface.yaml` under `modules/` (see [Phase 1 first app](../../../apps/docs/phase-01-first-app.md)).
4. `npm run codegen -w @latch/widgets`
5. `npm run dev -w @latch/widgets` (port **3003**)

See [apps/docs/README.md](../../docs/README.md) for bootstrap guides.

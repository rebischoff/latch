# __APP_TITLE__

Scaffolded Latch business app (`__APP_SLUG__`). Platform migrations only — add Surface YAML under `modules/`, then run codegen.

## Bootstrap

1. `cp apps/__APP_SLUG__/.env.example apps/__APP_SLUG__/.env.local` — set `DATABASE_URL`, `AUTH_SECRET`, `LATCH_APP_ROLE_PASSWORD` (required on Neon).
2. `node scripts/db-migrate.mjs --app=__APP_SLUG__`
3. Add `*.surface.yaml` under `modules/` (see [Phase 1 first app](../../../apps/docs/phase-01-first-app.md)).
4. `npm run codegen -w __APP_PACKAGE__`
5. `npm run dev -w __APP_PACKAGE__` (port **__APP_PORT__**)

See [apps/docs/README.md](../../docs/README.md) for bootstrap guides.

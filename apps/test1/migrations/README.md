# SQL migrations

Company DB migrations owned by test1. Apply from repo root:

```bash
npm run db:migrate:test1
```

On **Neon**, set `LATCH_APP_ROLE_PASSWORD` in `apps/test1/.env.local` before migrate (see [`../docs/CONFIG.md`](../docs/CONFIG.md)).

See [`../docs/DATABASE.md`](../docs/DATABASE.md) for order and `latch_app` runtime role.

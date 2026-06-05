# test1 — database plan

test1 **owns** its schema, seed, store, and migrations. `@latch/*` packages stay domain-agnostic.

## Principles

1. **DAL is the only app path to data** — routes and Server Actions call `@latch/dal`, never Drizzle from UI/route code.
2. **Schema home** — `apps/test1/db/` + `apps/test1/migrations/`.
3. **Isolation** — use a **separate Neon project or branch** from CRM while learning.

## Environments

| Environment | `DATABASE_URL` | Notes |
|-------------|----------------|-------|
| Local / preview / prod | Neon connection string | `apps/test1/.env.local` |
| No Postgres (early dev) | Omit URL | In-memory user/role store until task 05 wiring |

Setup: [`docs/foundations/development.md`](../../../docs/foundations/development.md). CRM reference: [`apps/crm/docs/DATABASE.md`](../../crm/docs/DATABASE.md).

## Application role (`latch_app`)

Reuse Phase 06 convention:

| Connection | Role | Use |
|------------|------|-----|
| Owner / migrate | Neon owner | `npm run db:migrate:test1` |
| App runtime | `latch_app` | `DATABASE_URL` in dev/prod |

- Business tables (task 10+): `SELECT` / `INSERT` / `UPDATE` / `DELETE`
- `latch_audit`: `INSERT` only
- `latch_pending_changes`: deferred for test1 v1 unless verification added later

**Production must not** use the database owner for app `DATABASE_URL`. Migration **002** reads `LATCH_APP_ROLE_PASSWORD` from `apps/test1/.env.local` (Neon requires a strong password; Docker / CI may omit it and use the `latch_app` default). Rotate on real deployments.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | App connection (production: **`latch_app`**) |
| `LATCH_APP_DATABASE_URL` | Optional override for DB-gated tests as `latch_app` |

## Migration plan

| Step | Action |
|------|--------|
| 1 | `001_init.sql` — `latch_users`, `latch_user_roles`, `latch_audit`, `latch_policy_version` + admin seed |
| 2 | `002_latch_app_role.sql` — role **`latch_app`**, platform-table grants, audit INSERT-only |
| 3 | Business tables — with first Surface (task 10) |
| 4 | `latch_roles` + grants — task 20–21 |

```bash
# From repo root (reads apps/test1/.env.local)
npm run db:migrate:test1
npm run db:check:test1
```

Local Docker (optional):

```bash
npm run db:docker:up
# apps/test1/.env.local:
# DATABASE_URL=postgresql://latch:latch@localhost:5432/latch
npm run db:migrate:test1
```

## Platform tables (task 05)

### `latch_users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT` PK | Stable `Principal.id` (e.g. `seed-admin`) |
| `display_name` | `TEXT` NOT NULL | UI label |
| `login_email` | `TEXT` NOT NULL UNIQUE | Better Auth email → latch user id |
| `created_at` | `TIMESTAMPTZ` | Default `now()` |

Better Auth user rows are separate from `latch_users` in v1 (no sync plugin). `getPrincipal()` resolves `Principal.id` by `login_email`.

### `latch_user_roles`

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | `TEXT` | FK → `latch_users.id`, `ON DELETE CASCADE` |
| `role_id` | `TEXT` | Policy catalog key (e.g. `iam_master`) |

Composite primary key `(user_id, role_id)`. No `latch_roles` table until task 20.

**Seed data:** `apps/test1/db/seed.ts` mirrors `001_init.sql`.

| Login | User id | Role(s) |
|-------|---------|---------|
| `admin@test1.local` | `seed-admin` | `iam_master`, `data_master` |
| `user@test1.local` | `seed-user` | (custom role — task 20) |
| `readonly@test1.local` | `seed-readonly` | (custom role — task 20) |

### `latch_audit`

Append-only audit log. Immutability enforced by trigger (invariant §6). App role: `INSERT` only.

### `latch_policy_version`

Single-row counter (`id = 1`) for manifest cache invalidation. `latch_app` may `SELECT` / `UPDATE`. Wired in task **90**.

## Phased storage

| Phase | Task band | Policy source |
|-------|-----------|---------------|
| Learn loop | 10–12 | Repo `*.policies.yaml` (like CRM) |
| DB RBAC | 20–23 | Grants in `latch_role_grants`; `@latch/policy` loader extension (task 22) |

## Related

- [PLAN.md](./PLAN.md) · [CONFIG.md](./CONFIG.md) · [AUTH.md](./AUTH.md) · [decisions.md](./decisions.md)

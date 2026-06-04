# test1 — database plan (docs only)

test1 **owns** its schema, seed, store, and migrations. `@latch/*` packages stay domain-agnostic.

## Principles

1. **DAL is the only app path to data** — routes and Server Actions call `@latch/dal`, never Drizzle from UI/route code.
2. **Schema home** — `apps/test1/db/` + `apps/test1/migrations/`.
3. **Isolation** — use a **separate Neon project or branch** from CRM while learning.

## Environments

| Environment | `DATABASE_URL` | Notes |
|-------------|----------------|-------|
| Local / preview / prod | Neon connection string | `apps/test1/.env.local` |
| No Postgres (early dev) | Omit URL | In-memory store acceptable until task 05 |

Setup: [`docs/foundations/development.md`](../../../docs/foundations/development.md). CRM reference: [`apps/crm/docs/DATABASE.md`](../../crm/docs/DATABASE.md).

## Application role (`latch_app`)

Reuse Phase 06 convention:

| Connection | Role | Use |
|------------|------|-----|
| Owner / migrate | Neon owner | `npm run db:migrate:test1` |
| App runtime | `latch_app` | `DATABASE_URL` in dev/prod |

- Business tables: `SELECT` / `INSERT` / `UPDATE` / `DELETE`
- `latch_audit`: `INSERT` only
- `latch_pending_changes`: deferred for test1 v1 unless verification added later

## Table sketch (not migrations yet)

### Latch platform tables

| Table | Purpose |
|-------|---------|
| `latch_users` | Identity rows (id, display_name, login email) |
| `latch_roles` | **New vs CRM** — role definitions (`id`, `display_name`, `kind`: `system` \| `custom`) |
| `latch_user_roles` | User ↔ role assignment (composite PK) |
| `latch_role_grants` | **New** — `(role_id, surface_id, field_id NULL, actions[], effect?)` |
| `latch_role_row_scope` | **Optional** — `(role_id, surface_id, row_scope)` |
| `latch_policy_version` | Manifest cache invalidation counter |
| `latch_audit` | Append-only audit log |

### Business tables (TBD in task 10)

| Table | Surface anchor |
|-------|----------------|
| `contacts` | `contact` |
| `projects` | `project` |
| `tasks` | `task` |

Exact columns defined when first Surface YAML lands (task 10).

## Phased storage

| Phase | Task band | Policy source |
|-------|-----------|---------------|
| Learn loop | 10–12 | Repo `*.policies.yaml` (like CRM) |
| DB RBAC | 20–23 | Grants in `latch_role_grants`; `@latch/policy` loader extension (task 22) |

## Seed data (planned)

- System roles: `iam_master`, `data_master` in `latch_roles`
- Seed users per [AUTH.md](./AUTH.md)
- Sample business rows for click-testing after task 10

## Migration plan (future — task 05)

| Step | Action |
|------|--------|
| 1 | `001_init.sql` — users, audit, policy_version |
| 2 | `002_latch_app_role.sql` — app runtime role |
| 3 | Business tables — with first Surface (task 10) |
| 4 | `latch_roles` + grants — task 20–21 |

## Related

- [PLAN.md](./PLAN.md) · [CONFIG.md](./CONFIG.md) · [decisions.md](./decisions.md)

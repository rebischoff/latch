# 05 — Neon migrations skeleton

> **Status:** Not scheduled. Next: [10-contact-surface.md](./10-contact-surface.md).

## Goal

Neon-ready migration path: `latch_users`, `latch_user_roles`, `latch_audit`, `latch_policy_version`, `latch_app` role — enough for `getPrincipal()` to load roles from DB.

## Prerequisites

- [04-better-auth.md](./04-better-auth.md) complete (subtasks **04a**–**04e**).
- Neon project/branch for test1 (separate from CRM).

## Files

| File | Action |
|------|--------|
| `apps/test1/migrations/001_init.sql` | **Create** — users, user_roles, audit, policy_version |
| `apps/test1/migrations/002_latch_app_role.sql` | **Create** — mirror CRM [`005_latch_app_role.sql`](../../../crm/migrations/005_latch_app_role.sql) pattern |
| `scripts/db-migrate.mjs` or new script | **Edit** — support `apps/test1` migrations via env or flag |
| Root `package.json` | **Edit** — `db:migrate:test1`, `db:check:test1` |
| `apps/test1/db/schema.ts` | **Create** — Drizzle definitions for latch tables |
| `apps/test1/db/seed.ts` | **Create** — seed users per [../AUTH.md](../AUTH.md) |
| `apps/test1/src/lib/iam/load-roles.ts` | **Create** — load role ids for user |
| `apps/test1/src/lib/auth/getPrincipal.ts` | **Edit** — DB-backed roles when `DATABASE_URL` set |

## Steps

1. Copy patterns from [`apps/crm/migrations/`](../../../crm/migrations/) for audit immutability and `latch_app` grants.
2. Seed `admin@test1.local` → `iam_master` (+ optional `data_master`).
3. Wire `getPrincipal()` to `loadRolesForUser` when Postgres available; memory fallback when URL omitted.
4. Document in [../DATABASE.md](../DATABASE.md) migration order.
5. `npm run db:migrate:test1` applies cleanly on empty Neon branch.

## Verify (stop gate)

- [ ] Migrations apply on fresh Neon DB
- [ ] Logged-in admin has `iam_master` in `getPrincipal().roles` from DB
- [ ] App connects as `latch_app` documented for production
- [ ] [../STATUS.md](../STATUS.md) → **10-contact-surface.md**

## Out of scope

- `latch_roles` / grant tables (tasks **20–21**)
- Business tables (task **10**)
- Better Auth user sync plugin (manual seed users in v1)

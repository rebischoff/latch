# 04 — Database schema and seed (`latch_user_roles`)

> **Status:** Complete (2026-06-02). Next: [05-principal-db-roles.md](./05-principal-db-roles.md).

## Goal

Add `latch_user_roles` (user ↔ role, many-to-many) per the locked identity storage decision; extend seed + memory store so tasks 05+ can load principals from assignments.

## Prerequisites

- [00-decisions.md](./00-decisions.md) complete (verify gate passed).
- Phase 02 complete.

## Files

| File | Action |
|------|--------|
| `apps/crm/db/schema.ts` | `latchUserRoles` table |
| `apps/crm/migrations/` | New migration (increment from latest) |
| `apps/crm/db/seed.ts` | Seed role rows for pilot users; optional `SEED_IAM_ID` |
| `apps/crm/db/memory-store.ts` | `listRolesForUser`, `setUserRoles`, etc. |
| `apps/crm/db/store.ts` | Wire role helpers if using shared store facade |
| `apps/crm/docs/DATABASE.md` | Document `latch_user_roles` |

## Steps

1. **`latch_user_roles`** — columns: `user_id` (FK → `latch_users.id`, `onDelete: cascade`), `role_id` (text, not null); composite primary key `(user_id, role_id)`.
2. **Seed assignments** (minimum):
   - `seed-field-tech` → `field_tech`
   - `seed-office-admin` → `office_admin`
   - Optional: `seed-iam-admin` → `iam_master` (create user row if added)
3. **Do not** seed `data_master` on pilot users unless needed for a dedicated QA login (document in verify if used).
4. **Memory store** — mirror table; `seedPilotJobs` (or `seedPilotIdentity`) assigns roles after users.
5. Migration SQL valid for Postgres path; memory store is primary test harness.

## Verify (stop gate)

- [x] `npm run build` passes
- [x] Memory store returns `['field_tech']` for `SEED_TECH_ID` and `['office_admin']` for `SEED_ADMIN_ID`
- [x] Migration SQL documented (apply command in `DATABASE.md` if Postgres used)
- [x] Seed ids listed for QA:
  - Tech: `SEED_TECH_ID` = `seed-field-tech`
  - Admin: `SEED_ADMIN_ID` = `seed-office-admin`
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `05-principal-db-roles.md`

## Out of scope

- `getPrincipal` DB load (task **05**)
- `user_roles_detail` YAML (task **06**)
- Auth.js (task **14**)

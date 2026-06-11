# 12 — DAL contract tests (IAM + multi-role from DB)

> **Status:** Complete (2026-06-02). Next: [13-api-routes.md](./13-api-routes.md).

## Goal

Automated contracts for `user_roles_detail`: forbidden Field omission, strict-write rejection, and multi-role `union_grants` when `loadRolesForUser` returns multiple rows.

## Prerequisites

[10-dal-patch.md](./10-dal-patch.md) complete.

## Files

| File | Action |
|------|--------|
| `apps/crm/src/lib/iam/iam.test.ts` | **Create** — get/patch contracts |
| `apps/crm/src/lib/iam/load-roles.test.ts` | Extend if split from task **05** |
| `apps/crm/src/lib/policy/policy.test.ts` | Optional: `data_master` + dual-role cases |

## Steps

1. **Forbidden omission (T2):** `iam_master` get — DTO keys match manifest; revoke `read` on `role_assignments` in test harness → Field absent.
2. **Strict write (T1):** patch with `{ role_assignments: [], extra: 1 }` → rejection.
3. **Multi-role:** seed user with `field_tech` + `office_admin` in `latch_user_roles` → manifest includes union of job + customer grants.
4. **Default deny:** `field_tech` cannot patch roles.

## Verify (stop gate)

- [x] `npm run test` — IAM contract file green
- [x] Tests run without Postgres (memory store)
- [x] [`../STATUS.md`](../STATUS.md) → **13-api-routes.md**

## Out of scope

HTTP layer (task **13**)
Threat T8 integration (task **21**)

# 10 — DAL patch (assign / revoke roles)

> **Status:** Complete (2026-06-02). Next: [12-dal-contract-tests.md](./12-dal-contract-tests.md).

## Goal

Mutate `latch_user_roles` through `user_roles_detail` with strict writable Zod, re-authorized manifest, and audit rows. Enforce **T8**: non-`iam_master` cannot change assignments.

## Prerequisites

[09-dal-get.md](./09-dal-get.md) complete.

## Files

| File | Action |
|------|--------|
| `apps/crm/src/lib/iam/repository.ts` | `patchUserRoles` — replace role set or delta per locked API shape |
| `apps/crm/src/lib/iam/schemas.ts` | Generated strict writable schema for `role_assignments` (mirror `customers/schemas.ts`) |
| `apps/crm/src/lib/iam/apply-patch.ts` | Apply role-set change to store (mirror `customers/apply-patch.ts`) |
| `apps/crm/db/memory-store.ts` | Transactional role replace (`setUserRoles`) |
| Audit wiring | `writeAudit` on successful assign/revoke (entity `latch_users`, action `update`) |

## Steps

1. Lock patch shape in this task if not in decisions: **replace full `role_assignments` array** (simplest strict schema).
2. Re-resolve manifest on patch; require `write` on `role_assignments`.
3. Reject unknown keys (`.strict()`); reject disallowed role ids (only known catalog: `field_tech`, `office_admin`, `iam_master`, `data_master` + future app roles).
4. **Self-escalation guard:** caller cannot patch **their own** `user_id` to add `iam_master` unless product decision says otherwise — default **deny self-patch** (document in decisions if changed).
5. Write audit with before/after role lists.
6. Forbidden → `ForbiddenError` (403); no grant → `NotFoundError`.

## Verify (stop gate)

- [x] `iam_master` can set `seed-field-tech` roles to `['field_tech']` only
- [x] `field_tech` patch → 403 or 404; no store change; audit deny if `auditDeniedAccess` enabled
- [x] PATCH with unknown role id → 400
- [x] PATCH with extra JSON key → 400 (T1)
- [x] Audit row exists on successful change
- [x] [`../STATUS.md`](../STATUS.md) → **12-dal-contract-tests.md**

## Out of scope

HTTP routes (task **13**)
Auth.js (task **14**)

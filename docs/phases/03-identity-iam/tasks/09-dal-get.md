# 09 — DAL get (`dal.iam.getUserRoles`)

> **Status:** Complete (2026-06-02). Next: [10-dal-patch.md](./10-dal-patch.md).

## Goal

Read path for `user_roles_detail`: manifest projection, forbidden Field omission, default deny / 404 for non-`iam_master` principals.

## Prerequisites

[08-codegen-policy-builtins.md](./08-codegen-policy-builtins.md) complete.

## Files

| File | Action |
|------|--------|
| `apps/crm/src/lib/iam/descriptors.ts` | `userRolesDetailDescriptor` |
| `apps/crm/src/lib/iam/project.ts` | DTO: `profile`, `role_assignments` |
| `apps/crm/src/lib/iam/repository.ts` | `createIamDal` / `getUserRoles` |
| `apps/crm/src/lib/latch.ts` | Wire `getIamDal`; `resolveContext` for `user_roles_detail` |
| `apps/crm/db/memory-store.ts` | Role list helpers if not already sufficient |

## Steps

1. Require `PermissionContext` with `ctx.surface === 'user_roles_detail'`.
2. **No grant:** `NotFoundError` (404 hide) for non-`iam_master`.
3. Load user by id; missing → `NotFoundError`.
4. **`profile`:** include only if `read` in manifest.
5. **`role_assignments`:** string[] of `role_id` from `latch_user_roles`; omit Field if no `read`.
6. No `db.*` outside DAL wiring (invariant).

## Verify (stop gate)

- [x] `iam_master` get returns `profile` + `role_assignments` for seeded admin user
- [x] `office_admin` / `field_tech` → `NotFoundError`
- [x] DTO omits Fields without `read`
- [x] `npm run test` — IAM get unit test green
- [x] [`../STATUS.md`](../STATUS.md) → **10-dal-patch.md**

## Out of scope

Assign/revoke writes (task **10**)
REST routes (task **13**)

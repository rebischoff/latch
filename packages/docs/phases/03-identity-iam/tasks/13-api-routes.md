# 13 — REST API routes (`user_roles_detail`)

> **Status:** Complete (2026-06-02). Next: [14-auth-provider.md](./14-auth-provider.md).

## Goal

`GET` / `PATCH` `/api/iam/users/[id]` (or equivalent) — orchestration only, DAL-only data path. Prove IAM Surface over HTTP; **no** CRM admin UI.

## Prerequisites

[12-dal-contract-tests.md](./12-dal-contract-tests.md) complete.

## Files

| File | Action |
|------|--------|
| `apps/crm/src/app/api/iam/users/[id]/route.ts` | **Create** — `GET`, `PATCH` |
| `apps/crm/src/lib/api/iam-handler.ts` | Optional error mapper (mirror [`api/customer-handler.ts`](../../../../apps/crm/src/lib/api/customer-handler.ts)) |
| `apps/crm/src/lib/latch.ts` | `resolveContext({ surfaceId: 'user_roles_detail', entityId })` |
| `apps/crm/docs/AUTH.md` | Document curl examples for IAM API |

## Steps

1. Read [`../../../reference/api-style.md`](../../../reference/api-style.md).
2. **GET** — `resolveContext`; `dal.iam.getUserRoles(ctx)`; `{ data, manifest }`.
3. **PATCH** — re-resolve; strict body; `dal.iam.patchUserRoles(ctx, id, body)`.
4. Map errors: `NotFoundError` → 404; `ForbiddenError` → 403; validation → 400.
5. **No** `db.*` in route handlers.
6. `requireSession()` before DAL on both methods.

## Verify (stop gate)

- [x] `curl` GET as `iam_master` — returns `role_assignments`
- [x] `curl` GET as `field_tech` — **404**
- [x] `curl` PATCH as `iam_master` — updates roles; GET confirms
- [x] `curl` PATCH as `field_tech` — **404** (existence hide; matches task **12** DAL); no change
- [x] [`../STATUS.md`](../STATUS.md) → **14-auth-provider.md**

## Out of scope

CRM React admin pages
Auth.js install (task **14**) — routes may use existing session until **15**

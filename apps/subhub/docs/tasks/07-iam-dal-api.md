# 07 — IAM DAL and API

## Goal

DAL get/list/patch for IAM surfaces; explicit API routes under `api/iam/`.

## Prerequisites

[06-iam-surfaces.md](./06-iam-surfaces.md) complete.

## Files

| File | Action |
|------|--------|
| `lib/iam/descriptors.ts` | **Create** |
| `lib/iam/repository.ts` | **Create** — hand SQL for grants / assignments |
| `lib/iam/dal.ts` | **Create** — `createSurfaceDal` factories |
| `app/api/iam/users/route.ts` | **Create** — list |
| `app/api/iam/users/[id]/route.ts` | **Create** — detail + patch |
| `app/api/iam/roles/route.ts` | **Create** |
| `app/api/iam/roles/[id]/route.ts` | **Create** |

## Steps

1. Every DAL method receives `PermissionContext`; no `db.*` in route handlers.
2. Use `createSurfaceRouteHandlers` / `createSurfaceListRouteHandlers` from `@latch/app-kit`.
3. Role detail patch validates grants against codegen vocabulary catalog.
4. Non-IAM principal → `NotFoundError` on IAM surfaces (404 hide).
5. Responses include `{ data, manifest }`.

## Verify (stop gate)

- [ ] Admin `GET /api/iam/users` returns rows + manifest
- [ ] Non-admin `GET` returns 404
- [ ] `PATCH` role grants persists to `latch_role_grants`
- [ ] No raw `db` imports in `app/api/**`
- [ ] [`../../STATUS.md`](../../STATUS.md) → [08-iam-ui.md](./08-iam-ui.md)

## Out of scope

- React pages
- Dev role seeds

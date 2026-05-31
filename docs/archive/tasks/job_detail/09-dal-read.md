# 09 — DAL read (`dal.jobs.get`)

## Goal

Read one job through DAL: row filter (`own` vs `all`), Field projection (omit forbidden).

## Prerequisites

[08-codegen.md](./08-codegen.md) complete.

## Files

| File | Action |
|------|--------|
| `packages/dal/src/jobs/project.ts` | `projectJobRow(row, manifest, assignments)` |
| `packages/dal/src/jobs/repository.ts` | `get(ctx, id)` |
| `packages/dal/src/index.ts` | Export `createJobsDal` |

## Steps

1. Require `PermissionContext` on every call.
2. If `rowScope === 'own'`, allow only jobs where `assignments.user_id === principal.id`.
3. If not visible → `NotFoundError` (404 existence hiding per S4).
4. Build DTO: include only Fields with `read` in manifest; **do not** set forbidden keys to `null`.

## Verify (stop gate)

- [x] Manual/script: tech `get` owned job → no `financial_terms` key
- [x] Admin `get` same job → `financial_terms.contract_amount` present
- [x] Tech `get` other job → throws `NotFoundError`
- [x] `STATUS.md` → **10-dal-write.md**

## Out of scope

PATCH, soft delete, HTTP routes.

# 09 — DAL list (`dal.jobs.list`)

## Goal

List jobs through DAL: row filter (`own` vs `all`), list DTO projection (omit forbidden Fields), pagination and status filter per task 00.

## Prerequisites

[08-codegen.md](./08-codegen.md) complete.

## Files

| File | Action |
|------|--------|
| `packages/dal/src/jobs/list-project.ts` | `projectJobListRow(row, manifest, joins)` — list DTO shape |
| `packages/dal/src/jobs/repository.ts` | `list(ctx, opts)` |
| `packages/dal/src/jobs/schemas.ts` | List query opts / list row types from generated schemas |
| `packages/dal/src/index.ts` | Export list API on `createJobsDal` |

## Steps

1. Require `PermissionContext` with `ctx.surface === 'job_list'` and matching manifest.
2. Apply `rowScope === 'own'` via same visibility rule as `get` (`rowVisibleToPrincipal`).
3. Optional `opts.status` filter on `jobs.status`; default sort `scheduled_at` asc.
4. Pagination: `limit` (default `listDefaultPageSize` 50, cap `listMaxPageSize` 200), `offset`.
5. Build list DTOs: include only Fields with `read` in manifest; **do not** set forbidden keys to `null`.
6. Empty result set for `own` scope → return `[]` (not `NotFoundError`).
7. Return `{ rows, total? }` or equivalent; caller wraps with manifest in API layer.

## Verify (stop gate)

- [ ] Tech `list` → rows only for assigned jobs; no `financial_terms` key on any row
- [ ] Admin `list` → includes `financial_terms` where granted; all non-deleted jobs in scope
- [ ] Tech with no assignments → `[]`, not throw
- [ ] `limit` above 200 rejected (`ValidationError` or clamp per global option)
- [ ] [`../STATUS.md`](../STATUS.md) → **10-dal-bulk-update.md**

## Out of scope

Bulk update/delete, HTTP routes.

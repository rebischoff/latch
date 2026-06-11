# 03 — DAL scoped row filter (`@latch/dal`)

> **Status:** Complete (2026-06-10). Next: [04-crm-scoped-proof.md](./04-crm-scoped-proof.md). Package detail: [`01-scoped-row-filter`](../../../../dal/docs/tasks/01-scoped-row-filter.md).

## Goal

When `ctx.manifest.rowScope === "scope"`, list/get/bulk paths filter rows to `scope_id IN (manifest.scopeIds)`. `own` and `all` behavior unchanged.

## Deliverables

### Contract ([`packages/dal/src/store-adapter.ts`](../../../../dal/src/store-adapter.ts))

- Extend `ListQuery.rowScope` and `isRowVisibleToPrincipal` to include `"scope"`.
- Add `scopeIds?: ScopeId[]` to `ListQuery` (from `manifest.scopeIds`).

### Kernel ([`packages/dal/src/create-surface-dal.ts`](../../../../dal/src/create-surface-dal.ts), [`bulk.ts`](../../../../dal/src/bulk.ts))

- Pass `scopeIds` into list queries and per-row visibility checks.
- `get` / `delete` / `patch`: deny when row not visible under `scope` filter (403 or 404 per surface policy).

### Store adapters

- **In-memory test store** — filter by row `scopeId` field in contract tests.
- **`apps/crm` Postgres job store** — `WHERE scope_id = ANY($1)` (or `IN`) on list; visibility check on get/bulk.

### Unit tests ([`packages/dal/src/create-surface-dal.test.ts`](../../../../dal/src/create-surface-dal.test.ts))

- Scoped principal sees only in-scope rows on list.
- Out-of-scope row: get → not visible; bulk skip/deny per existing bulk semantics.
- `own` path ignores `scopeIds`.
- `all` path ignores `scopeIds`.

## Verify (stop gate)

- [x] `ListQuery` + `isRowVisibleToPrincipal` accept `scope` + `scopeIds`
- [x] List/get/bulk honor `rowScope === "scope"`
- [x] `own` / `all` regression tests pass
- [x] `npm run test -w @latch/dal` passes

## Out of scope

- CRM DDL for `jobs.scope_id` (task 04) — but adapter may stub until migration lands

# 11 — DAL bulk delete (`dal.jobs.bulkDelete`)

## Goal

Bulk **hard delete** jobs: same per-row auth and mode semantics as bulk update ([`../../reference/bulk-operations.md`](../../../../dal/docs/bulk-operations.md)).

## Prerequisites

[10-dal-bulk-update.md](./10-dal-bulk-update.md) complete.

## Files

| File | Action |
|------|--------|
| `packages/dal/src/jobs/bulk.ts` | `bulkDelete(ctx, ids, opts)` |
| `packages/dal/src/jobs/repository.ts` | Reuse single-record `delete` helpers where possible |

## Steps

1. Require `delete` on Surface or relevant Field per manifest (mirror single-record `delete`).
2. Same cap (`bulkMaxBatch`), skip reasons, and `partial` / `all_or_nothing` as bulk update.
3. Per succeeded row: remove live row (+ cascade assignments); audit `action = delete` with `before` snapshot, `after = null`.
4. Invisible rows → `not_found` in `skipped`.

## Verify (stop gate)

- [ ] Admin bulk deletes N visible jobs → N audit rows; jobs absent from subsequent `list`
- [ ] `all_or_nothing` with one forbidden id → no rows deleted
- [ ] [`../STATUS.md`](../STATUS.md) → **12-dal-contract-tests.md**

## Out of scope

Restore-from-audit tool, bulk HTTP routes, approval batch UX.

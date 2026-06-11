# 10 — DAL bulk update (`dal.jobs.bulkUpdate`)

## Goal

Bulk PATCH through DAL: per-row permission, `partial` vs `all_or_nothing`, strict patch schema, audit per success.

## Prerequisites

[09-dal-list.md](./09-dal-list.md) complete.

## Files

| File | Action |
|------|--------|
| `packages/dal/src/jobs/bulk.ts` | `bulkUpdate(ctx, ids, patch, opts)` |
| `packages/dal/src/jobs/repository.ts` | Delegate or integrate bulk module |
| `packages/contracts/src/types.ts` | `BulkUpdateResult` if not already exported |

## Steps

1. Read [`../../../reference/bulk-operations.md`](../../../reference/bulk-operations.md) algorithm and skip-reason Decision (2026-05-29).
2. Reject `ids.length > bulkMaxBatch` (500).
3. Validate patch with manifest-narrowed **strict** Zod (`job_list` writable schema). Unknown keys → `ValidationError` for whole request (T1).
4. Per id: load row with row filter; invisible → `skipped` with `not_found`; visible but denied Field → `forbidden_field`.
5. **`partial`:** apply writable rows in one transaction; return `{ succeeded, skipped, failed }`.
6. **`all_or_nothing`:** if any skip at steps 4–5, abort with no DB changes; surface as `409` at API layer.
7. Primary v1 patch path: `assignments` bulk reassign (S2).
8. `writeAudit` per changed row; optional `bulk_summary` with `request_id`.
9. Re-resolve manifest is caller responsibility before invoke (T3 at API).

## Verify (stop gate)

- [ ] Admin bulk 20 ids, 5 not visible to admin → 15 `succeeded`, 5 `skipped` (`partial`), DB consistent
- [ ] Same batch with `all_or_nothing` and any skip → no rows changed
- [ ] Patch with unknown key → 400, no rows touched
- [ ] [`../STATUS.md`](../STATUS.md) → **11-dal-bulk-delete.md**

## Out of scope

Bulk delete, HTTP routes, approval batch UX.

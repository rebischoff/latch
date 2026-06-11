# 00 — Lock Phase 01 list/bulk defaults

## Goal

Record `job_list` defaults for list pagination, bulk caps/modes, filter MVP, and bulk skip-reason semantics so tasks 06–21 do not re-debate them.

## Prerequisites

None. First executable task in this phase.

## Files (docs only — do not add application code)

| File | Action |
|------|--------|
| [`../decisions.md`](../decisions.md) | Move Open items → **Decided** table |
| [`../../../foundations/global-options.md`](../../../foundations/global-options.md) | Add `listDefaultPageSize`, `listMaxPageSize` |
| [`../../../reference/bulk-operations.md`](../../../reference/bulk-operations.md) | Add Decision: bulk skip reasons (existence-hiding) |
| [`../STATUS.md`](../STATUS.md) | After verify: **Execute now** → `01-task-index.md` |

## Steps

1. **Bulk `mode`** — Confirm default `partial` (`bulkDefaultMode` in global-options). Per-request override: `all_or_nothing`.
2. **Bulk id cap** — Confirm `bulkMaxBatch: 500` (no change).
3. **List pagination** — Add global options:
   - `listDefaultPageSize`: `50`
   - `listMaxPageSize`: `200` (hard cap per request)
   - Pagination shape: `limit` + `offset` (cursor deferred).
4. **`GET /api/jobs` filter MVP** — v1 supports:
   - `?status=<value>` optional filter on `jobs.status`
   - Default sort: `scheduled_at` ascending
   - No full-text search in v1
5. **Bulk skip reasons** — v1 default (align with single-record DAL):
   - Row not visible under row scope → `not_found` in `skipped` (existence-hiding)
   - Row visible but Field/action denied → `forbidden_field` or `forbidden_row` as appropriate
   - Do **not** use `forbidden_row` for existence-hiding on invisible rows
6. **List empty set** — `field_tech` with no assigned jobs → `200` + `{ data: [], manifest }` (not 404).
7. **Surface Field sketch** — Lock for task 06: `summary`, `customer_site`, `financial_terms`, `assignments` (see [phase README](../README.md#surface-sketch-proposal--lock-in-task-06)).
8. Update [`../decisions.md`](../decisions.md) and phase [`../STATUS.md`](../STATUS.md).

## Verify (stop gate)

- [x] Open items in `decisions.md` resolved; no unchecked Open section items
- [x] `listDefaultPageSize` and `listMaxPageSize` appear in `global-options.md`
- [x] Decision block for bulk skip reasons in `bulk-operations.md`
- [x] `STATUS.md` **Execute now** → `01-task-index.md`
- [x] No new files under `packages/*` or `apps/web/src` from this task

## Out of scope

- `job_list.surface.yaml` (task **06**)
- DAL or API implementation

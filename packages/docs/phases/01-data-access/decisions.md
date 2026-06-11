# Phase 01 — decisions

## Decided

| Date | Topic | Choice |
|------|-------|--------|
| 2026-05-27 | Bulk model | Per-row eval; `partial` default + `all_or_nothing` flag. See [`../../reference/bulk-operations.md`](../../reference/bulk-operations.md) |
| 2026-05-29 | Bulk id cap | `bulkMaxBatch: 500` confirmed ([`../../foundations/global-options.md`](../../foundations/global-options.md)) |
| 2026-05-29 | List pagination | `listDefaultPageSize: 50`, `listMaxPageSize: 200`; `limit` + `offset` (cursor deferred) |
| 2026-05-29 | List filter MVP | `GET /api/jobs?status=` optional; sort `scheduled_at` asc; no full-text search in v1 |
| 2026-05-29 | Bulk skip reasons | Invisible rows → `not_found`; field/action denial → `forbidden_field` / `forbidden_row`. See [`../../reference/bulk-operations.md`](../../reference/bulk-operations.md) |
| 2026-05-29 | List empty set | `own` scope with zero rows → `200` + `data: []` (not 404) |
| 2026-05-29 | `job_list` Fields | `summary`, `customer_site`, `financial_terms`, `assignments` (task 06) |
| 2026-05-30 | Delete model | **Hard delete only** (global — [`../../foundations/scope.md`](../../foundations/scope.md)). Bulk delete uses same `delete` + audit semantics. |
| 2026-06-01 | List vs detail policy model | **One Surface id + `mode`** per domain; base role policy + restrict-only mode overlays ([`../../foundations/glossary.md`](../../foundations/glossary.md)). Code still uses `job_list` / `job_detail` ids until `PolicyService` merge; YAML must stay aligned on `rowScope` and Field `read`. |

## Carried forward (resolved elsewhere)

- **Restore-from-audit** UI/tool: Phase 04 ([`../04-audit-lifecycle/decisions.md`](../04-audit-lifecycle/decisions.md)).

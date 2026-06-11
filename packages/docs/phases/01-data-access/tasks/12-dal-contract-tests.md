# 12 — DAL contract tests (list + bulk)

## Goal

Automated tests for list projection, row scope, strict bulk patch, and bulk modes (`partial` / `all_or_nothing`).

## Prerequisites

[11-dal-bulk-delete.md](./11-dal-bulk-delete.md) complete.

## Files

| File | Action |
|------|--------|
| `packages/dal/src/jobs/repository.test.ts` | Extend with `job_list` context |
| `packages/dal/src/jobs/list.test.ts` | Optional — list-specific tests if file split preferred |

## Steps

1. Use `MemoryJobStore` + `seedPilotJobs` (same as pilot).
2. Resolve manifest with `surface: 'job_list'` for tech vs admin.
3. **List / T2:** tech list DTO has no `financial_terms` property on any row (`not.toHaveProperty`).
4. **Row scope:** tech `list` only returns assigned job ids; admin returns broader set.
5. **Strict bulk:** `{ assignments: {...}, evil: true }` → `ValidationError`.
6. **T15 / partial:** mixed permitted + forbidden ids → partial result counts match; DB state consistent.
7. **T15 / all_or_nothing:** any forbidden id → no DB changes.
8. **Empty list:** tech with no assignments → `[]`.

## Verify (stop gate)

- [x] `npm run test` — dal contract tests green
- [x] [`../STATUS.md`](../STATUS.md) → **13-api-routes.md**

## Out of scope

HTTP E2E (task **20**), threat file (task **21**).

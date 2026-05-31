# 13 — REST API routes (list + bulk)

## Goal

`GET /api/jobs`, `PATCH` / `DELETE` `/api/jobs:bulk` — orchestration only, DAL-only data path. Keep existing `job_detail` routes on `/api/jobs/[id]` unchanged.

## Prerequisites

[12-dal-contract-tests.md](./12-dal-contract-tests.md) complete.

## Files

| File | Action |
|------|--------|
| `apps/web/src/app/api/jobs/route.ts` | **Create** — `GET` collection for `job_list` |
| `apps/web/src/app/api/jobs:bulk/route.ts` | **Create** — `PATCH`, `DELETE` bulk (or equivalent path per Next.js routing) |
| `apps/web/src/lib/latch.ts` | `resolveContext({ surfaceId: 'job_list' })` for list/bulk |
| `apps/web/src/lib/api/job-handler.ts` | Map bulk result → status (`200` partial, `409` all_or_nothing) |

## Steps

1. Read [`../../../reference/api-style.md`](../../../reference/api-style.md) and [`../../../reference/bulk-operations.md`](../../../reference/bulk-operations.md).
2. **GET** — parse `limit`, `offset`, `status`; `resolveContext({ surfaceId: 'job_list' })`; `dal.jobs.list(ctx, opts)`; return `{ data, manifest }`.
3. **PATCH :bulk** — body `{ ids, patch, mode? }`; re-resolve manifest; `bulkUpdate`; map `all_or_nothing` failure → `409`.
4. **DELETE :bulk** — body `{ ids, mode? }`; `bulkSoftDelete`.
5. **No** `db.*` imports in `apps/web` (invariant).
6. Default `mode` from `bulkDefaultMode` (`partial`) when omitted.

## Verify (stop gate)

- [ ] `curl` GET as tech — JSON rows without `financial_terms`; only assigned jobs
- [ ] `curl` GET as admin — includes `financial_terms` on rows
- [ ] Bulk PATCH partial — response `{ succeeded, skipped }` matches DAL; 200 status
- [ ] Bulk PATCH `all_or_nothing` with any skip — 409, no DB change
- [ ] [`../STATUS.md`](../STATUS.md) → **16-jobs-list-page.md**

## Out of scope

RSC `/jobs` page, Playwright.

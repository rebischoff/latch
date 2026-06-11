# 13 — REST API routes

## Goal

`GET` / `PATCH` / `DELETE` `/api/jobs/[id]` — orchestration only, DAL-only data path.

## Prerequisites

[12-dal-contract-tests.md](./12-dal-contract-tests.md) complete.

## Files

| File | Action |
|------|--------|
| `apps/web/src/lib/latch.ts` | `resolveContext`, `getJobsDal`, seed on first use |
| `apps/web/src/lib/api/job-handler.ts` | Map errors → JSON status |
| `apps/web/src/app/api/jobs/[id]/route.ts` | GET, PATCH, DELETE |

## Steps

1. Read [`../../architecture/api-style.md`](../../../reference/api-style.md).
2. Each handler: `resolveContext({ surfaceId: 'job_detail', entityId: id })` then DAL.
3. **No** `db.*` imports in `apps/web` (invariant).
4. Return `{ data, manifest }` on success.

## Verify (stop gate)

- [x] `curl` GET owned job as tech — JSON without `financial_terms`
- [x] `curl` GET as admin — includes `financial_terms`
- [x] `curl` GET other tech job as tech — 404
- [x] `STATUS.md` → **14-server-action.md**

## Out of scope

RSC page, stub auth env (task **15**).

# 14 — Server Action

## Goal

One Server Action mutating a writable Field (e.g. update `summary.title`).

## Prerequisites

[13-api-route.md](./13-api-route.md) complete.

## Files

| File | Action |
|------|--------|
| `apps/web/src/app/actions/job-detail.ts` | `updateJobSummary(jobId, title)` |

## Steps

1. `'use server'`; call `resolveContext` + `dal.patch` with `{ summary: { title } }`.
2. `revalidatePath(`/jobs/${jobId}`)`.
3. Return `{ ok, error? }` for form handling.

## Verify (stop gate)

- [x] Action succeeds for tech on owned job
- [x] Action fails appropriately when write forbidden
- [x] `STATUS.md` → **15-stub-principal.md**

## Out of scope

Full form UI (task **16**).

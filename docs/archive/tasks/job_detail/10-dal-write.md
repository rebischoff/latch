# 10 — DAL write (`dal.jobs.patch`)

## Goal

PATCH body parsed with manifest-narrowed **strict** Zod; re-resolve not required inside DAL if caller passes fresh `ctx`.

## Prerequisites

[09-dal-read.md](./09-dal-read.md) complete.

## Files

| File | Action |
|------|--------|
| `packages/dal/src/jobs/repository.ts` | `patch(ctx, id, body)` |

## Steps

1. Use `narrowSchema(JobDetailPatchSchema, manifest, 'write')`.
2. Reject unknown keys (T1 / mass assignment).
3. Map nested Field patches to column updates on `jobs`.
4. Call `writeAudit` on success.
5. Financial write by role without direct write: route to pending (task **18**) or forbid.

## Verify (stop gate)

- [x] Tech can patch `summary.title`; audit entry recorded
- [x] Tech PATCH with `financial_terms` or unknown key → 400/403
- [x] `STATUS.md` → **11-dal-soft-delete.md**

## Out of scope

Server Actions, approval accept flow.

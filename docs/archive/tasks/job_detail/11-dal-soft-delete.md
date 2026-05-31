# 11 — DAL soft delete

## Goal

Soft-delete job: `deleted_at`, `deleted_by`; hidden from default `get`.

## Prerequisites

[10-dal-write.md](./10-dal-write.md) complete.

## Files

| File | Action |
|------|--------|
| `packages/dal/src/jobs/repository.ts` | `softDelete(ctx, id)` |

## Steps

1. Require `delete` on `summary` Field (or Surface action per your manifest model).
2. Set `deleted_at`, `deleted_by = principal.id`.
3. Audit with `action: soft_delete`.
4. Subsequent `get` → `NotFoundError`.

## Verify (stop gate)

- [x] Admin soft-deletes job; `get` returns 404
- [x] Audit row exists
- [x] `STATUS.md` → **12-dal-contract-tests.md**

## Out of scope

Restore, hard delete.

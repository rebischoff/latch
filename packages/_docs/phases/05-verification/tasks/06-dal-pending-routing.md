# 06 — DAL metadata pending routing + T10 guard

> **Status:** Complete (2026-06-03). Next: [`07-postgres-pending-store.md`](./07-postgres-pending-store.md).

## Goal

Replace hand-written `pendingWrite` on `job_detail` with **hybrid** routing: verification Field set from codegen + manifest `submit` ∧ ¬`write`. Add platform **T10** guard so verification Fields cannot hit live rows except via `acceptPending` applier path.

## Prerequisites

- [05-surface-codegen.md](./05-surface-codegen.md) complete.

## Files

| File | Action |
|------|--------|
| `packages/dal/src/create-surface-dal.ts` | Generic pending extraction; applier context flag |
| `apps/crm/src/lib/jobs/descriptors.ts` | Remove `pendingWrite` hook when generic path works |
| `packages/dal/src/create-surface-dal.test.ts` | Pending + T10 unit tests |

## Steps

1. Read [00-decisions.md](./00-decisions.md) §4.
2. Split patch: gated → `pendingStore.submit`; remainder → direct write (existing behavior).
3. Enforce one open `submitted` per entity → **409** on duplicate.
4. Forbidden: live write to verification Field without applier flag.

## Verify (stop gate)

- [x] `repository.test.ts` / dal tests still pass with memory store
- [x] T10 unit: direct write to gated Field without accept → forbidden
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `07-postgres-pending-store.md`

## Out of scope

Postgres store (task **07**). reject/withdraw (task **08**).

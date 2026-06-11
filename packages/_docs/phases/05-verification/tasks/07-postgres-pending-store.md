# 07 — Postgres `PendingStore`

> **Status:** Complete (2026-06-03). Next: [08-accept-reject-withdraw.md](./08-accept-reject-withdraw.md).

## Goal

Implement **`createPostgresPendingStore(databaseUrl)`** in `@latch/approval`; wire CRM [`latch.ts`](../../../../../apps/crm/src/lib/latch.ts) to use Postgres when `DATABASE_URL` is set (mirror audit writer).

## Prerequisites

- [04-db-schema.md](./04-db-schema.md) complete.
- [06-dal-pending-routing.md](./06-dal-pending-routing.md) complete (or in parallel after **04**).

## Files

| File | Action |
|------|--------|
| `packages/approval/src/` | `postgres-pending-store.ts` (or similar) |
| `apps/crm/src/lib/latch.ts` | Select memory vs Postgres pending store |
| `packages/approval/package.json` | Export new factory |

## Steps

1. `submit`, `resolve`, `getById`, `getPendingForEntity` against `latch_pending_changes`.
2. Map columns ↔ `PendingChange` type; enforce terminal immutability in SQL or DAL layer.
3. CI: optional test when `DATABASE_URL` / app role URL set.

## Verify (stop gate)

- [x] Pending survives process restart in local Postgres smoke (`postgres-pending-store.test.ts` when `LATCH_APP_DATABASE_URL` or `DATABASE_URL` with `latch_app`)
- [x] `npm run test` green
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `08-accept-reject-withdraw.md`

## Out of scope

DB trigger immutability (deferred). API routes (task **10**).

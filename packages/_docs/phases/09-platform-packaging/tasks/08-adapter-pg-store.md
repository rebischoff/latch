# 08 — `@latch/adapter-pg-store` (SQL-first)

> **Status:** Complete (2026-06-11). Next: [10-scaffold-proof.md](./10-scaffold-proof.md) (or optional [09-kernel-merge.md](./09-kernel-merge.md)).
>
> **Re-scoped 2026-06-11.** Was "`@latch/adapter-drizzle` `StoreAdapter` helper." Drizzle is **retired as the runtime engine** — persistence is **raw `pg` + codegen-emitted SQL**. Canonical decision: [`../../../discussions/11-spine-adapters-skin.md`](../../../discussions/11-spine-adapters-skin.md#decision-sql-first-persistence--retire-drizzle-as-the-runtime-orm-2026-06-11); v1 scope: [`../../../foundations/scope.md`](../../../foundations/scope.md#decision-sql-first-persistence--retire-drizzle-as-runtime-orm-2026-06-11).

## Goal

Business persistence on **raw `pg`**, no ORM. Two deliverables behind the same port:

1. **Async `StoreAdapter`** — promote the kernel store contract from sync → async (prerequisite).
2. **`@latch/adapter-pg-store`** — `createPgStoreAdapter(table, columnMap)` implementing the async `StoreAdapter` over a shared `pg` pool, wrapped in `withPermissionDb`.
3. **Codegen store SQL** — `codegen` emits `store.generated.ts` (parameterized get/list/insert/update/delete) for **single-table** surfaces from the YAML `columnMap`.

Multi-table glue stays hand-written in `repository.ts` ([01-codegen B](../../../discussions/01-codegen.md)). Memory stores remain valid as **kernel-unit-test doubles only** — not shipped, not a prod fallback.

## Prerequisite — async `StoreAdapter`

- [`packages/dal/src/store-adapter.ts`](../../../../dal/src/store-adapter.ts) `StoreAdapter` methods (`get`, `list`, `upsert`, `delete`, `getRelated`, `replaceRelated`, `isRowVisibleToPrincipal`) return `Promise<…>`.
- [`packages/dal/src/create-surface-dal.ts`](../../../../dal/src/create-surface-dal.ts), [`bulk.ts`](../../../../dal/src/bulk.ts), [`delete-row.ts`](../../../../dal/src/delete-row.ts) `await` all store calls.
- Memory test stores updated to async; kernel tests stay green.
- Unlocks single-transaction business write + audit + pending (no longer "ordering, not atomicity" — see [approval-trails.md](../../../../approval/docs/approval-trails.md)).

## Files

| File | Action |
|------|--------|
| `packages/dal/src/store-adapter.ts` + kernel | `StoreAdapter` → async; `await` store calls in DAL/bulk/delete |
| `packages/adapter-pg-store/` (new) | `@latch/adapter-pg-store`; `createPgStoreAdapter(table, columnMap)` over `pg` + `withPermissionDb` (`@latch/pg-session`) |
| `packages/codegen` | Emit `store.generated.ts` (single-table parameterized SQL) from `columnMap`; `--check` cross-checks YAML types vs **parsed migration DDL** (D2/D5 resolved to SQL-first) |
| template / proof fixture | One surface uses `createPgStoreAdapter` + generated store SQL |
| `packages/adapter-pg-store/src/*.test.ts` | Async `StoreAdapter` contract conformance; PG integration tests (DB-gated, `it.runIf`) |

## Verify (stop gate)

- [x] `StoreAdapter` is async; `@latch/dal` kernel + bulk + delete `await` store calls; kernel tests green.
- [x] `@latch/adapter-pg-store` builds; implements the async `StoreAdapter` for single-table surfaces over `pg` + `withPermissionDb`.
- [x] `codegen` emits `store.generated.ts` for a single-table surface; `--check` cross-checks YAML types vs migration DDL.
- [x] No `drizzle-orm` import in any `@latch/*` runtime package (grep clean).
- [x] One proof/template surface uses the generated store SQL end-to-end (PG integration test).
- [x] Memory store still valid for kernel unit tests; compartment tests unchanged.
- [x] `npm run test` / `build` green; [`../STATUS.md`](../STATUS.md) → `10-scaffold-proof.md`.

## Out of scope

- Multi-table store SQL / joins (hand-written `repository.ts`); YAML→DDL/migration generation (toolchain ambition, D5 still deferred).
- Optional kernel merge (task 09).

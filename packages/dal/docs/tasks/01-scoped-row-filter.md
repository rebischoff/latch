# 01 — Scoped row filter (`rowScope: scope`)

> **Status:** Complete (2026-06-10). Phase: [08 task 03](../../../docs/phases/08-scoped-access/tasks/03-dal-scope-filter.md).

## Goal

Extend the DAL kernel and `StoreAdapter` contract so `rowScope === "scope"` filters rows by `manifest.scopeIds`.

## Deliverables

### Types ([`src/store-adapter.ts`](../../src/store-adapter.ts))

```ts
rowScope: "own" | "scope" | "all";
scopeIds?: ScopeId[];  // required when rowScope === "scope"
```

Import `ScopeId` from `@latch/contracts`.

### Kernel

- [`create-surface-dal.ts`](../../src/create-surface-dal.ts) — pass `scopeIds` from `ctx.manifest` into list + `isRowVisibleToPrincipal`.
- [`bulk.ts`](../../src/bulk.ts) — per-row scope check before patch/delete.

### Visibility semantics

| `rowScope` | Filter |
|------------|--------|
| `all` | No row filter |
| `own` | Store assignment join (ignore `scopeIds`) |
| `scope` | Row `scope_id` ∈ `scopeIds`; empty `scopeIds` → no rows |

### Tests

- Extend [`create-surface-dal.test.ts`](../../src/create-surface-dal.test.ts) in-memory store with `scopeId` on rows.

### CRM adapter (may split to phase task 04)

- Postgres job store implements scoped list `WHERE`.

## Verify (stop gate)

- [x] Contract extended; kernel wired
- [x] Scoped list/get/bulk tests pass
- [x] `own` / `all` regression green
- [x] `npm run test -w @latch/dal` passes

## Out of scope

- `resolve` implementation (policy 05b)
- CRM migration (phase 08 task 04)

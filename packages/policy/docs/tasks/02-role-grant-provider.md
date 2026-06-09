# 02 — `RoleGrantProvider` seam in `@latch/policy`

> **Status:** Complete (2026-06-06) — delivered with [codegen task 04](../../../codegen/docs/tasks/04-policy-registry-gen.md). This task is the **in-package seam only** (interface + memory provider). Runtime Postgres wiring is **[02b](./02b-db-role-grant-provider.md)** (after [01b](./01b-p11-catalog-realignment.md)). Next for the plan: [01b](./01b-p11-catalog-realignment.md).

## Goal

Make `PolicyService.resolve` read role→Field **grants** from a runtime **`RoleGrantProvider`** instead of the static `SurfacePolicyDefinition.roles` map. The registry entry keeps only the **vocabulary** (`fieldIds` / `kind` / `modes` / available actions) emitted by codegen; grants are injected at resolve time. This preserves the existing merge semantics (`union_grants` + `denyWins`) and built-in synthesis (`system_data` on `kind: business`, `system_iam` on `kind: iam` — today still slug-based until [01b](./01b-p11-catalog-realignment.md)).

## Out of scope (see 02b)

- Loading grants from `latch_role_grants` / `latch_role_surfaces` at runtime
- Request-scoped preload ([P5](./00-decisions-needed.md#p5--dbrolegrantprovider-location--sync-resolve-strategy))
- Any Postgres import inside `@latch/policy`

## Verify (stop gate)

- [x] `SurfacePolicyDefinition` carries vocabulary only (no `roles`)
- [x] `resolve` produces grants from a `RoleGrantProvider`; built-in wildcard + `union_grants` + `denyWins` unchanged
- [x] `MemoryRoleGrantProvider` drives all `@latch/policy` tests; two roles → different manifests
- [x] No regression in existing policy-service matrices
- [x] Resolve sync/async decision recorded — **sync** `resolve` retained; grants loaded synchronously from `RoleGrantProvider` (memory in tests; request-scoped preload for DB provider in [02b](./02b-db-role-grant-provider.md))

## Reference

- [`grant-provider.ts`](../../src/grant-provider.ts), [`policy-service.ts`](../../src/policy-service.ts), [`registry.ts`](../../src/registry.ts)
- [`02b-db-role-grant-provider.md`](./02b-db-role-grant-provider.md) — DB preload (next after 01b)
- [`packages/codegen/docs/tasks/04-policy-registry-gen.md`](../../../codegen/docs/tasks/04-policy-registry-gen.md)

# 02 — `RoleGrantProvider` seam in `@latch/policy`

> **Status:** Complete (2026-06-06) — delivered with [codegen task 04](../../../codegen/docs/tasks/04-policy-registry-gen.md). DB-backed provider wiring remains a separate app/runtime task. Next: [03 — role editor IAM Surface](./03-role-editor-surface.md).

## Goal

Make `PolicyService.resolve` read role→Field **grants** from a runtime **`RoleGrantProvider`** instead of the static `SurfacePolicyDefinition.roles` map. The registry entry keeps only the **vocabulary** (`fieldIds` / `kind` / `modes` / available actions) emitted by codegen; grants are injected at resolve time. This preserves the existing merge semantics (`union_grants` + `denyWins`) and `data_master` synthesis unchanged.

## Verify (stop gate)

- [x] `SurfacePolicyDefinition` carries vocabulary only (no `roles`)
- [x] `resolve` produces grants from a `RoleGrantProvider`; `data_master` wildcard + `union_grants` + `denyWins` unchanged
- [x] `MemoryRoleGrantProvider` drives all `@latch/policy` tests; two roles → different manifests
- [x] No regression in existing policy-service matrices
- [x] Resolve sync/async decision recorded — **sync** `resolve` retained; grants loaded synchronously from `RoleGrantProvider` (memory in tests; request-scoped preload for DB provider later).

## Reference

- [`grant-provider.ts`](../../src/grant-provider.ts), [`policy-service.ts`](../../src/policy-service.ts), [`registry.ts`](../../src/registry.ts)
- [`packages/codegen/docs/tasks/04-policy-registry-gen.md`](../../../codegen/docs/tasks/04-policy-registry-gen.md)

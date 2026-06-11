# 02 — Resolve `manifest.scopeIds` (`@latch/policy`)

> **Status:** Complete (2026-06-10). Next: [03-dal-scope-filter.md](./03-dal-scope-filter.md). Package detail: [`05b-scoped-rls-resolve`](../../../../policy/docs/tasks/05b-scoped-rls-resolve.md).

## Goal

Extend `PolicyService.resolve` so a principal with a `scope`-rung role binding receives `manifest.scopeIds` — the union of `scopeId` values from `principal.bindings` for roles that contribute a `rowScope: "scope"` policy on this surface.

## Background

Phase A put `scopeIds?: ScopeId[]` on `Manifest` and scoped bindings on `Principal`. `mergeRowScope` already handles the `"scope"` rung. `resolve` today returns `rowScope` only — no `scopeIds`.

## Deliverables

### `PolicyService.resolve` ([`packages/policy/src/policy-service.ts`](../../../../policy/src/policy-service.ts))

1. Track which `roleId`s contributed each merged role policy (including synthesized system classes — they contribute `all`, not `scope`).
2. After merge, when `merged.rowScope === "scope"`:
   - Collect `scopeId` from `principal.bindings` where `binding.scopeId != null` **and** the binding's `roleId` contributed a `scope`-rung policy for this surface.
   - Deduplicate → `manifest.scopeIds`.
3. When `merged.rowScope !== "scope"`, omit `scopeIds` (undefined).
4. When `merged.rowScope === "scope"` but the union is empty → `scopeIds: []` ([decision](../decisions.md)).

### `RoleGrantProvider` / grant fold

No DDL change. `DbRoleGrantProvider` already supplies `rowScope` per role×surface from `latch_role_surfaces`. Ensure `scope` value flows through preload unchanged.

### Unit tests ([`packages/policy/src/policy-service.test.ts`](../../../../policy/src/policy-service.test.ts))

- Single scoped binding → `scopeIds` contains that id.
- Two bindings same role, different scopes → union.
- `scope` + `all` across roles → `rowScope: "all"`, no `scopeIds`.
- `scope` + `own` → `rowScope: "scope"`, `scopeIds` from scoped role only.
- `system_data` synthesis → `all`, no `scopeIds`.

## Verify (stop gate)

- [x] `resolve` sets `scopeIds` when merged `rowScope === "scope"`
- [x] `scopeIds` omitted when `rowScope` is `own` or `all`
- [x] Empty binding union → `scopeIds: []`
- [x] `mergeRowScope` behavior unchanged; existing tests green
- [x] `npm run test -w @latch/policy` passes

## Out of scope

- DAL filtering (task 03)
- CRM migration (task 04)

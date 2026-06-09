# 02b — DB-backed `RoleGrantProvider` wiring

> **Status:** Complete (2026-06-08). Next: [03 — role editor IAM Surface](./03-role-editor-surface.md).
>
> **Prerequisite (complete):** [02 — provider seam](./02-role-grant-provider.md) (`RoleGrantProvider` interface + `MemoryRoleGrantProvider` in `@latch/policy`).

## Goal

At request bootstrap, **load runtime grants from Postgres** for the principal's assigned role ids and hand `PolicyService` a **sync** provider snapshot — so `resolve` reflects live `latch_role_grants` + `latch_role_surfaces` data without making `resolve` async.

## Background

- [Task 02](./02-role-grant-provider.md) locked the seam: grants come from `RoleGrantProvider`, not the static registry. Tests use `MemoryRoleGrantProvider`.
- [P5](./00-decisions-needed.md#p5--dbrolegrantprovider-location--sync-resolve-strategy) recommends: **interface stays in `@latch/policy`**; **DB implementation lives in the store/app layer**; **request-scoped preload** into a memory-shaped snapshot. No DB dependency inside `@latch/policy`.
- Fold `latch_role_surfaces.row_scope` when aggregating grant rows into one `RoleGrant` per role×surface ([P1](./00-decisions-needed.md#p1--row_scope-granularity-per-grant-row-or-per-role-surface)).
- System classes (`system_data`, `system_iam`) have **no grant rows** — synthesis in `PolicyService` only ([P4](./00-decisions-needed.md#decision-synthesize-both-built-ins-in-code-2026-06-06)).

## Shape (proposed — confirm P5 at start)

1. **Preload query** (per request): given `principal.roles: RoleId[]` (catalog UUIDs), `SELECT` grant rows + binding `row_scope` from `latch_role_grants` JOIN `latch_role_surfaces` (or equivalent two-query fold).
2. **Snapshot builder:** map rows → `MemoryRoleGrantBinding[]` (or populate a `MemoryRoleGrantProvider` instance).
3. **Wire:** `new PolicyService({ grantProvider: snapshot, registry, ... })` at the same layer that today builds `PermissionContext`.
4. **Invalidation:** grant changes bump `latch_policy_version` (task 03 write path; read path already respects `policyVersion` from Phase 06).

## Files (target — spike first, then template app)

| Concern | Location (sketch) |
|---------|-------------------|
| Preload + fold | `apps/spike_policy` lib or `@latch/store-drizzle` (confirm P5) |
| Integration test | `packages/policy/src/*.test.ts` with DB fixture **or** spike-only script documented in README |
| Harness | [`apps/spike_policy`](../../../../apps/spike_policy) — uses `900_fixture_pilot_roles` grants against `spike_codegen` vocabulary |

## Steps (outline)

1. Confirm P5: store package vs spike-local implementation.
2. Implement preload + `row_scope` fold into `RoleGrant[]` per (role, surface).
3. Wire preload at request bootstrap in the spike harness (minimal server or test hook).
4. Prove: principal with `field_tech` UUID → `resolve` on `widget_list` matches fixture grants; principal with only `system_data` UUID → business wildcard unchanged.
5. Document how the template app will reuse the same preload pattern.

## Verify (stop gate)

- [x] Grants for app roles load from DB (not hard-coded memory fixtures) in the spike harness
- [x] `row_scope` read from `latch_role_surfaces`, not grant rows
- [x] `PolicyService.resolve` stays **sync**; no `@latch/policy` → Postgres import
- [x] Two principals with different app-role UUIDs → different manifests on the same surface
- [x] System roles still synthesize without grant rows (depends on [01b](./01b-p11-catalog-realignment.md))
- [x] Preload scope documented (per-request; aligns with manifest cache request scope, Phase 06)

## Reference

- [`00-decisions-needed.md`](./00-decisions-needed.md) — P5 (location + preload)
- [`01-role-tables.md`](./01-role-tables.md) · [`01b-p11-catalog-realignment.md`](./01b-p11-catalog-realignment.md) — table shape
- [`02-role-grant-provider.md`](./02-role-grant-provider.md) — seam (complete)
- [`grant-provider.ts`](../../src/grant-provider.ts) · [`policy-service.ts`](../../src/policy-service.ts)

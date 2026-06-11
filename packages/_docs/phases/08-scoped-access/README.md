# Phase 08 — Scoped access (`@latch/policy` / `@latch/dal` / consumer harness)

> **Home packages:** `@latch/contracts`, `@latch/policy`, `@latch/dal`, `apps/spike_business` (task 04) · **Status:** complete (2026-06-10) · **Phase STATUS:** [`STATUS.md`](./STATUS.md)

## Goal

Finish the **bounded scope primitive** locked on 2026-06-09: scoped row filtering in the platform (`manifest.scopeIds` → DAL `WHERE scope_id IN (...)`), proven on a real business table in **`apps/spike_business`** ([two-harness decision](./decisions.md#decision-two-harness-proof-model--repoint-task-04-2026-06-10)). Scoped **assignment** and **delegation** are already proven in `apps/spike_policy` (policy task 05 Phase A + C).

This closes `@latch/policy` for the scope decision. Native Postgres RLS stays in Phase 07.

## Depends on

- **Phase 06** — manifest cache; `policyVersion` invalidation on assignment mutations.
- **Policy runtime roles 01–04** — `RoleGrantProvider`, DB preload, `row_scope` on `latch_role_surfaces`.
- **Policy task 05 Phase A** — `RowScope: "scope"`, `Principal.bindings`, `latch_scopes` DDL, `getPrincipal` scoped bindings.
- **Spike task 08** — scoped delegation guards (app code reference implementation).

## In / out of scope

| In scope | Out of scope |
|----------|--------------|
| `PolicyService.resolve` sets `manifest.scopeIds` for `row_scope: scope` | Native Postgres RLS (Phase 07) |
| `@latch/dal` list/get/bulk honor `rowScope === "scope"` | Per-scope differential field grants |
| `apps/spike_business` — business rows carry `scope_id`; seed + tests | Org-chart / scope-hierarchy traversal |
| Platform regression: system classes stay unscoped; `own`/`all` unchanged | ABAC / ReBAC |
| Policy + DAL unit tests for scoped visibility | Spike UI changes (already complete) |

## Sub-goals

1. Manifest is the only authority for scope row filters (invariant 1).
2. A `scope`-rung role sees only rows whose `scope_id` is in the actor's scoped bindings for that role (union across bindings).
3. `system_data` / `system_iam` synthesis stays `rowScope: all` with no `scopeIds`.
4. Consumer harness proves list + get + bulk under scoped visibility.

## Definition of done

- [x] `resolve` populates `scopeIds` when merged `rowScope === "scope"`
- [x] DAL kernel + `StoreAdapter` contract extended; list/get/bulk filter correctly
- [x] `apps/spike_business` business table has `scope_id`; scoped persona test in CI
- [x] Policy task 05 verify gates closed; [`packages/policy/docs/tasks/README.md`](../../../policy/docs/tasks/README.md) marks runtime roles **complete**
- [x] Phase STATUS + root [`STATUS.md`](../../../../STATUS.md) updated

## Task chain

Execute in order — see [`tasks/01-task-index.md`](./tasks/01-task-index.md). Start with [`tasks/00-decisions.md`](./tasks/00-decisions.md).

## References

- [`../../discussions/09-role-delegation-and-scope.md`](../../discussions/09-role-delegation-and-scope.md)
- [`../../reference/access-control.md`](../../../policy/docs/access-control.md#decision-bounded-scope-primitive--row_scope-scope--scoped-delegation-2026-06-09)
- [`../../../packages/policy/docs/tasks/05-scope-and-delegation.md`](../../../policy/docs/tasks/05-scope-and-delegation.md)
- Spike proof: [`../../../apps/spike_policy/docs/tasks/08-scoped-delegation.md`](../../../../apps/spike_policy/docs/tasks/08-scoped-delegation.md)

# 05 — Bounded scope primitive + scoped delegation

> **Status:** Complete (2026-06-10). Next: [README](./README.md) (runtime roles chain done). Phase orchestration: [Phase 08](../../../docs/phases/08-scoped-access/STATUS.md). Source decision: [discussion 09 — role delegation & scope](../../../docs/discussions/09-role-delegation-and-scope.md#decision-bounded-scope-primitive--scoped-delegation-2026-06-09). Part of the [runtime roles plan](./README.md).

## Goal

Add a **bounded scope primitive** (named branch/site/crew boundary the app instantiates) and use it for three jobs:

1. **Scoped RLS** — a third `row_scope` rung `scope` (`own ⊂ scope ⊂ all`).
2. **Scoped assignment** — `latch_user_roles` rows carry a nullable `scope_id`.
3. **Scoped delegation** — non-`system_iam` app roles may hand out an allow-listed set of roles, fenced to their scope(s).

This is *namespaced RBAC* (role binding at a scope node), **not** ABAC/ReBAC. Field/action grants stay **role-level**; scope narrows *rows* only.

## Background / invariants

- Manifest stays the only authority (invariant 1); DAL applies the scope row filter from `manifest.scopeIds` (invariant 2/4).
- `system_iam` / `system_data` stay **unscoped / company-wide** (`scope_id = NULL`). Scope qualifies **`app` roles only** — scoped admin ("branch admin") is an app role on an IAM Surface + scope, never a scoped system class.
- Reuses existing seams: `mergeRowScope` (most-permissive), `isRowVisibleToPrincipal` (store), `validateRoleAssignmentsPatch` (assignment guards).

## Phase A — seam (additive; do first, avoids later contract migration)

| Concern | Change |
|---------|--------|
| `@latch/contracts` | `RowScope` gains `"scope"`; `Principal` carries scoped bindings (`{ roleId, scopeId \| null }[]`) instead of flat `RoleId[]`; `Manifest` gains optional `scopeIds`. |
| Template migrations | `latch_scopes` (`id`, `kind`, `parent_id?`, `display_name`); `latch_user_roles.scope_id` nullable FK → `latch_scopes.id`; `latch_role_delegations` (`role_id`, `assignable_role_id`). |
| `latch_role_surfaces.row_scope` | accept `scope` (already a string column — no breaking DDL). |
| `getPrincipal` | populate scoped bindings from `latch_user_roles` (role + scope). |

## Phase B — scoped RLS (resolve + DAL)

Executable tasks:

| Step | Doc | Package |
|------|-----|---------|
| B1 | [05b — resolve `scopeIds`](./05b-scoped-rls-resolve.md) | `@latch/policy` |
| B2 | [dal 01 — scoped row filter](../../../dal/docs/tasks/01-scoped-row-filter.md) | `@latch/dal` |
| B3 | [Phase 08 task 04 — business proof](../../../docs/phases/08-scoped-access/tasks/04-crm-scoped-proof.md) | `apps/spike_business` |
| B4 | [05c — policy closeout](./05c-policy-closeout.md) | `@latch/policy` |

1. `PolicyService.resolve` — for a `scope`-rung role, set `manifest.rowScope = "scope"` and `manifest.scopeIds = union(actor's scopes for that role)`.
2. Store / DAL list + get — when `rowScope === "scope"`, filter `WHERE scope_id IN (manifest.scopeIds)`. `own` ignores scope (assignment join already crosses boundaries); `all` ignores it.
3. Bulk paths reuse the same per-row evaluation.
4. **Defer:** per-scope *differential field grants* (same role, different Fields per scope) — out of this task.

## Phase C — scoped delegation (assignment validation)

Extend `validateRoleAssignmentsPatch` ([`apps/spike_policy/lib/iam-user/validate-assignments.ts`](../../../../apps/spike_policy/lib/iam-user/validate-assignments.ts)) with three default-closed dials per `(role, scope)` being granted:

1. **Capability** — actor's role holds `read`/`write` on IAM Surface `user_roles_detail`.
2. **Which roles** — target role ∈ actor's `latch_role_delegations` allow-list; app roles only (never system classes).
3. **Where** — target `scope_id` ∈ actor's scopes for the delegator role (unscoped delegator → company-wide).

Existing guards unchanged: exclusivity, last-`system_iam`, self-patch denied. `system_iam` keeps unscoped, any-app-role authority.

## Verify (stop gate)

- [x] **Phase A:** `RowScope` includes `scope`; `Principal` carries scoped bindings; `latch_scopes`, `latch_user_roles.scope_id`, `latch_role_delegations` migrated; `getPrincipal` populates scopes
- [x] **Phase B:** `scope`-rung role → `manifest.scopeIds` set; DAL list/get/bulk filter `WHERE scope_id IN (...)`; `own`/`all` unaffected; `mergeRowScope` keeps most-permissive across scoped + unscoped bindings
- [x] **Phase C:** delegated assigner can grant allow-listed app role into its own scope; blocked on out-of-scope target, non-allow-listed role, and any system class; `system_iam` still unscoped/any-app-role (spike task 08, 2026-06-09)
- [x] System classes remain unscoped (`scope_id = NULL`) end-to-end
- [x] Tests: scoped list visibility (sales-manager-style), scoped delegation fence, system-class-unscoped regression

## Out of scope

- Per-scope differential field grants (deferred — [`scope.md`](../../../docs/foundations/scope.md)).
- Org-chart / region / manager-subtree templating; scope hierarchy traversal beyond one `parent_id`.
- ABAC / ReBAC / OPA-style DSL.

## Reference

- [`docs/discussions/09-role-delegation-and-scope.md`](../../../docs/discussions/09-role-delegation-and-scope.md) — canonical model
- [`docs/reference/access-control.md`](../access-control.md#row-level-rules) — row-scope rungs + seam table
- [`docs/foundations/scope.md`](../../../docs/foundations/scope.md) — in/out lines
- [`00-decisions-needed.md`](./00-decisions-needed.md) — P1 (row scope), P4a/P4b (assignment guards)
- [`.cursor/rules/10-invariants.mdc`](../../../../.cursor/rules/10-invariants.mdc) — invariants 1/2/4

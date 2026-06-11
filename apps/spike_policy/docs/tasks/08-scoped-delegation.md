# 08 — Scoped delegation proof

> **Status:** Complete (2026-06-09).

## Goal

Show, in the browser, that a **non-`system_iam` user can set up other users within their own scope** — and is blocked outside it. This is the spike's job: prove `@latch/policy` scoped delegation + scoped assignment end-to-end. It does **not** prove scoped row-filtering RLS (see Out of scope).

Concretely: act as a `branch_admin @ Branch B`, create/assign an allow-listed app role into **Branch B**, and watch the same actor be denied on Branch A, on non-allow-listed roles, and on any system class.

## Scope of this proof (and what it deliberately omits)

| Half of "scope" | Proven here? | Where |
|-----------------|--------------|-------|
| Scoped **assignment** (`latch_user_roles.scope_id`) + `manifest.scopeIds` in the inspector | **Yes** | this task |
| Scoped **delegation** (capability × `delegatable_roles` × scope fence) | **Yes** | this task |
| Scoped **row filtering** (`WHERE scope_id IN (…)`) | **No** | `@latch/dal` tests + `apps/crm` — spike is vocabulary-only, no business tables |

## Background / invariants

- System classes stay **unscoped / company-wide** (`scope_id = NULL`); scope qualifies **`app` roles only** ([decision §3](../../../../packages/docs/discussions/09-role-delegation-and-scope.md#decision-bounded-scope-primitive--scoped-delegation-2026-06-09)). `branch_admin` is an app role bound to the IAM Surface + scope — never a scoped `system_iam`.
- Delegation business rules live in **app code** (`validate-assignments.ts`), not `@latch/policy` ([discussion 03](../discussions/03-app-iam-ownership.md)). The engine supplies the scoped `Principal` + manifest; the app enforces the three dials.
- Every delegated assignment is audited and bumps `policyVersion`, exactly like a `system_iam` assignment.

## Deliverables

### Fixture / seed ([`migrations/901_fixture_vocabulary.sql`](../../migrations) sibling, or `lib/iam-user/seed.ts`)

- Two `latch_scopes` rows: `Branch A`, `Branch B` (`kind = 'branch'`).
- `branch_admin` app role: `read`/`write` grant on `user_roles_detail`; `latch_role_delegations` allow-list = `[field_tech, office_admin]`.
- Seed user **Maria** with `(maria, branch_admin, BranchB)`.
- An out-of-scope target/control (e.g. an existing Branch A user) for the negative cases.

### Validation ([`lib/iam-user/validate-assignments.ts`](../../lib/iam-user/validate-assignments.ts))

Extend `validateRoleAssignmentsPatch` with three default-closed checks per `(role, scope)`:

1. **Capability** — actor holds a role with `read`/`write` on `user_roles_detail` (already implied for `system_iam`; now also app delegators).
2. **Which roles** — non-`system_iam` actor: target role ∈ actor's `latch_role_delegations`; app roles only.
3. **Where** — target binding `scope_id` ∈ actor's `branch_admin` scopes (unscoped delegator → company-wide). `system_iam` keeps unscoped, any-app-role authority.

Keep existing guards intact: exclusivity, last-`system_iam`, self-patch denied.

### UI

- **Scope picker** on the assignment/create form: `SELECT id, display_name FROM latch_scopes`, **constrained to the actor's delegator scopes** (Maria sees only Branch B; `system_iam` sees all).
- Manifest inspector: add a **`scopeIds`** display for `scope`-rung roles (alongside `rowScope`).
- "Act as" Maria to drive the demo.

## Demo script (the visible proof)

1. Act as **Maria** (`branch_admin @ B`).
2. Create user **New Tech**, assign `field_tech` **@ Branch B** → success; inspector shows `field_tech` grants + `scopeIds = [B]`.
3. Try to assign `field_tech` **@ Branch A** → **Forbidden** (scope fence).
4. Try to assign a non-allow-listed app role, or `system_iam` → **Forbidden** (allow-list / app-roles-only).
5. Act as `system_iam` → same assignment to **any** scope succeeds (unscoped authority).

## Verify (stop gate)

- [x] Scoped binding persists (`latch_user_roles.scope_id`); inspector shows `scopeIds` for a `scope`-rung role
- [x] Maria assigns allow-listed app role **into her scope** → success, audited, `policyVersion` bumped
- [x] Maria blocked: out-of-scope target, non-allow-listed role, any system class (3 distinct `ForbiddenError`s)
- [x] Scope picker UI constrained to actor's delegator scopes (server-enforced, not UI-only)
- [x] `system_iam` actor retains unscoped, any-app-role assignment authority
- [x] System classes never carry a non-null `scope_id` (regression)
- [x] Unit tests in [`validate-assignments.test.ts`](../../lib/iam-user/validate-assignments.test.ts) mirror the demo's allow/deny matrix
- [x] [`README.md`](../../README.md) + [discussion 02](../discussions/02-privileged-assignment.md) status updated on completion

## Out of scope

- **Scoped row-filtering RLS** — `WHERE scope_id IN (…)`; needs business tables the spike doesn't have (`@latch/dal` + `apps/crm`).
- **Per-scope differential field grants** — deferred ([`scope.md`](../../../../packages/docs/foundations/scope.md)).
- Org-chart / region / manager-subtree templating.
- Native Postgres RLS (Phase 07).

## Related

- [`packages/policy` task 05 — scope + delegation](../../../../packages/policy/docs/tasks/05-scope-and-delegation.md) — platform implementation (seam + RLS + delegation)
- [Discussion 09 — role delegation & scope](../../../../packages/docs/discussions/09-role-delegation-and-scope.md) — canonical model
- [Discussion 02 — privileged assignment](../discussions/02-privileged-assignment.md) — P4a/P4b base this extends
- [07 — user create](./07-user-create.md) — prerequisite

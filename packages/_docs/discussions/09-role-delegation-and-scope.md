# Discussion 09 — Role delegation & scope

> **Status:** Decided (2026-06-09) — see [Decision](#decision-bounded-scope-primitive--scoped-delegation-2026-06-09) below. Split from [02 — identity & permissions](./02-identity-and-permissions.md) (point 4 of the user/roles re-evaluation). Relates to [`access-control.md` row scope](../../policy/docs/access-control.md#row-level-rules) and [policy P8](../../policy/docs/tasks/00-decisions-needed.md#p8--self-escalation-guard-for-the-role-editor).

## The question

Phase 03 locked **only `iam_master`** may change role assignments (threat **T8**). The re-evaluation added: *non-`iam_master` users should be able to assign roles to other users **within their scope*** — e.g. an `office_admin` enrolling a new `field_tech` for their own site without being a full IAM admin.

Two coupled sub-questions fall out, and both touch the same modelling decision:

1. **Delegated assignment** — which roles may a non-`iam_master` assigner hand out, and to whom?
2. **Row scope** ([`access-control.md`](../../policy/docs/access-control.md#row-level-rules)) — v1 ships only `own` / `all`. Richer scopes (team, manager subtree, site/region) were deferred.

Both ultimately ask: **does "scope" mean an organizational structure (sites, regions, reporting lines) that Latch templates — or does Latch stop at a simple primitive and leave org modelling to the app?**

## Shared understanding

- `system_iam` holders stay **unscoped** on IAM assignment paths; last-`system_iam` protected ([P4a/P4b](../../policy/docs/tasks/00-decisions-needed.md#p4a--built-in-role-storage--exclusivity-blocks-task-01-seeds--task-03assignment-dal)). System assignment authority is **per `role_class`** (hold `system_iam` to assign `system_iam`, etc.).
- Delegated assigners are **`app`-roles-only**: never `system_data` / `system_iam` catalog rows.
- Self-escalation stays denied (a delegator can't widen their own access).
- Every delegated assignment is audited and bumps `policyVersion`, exactly like an `iam_master` assignment.
- This is **assignment** delegation (who gets which role), distinct from **definition** editing (what a role may do) — the latter remains `iam_master`-only via the role editor ([policy task 03](../../policy/docs/tasks/03-role-editor-surface.md)).

## Decision: bounded scope primitive + scoped delegation (2026-06-09)

**Choice:** Latch adds a **bounded "scope" primitive** — a named boundary (branch / site / crew) the app instantiates — and uses it for three jobs: **row scoping (RLS), scoped role assignment, and scoped delegation**. This is *namespaced RBAC* (a role binding at a scope node), **not** ABAC/ReBAC — those remain out ([`scope.md`](../foundations/scope.md)). Resolves the line-drawing fork below toward **"primitive, not org-chart template"**: no sites/regions/manager-edge tables, just a generic scope registry the app populates.

This supersedes the **Option A "subset-of-self"** leaning: the model is **Option B + Option C-lite** (allow-list + scope fence). Service/construction SMBs with branches and prominent field work need scope as a **convenience + isolation** primitive on day one, not a post-v1 maybe.

### 1. Data model (the seam)

| Table | Change | Owner |
|-------|--------|-------|
| `latch_scopes` (new) | boundary registry: `id`, `kind`, `parent_id?`, `display_name`; app inserts instances | platform shape, app instances |
| `latch_user_roles` | add **nullable `scope_id`** FK → `latch_scopes.id`; `NULL` = company-wide | platform |
| `latch_role_surfaces.row_scope` | enum gains **`scope`** (already a string column — additive, no breaking DDL) | platform |
| `latch_role_delegations` (new) | `(role_id, assignable_role_id)` — the delegator's allow-list | platform |
| business rows (e.g. `jobs`) | app convention: a `scope_id` column tags each row to a boundary | app |

**Contracts seam (lock now, additive):** `Principal` carries scoped bindings (`{ roleId, scopeId | null }[]`) rather than a flat `RoleId[]`; `Manifest` gains optional `scopeIds`; `RowScope` gains `"scope"`.

### 2. Rung-per-role (RLS)

`row_scope` is set per `(role, surface)` on `latch_role_surfaces`:

| `row_scope` | Rows seen | binding `scope_id` |
|-------------|-----------|--------------------|
| `own` | rows linked to the principal (assignment join) | **ignored** for visibility |
| `scope` | rows whose `scope_id` ∈ the principal's scopes for that role | **required** |
| `all` | all rows on the surface | ignored |

`own ⊂ scope ⊂ all`; `mergeRowScope` keeps the most permissive. **Field/action grants stay role-level** — scope narrows *rows* only. Per-scope *differential field grants* (e.g. read financials in branch B but not A) are **deferred** (the ReBAC-adjacent cost). Supported case: a user holding the same field-grant-bearing role across scopes (e.g. `field_tech @ A` + `@ B`).

> `own` roles (e.g. `field_tech`) do **not** need scope bindings — the assignment join already crosses branch boundaries. Scope bindings matter for `scope`-rung roles (e.g. `sales_manager`) and for delegators.

### 3. System classes stay unscoped

`system_iam` / `system_data` are **always company-wide** (`scope_id = NULL`); scope qualifies **`app` roles only**. "Branch admin" is an app role bound to an IAM Surface + scope — **never** a scoped system class. Preserves separation-of-duties, bootstrap, and last-`system_iam` guarantees.

### 4. Delegation = three independent dials (all default closed)

| Dial | Question | Mechanism |
|------|----------|-----------|
| **Capability** | may touch assignments at all? | role holds `read`/`write` on IAM Surface `user_roles_detail` |
| **Which roles** | what may it hand out? | `latch_role_delegations` allow-list (app roles only; never system classes) |
| **Where** | into which boundary? | scope fence: target `scope_id` ∈ actor's scopes for that delegator role (unscoped delegator → company-wide) |

`validateRoleAssignmentsPatch` ([`apps/spike_policy/lib/iam-user/validate-assignments.ts`](../../../apps/spike_policy/lib/iam-user/validate-assignments.ts)) gains the allow-list + scope-fence checks alongside the existing exclusivity, last-`system_iam`, and self-patch guards. `system_iam` keeps unscoped, any-app-role authority.

**Rationale:** A bounded named-scope dimension delivers branch RLS and local delegation with **additive** schema, while keeping field/action grants role-level holds it short of ReBAC. Locking the seam (nullable `scope_id`, `Principal` bindings, `row_scope` as a string) now avoids a contract migration later; **full RLS + delegation implementation is a dedicated phase**, not necessarily inside the current v1 slice.

**Seam edits flagged:** [`../reference/access-control.md`](../../policy/docs/access-control.md#row-level-rules) (row-scope `scope` + delegation), [`../foundations/scope.md`](../foundations/scope.md) (in/out lines). Implementation plan: [`../../packages/policy/docs/tasks/05-scope-and-delegation.md`](../../policy/docs/tasks/05-scope-and-delegation.md).

---

## Options for "scope"

| # | Model | "Which roles" | "To whom" | Schema cost |
|---|-------|---------------|-----------|-------------|
| **A** | **Subset-of-self** | only roles the assigner already holds (minus built-ins) | any user | none |
| **B** | Delegatable allow-list | catalog says which roles a role may hand out | any user | a list on the role |
| **C** | Target row-scope | (A or B) | only users the assigner can "see" per `row_scope` | reuses `own`/`all` |
| **D** | Org structure (site/region/manager) | (B) | users in same site / region / subtree | **org-chart tables** on `latch_users` |

## Leaning (superseded 2026-06-09)

> Resolved by the [Decision](#decision-bounded-scope-primitive--scoped-delegation-2026-06-09) above. The original "Option A subset-of-self" leaning was rejected as too weak (it can't let `branch_admin` hand out `field_tech` without holding it). The locked model is **Option B (allow-list) + Option C-lite (scope fence)** on a bounded scope primitive. Kept below for history.

- ~~**v1: Option A — subset-of-self**, no new schema.~~ Too weak for the branch-delegation case.
- Everything richer (B/C/D) was gated on the line-drawing decision — now resolved toward **primitive, not org-chart**.

## The line-drawing decision (the real fork)

One of Latch's purposes is to **template the roles/IAM tables** so every business app gets the same identity spine. The question is **how far that template reaches**:

- **Draw the line at a primitive (recommended default).** Latch templates `latch_users`, `latch_user_roles`, `latch_roles`, grants, and a **simple** scope primitive (`own`/`all`, plus maybe one optional grouping column). Org charts, regions, reporting hierarchies, and matrixed access are **the app's job** — apps that need them model their own tables and Surfaces and use Latch's Field/row primitives. **Trade-off:** companies needing hierarchy-aware delegation/RLS build it themselves (or don't use the Latch template for that slice).
- **Extend the template into org structure.** Latch ships an optional org-chart template (sites/regions/manager edges) that both delegation and row scope can key off. **Trade-off:** large scope increase, pushes toward ABAC/ReBAC (explicitly out of v1 [`scope.md`](../foundations/scope.md)), and bakes one org model into every app.

> **Bias:** keep v1 simple — primitive scope (Option A + `own`/`all`), org structure **out of the template**. Revisit org-chart templating as a post-v1 discussion only if multiple pilot apps independently need it.

## Open questions (resolved 2026-06-09)

- ~~Does the pilot `office_admin` need to assign `field_tech` **without** holding it?~~ **Yes** → `latch_role_delegations` allow-list (Option B), not subset-of-self.
- ~~Is "to whom" needed in v1?~~ **Yes, as a scope fence** (Option C-lite) for scoped delegators; unscoped delegators are company-wide.
- ~~Should delegation reuse the same scope mechanism as row scope?~~ **Yes** — one `scope_id` primitive serves both row filtering and the delegation fence (no second scope language).
- ~~Where does the line sit for the template?~~ **Primitive-only** (`latch_scopes` + `scope_id`); org-chart / region / manager-subtree templating stays out.

**Still deferred:** per-scope differential field grants; scope hierarchy traversal beyond one `parent_id`; ABAC/ReBAC.

## Related

- [`02-identity-and-permissions.md`](./02-identity-and-permissions.md) — parent contract (built-ins, assignments)
- [`../reference/access-control.md`](../../policy/docs/access-control.md) — row scope v1 + deferred patterns
- [`../foundations/scope.md`](../foundations/scope.md) — ABAC/ReBAC out of v1
- [`../../packages/policy/docs/tasks/00-decisions-needed.md`](../../policy/docs/tasks/00-decisions-needed.md) — P4a (built-in assignment guard), P8 (self-escalation)
- [`07-template-scaffold.md`](./07-template-scaffold.md) — what the platform template ships

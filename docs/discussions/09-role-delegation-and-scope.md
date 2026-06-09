# Discussion 09 — Role delegation & scope

> **Status:** Open (2026-06-06). Split from [02 — identity & permissions](./02-identity-and-permissions.md) (point 4 of the user/roles re-evaluation). Relates to [`access-control.md` row scope](../reference/access-control.md#row-level-rules) and [policy P8](../../packages/policy/docs/tasks/00-decisions-needed.md#p8--self-escalation-guard-for-the-role-editor).

## The question

Phase 03 locked **only `iam_master`** may change role assignments (threat **T8**). The re-evaluation added: *non-`iam_master` users should be able to assign roles to other users **within their scope*** — e.g. an `office_admin` enrolling a new `field_tech` for their own site without being a full IAM admin.

Two coupled sub-questions fall out, and both touch the same modelling decision:

1. **Delegated assignment** — which roles may a non-`iam_master` assigner hand out, and to whom?
2. **Row scope** ([`access-control.md`](../reference/access-control.md#row-level-rules)) — v1 ships only `own` / `all`. Richer scopes (team, manager subtree, site/region) were deferred.

Both ultimately ask: **does "scope" mean an organizational structure (sites, regions, reporting lines) that Latch templates — or does Latch stop at a simple primitive and leave org modelling to the app?**

## Shared understanding

- `system_iam` holders stay **unscoped** on IAM assignment paths; last-`system_iam` protected ([P4a/P4b](../../packages/policy/docs/tasks/00-decisions-needed.md#p4a--built-in-role-storage--exclusivity-blocks-task-01-seeds--task-03assignment-dal)). System assignment authority is **per `role_class`** (hold `system_iam` to assign `system_iam`, etc.).
- Delegated assigners are **`app`-roles-only**: never `system_data` / `system_iam` catalog rows.
- Self-escalation stays denied (a delegator can't widen their own access).
- Every delegated assignment is audited and bumps `policyVersion`, exactly like an `iam_master` assignment.
- This is **assignment** delegation (who gets which role), distinct from **definition** editing (what a role may do) — the latter remains `iam_master`-only via the role editor ([policy task 03](../../packages/policy/docs/tasks/03-role-editor-surface.md)).

## Options for "scope"

| # | Model | "Which roles" | "To whom" | Schema cost |
|---|-------|---------------|-----------|-------------|
| **A** | **Subset-of-self** | only roles the assigner already holds (minus built-ins) | any user | none |
| **B** | Delegatable allow-list | catalog says which roles a role may hand out | any user | a list on the role |
| **C** | Target row-scope | (A or B) | only users the assigner can "see" per `row_scope` | reuses `own`/`all` |
| **D** | Org structure (site/region/manager) | (B) | users in same site / region / subtree | **org-chart tables** on `latch_users` |

## Leaning (to confirm)

- **v1: Option A — subset-of-self**, no new schema. A delegator may assign only app roles they themselves hold; built-ins excluded; self-escalation denied. This satisfies the `office_admin` → `field_tech` pilot case *if* the `office_admin` also holds `field_tech` (or we relax to "any app role" for that grant). Cheapest path that unblocks delegation without committing to org modelling.
- Everything richer (B/C/D) waits on the line-drawing decision below.

## The line-drawing decision (the real fork)

One of Latch's purposes is to **template the roles/IAM tables** so every business app gets the same identity spine. The question is **how far that template reaches**:

- **Draw the line at a primitive (recommended default).** Latch templates `latch_users`, `latch_user_roles`, `latch_roles`, grants, and a **simple** scope primitive (`own`/`all`, plus maybe one optional grouping column). Org charts, regions, reporting hierarchies, and matrixed access are **the app's job** — apps that need them model their own tables and Surfaces and use Latch's Field/row primitives. **Trade-off:** companies needing hierarchy-aware delegation/RLS build it themselves (or don't use the Latch template for that slice).
- **Extend the template into org structure.** Latch ships an optional org-chart template (sites/regions/manager edges) that both delegation and row scope can key off. **Trade-off:** large scope increase, pushes toward ABAC/ReBAC (explicitly out of v1 [`scope.md`](../foundations/scope.md)), and bakes one org model into every app.

> **Bias:** keep v1 simple — primitive scope (Option A + `own`/`all`), org structure **out of the template**. Revisit org-chart templating as a post-v1 discussion only if multiple pilot apps independently need it.

## Open questions

- Does the pilot `office_admin` need to assign `field_tech` **without** holding it? If yes, Option A alone is insufficient → minimal Option B (a per-role `delegatable_roles` list) instead.
- Is "to whom" needed in v1 at all, or is "which roles" enough (assign app roles to *any* user, gated by holding/allow-list)?
- If/when row scope grows past `own`/`all`, should delegation reuse the **same** scope mechanism (Option C) to avoid two scope languages?
- Where does the line sit for the **template**: primitive-only vs optional org-chart module?

## Related

- [`02-identity-and-permissions.md`](./02-identity-and-permissions.md) — parent contract (built-ins, assignments)
- [`../reference/access-control.md`](../reference/access-control.md) — row scope v1 + deferred patterns
- [`../foundations/scope.md`](../foundations/scope.md) — ABAC/ReBAC out of v1
- [`../../packages/policy/docs/tasks/00-decisions-needed.md`](../../packages/policy/docs/tasks/00-decisions-needed.md) — P4a (built-in assignment guard), P8 (self-escalation)
- [`07-template-scaffold.md`](./07-template-scaffold.md) — what the platform template ships

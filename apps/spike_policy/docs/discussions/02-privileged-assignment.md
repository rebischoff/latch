# Discussion 02 — Privileged assignment (`system_iam` vs `system_data`)

> **Status:** Partially resolved in spike (2026-06-09). P4a/P4b + **scoped delegation** proven in [`task 08`](../tasks/08-scoped-delegation.md). IAM-only vs data-only separation still needs an explicit PG integration test.

## Question

We need to show that a principal with **`system_iam`** (control plane / “IAM master”) can grant **`system_iam`** to others, but **cannot** grant **`system_data`** (“data master”) unless they also hold **`system_data`**.

## Terminology

| Doc / informal | Code / DB (`role_class`) | Synthesis |
|----------------|--------------------------|-----------|
| IAM master | `system_iam` | Wildcard on Surfaces with `kind: "iam"` |
| Data master | `system_data` | Wildcard on Surfaces with `kind: "business"` |

Grants for both system classes are **synthesized in `PolicyService`** — no rows in `latch_role_grants` ([P4](../../../../packages/policy/docs/tasks/00-decisions-needed.md#p4--iam_master-grants-synthesized-in-code-or-db-seeded-rows-doc-tension--resolve-first)).

## Locked rules (P4a / P4b)

Implemented in [`lib/iam-user/validate-assignments.ts`](../../lib/iam-user/validate-assignments.ts):

### Privileged assignment

An actor may assign or revoke a **system** catalog row only if they hold the **same** `role_class`:

- Hold `system_iam` → may assign/revoke `system_iam`
- Hold `system_data` → may assign/revoke `system_data`
- Hold **both** → may assign **both**
- App roles — any `system_iam` actor may assign. **Scoped delegated assigners** (non-`system_iam` app roles handing out an allow-listed set, fenced to their scope) are **decided** ([discussion 09](../../../../packages/docs/discussions/09-role-delegation-and-scope.md#decision-bounded-scope-primitive--scoped-delegation-2026-06-09), 2026-06-09) and **proven in the spike** ([task 08](../tasks/08-scoped-delegation.md)); platform RLS half = [`packages/policy` task 05](../../../../packages/policy/docs/tasks/05-scope-and-delegation.md) Phase B.

### Exclusivity

- `system_data` **cannot** combine with **app** roles on one user
- `system_iam` **may** combine with app roles (when `system_data` is absent)
- `system_data` **may** combine with `system_iam` on one user (bootstrap super-admin)

### Other guards

- Cannot revoke the **last** `system_iam` holder (P4b)
- Actor cannot patch **own** assignments (self-patch denied)

## Who can assign what (summary)

| Actor holds | Assign `system_iam` | Assign `system_data` | Assign `app` roles |
|-------------|---------------------|----------------------|-------------------|
| `system_iam` only | Yes | **No** (`ForbiddenError`) | Yes |
| `system_data` only | **No** | Yes | **No** (exclusivity) |
| Both | Yes | Yes | **No** (exclusivity) |
| App only (no delegator grants) | **No** | **No** | **No** |
| Scoped delegator (`branch_admin @ scope`) | **No** | **No** | Allow-listed app roles **into own scope only** |

Scoped delegators: see [task 08](../tasks/08-scoped-delegation.md) — `validate-assignments.test.ts` + Maria fixture.

## What is already tested

| Layer | Coverage |
|-------|----------|
| Unit | `validate-assignments.test.ts` — exclusivity, last-admin, `system_iam` app assignment, scoped delegation allow/deny matrix (Maria fixture) |
| DAL / threat | `threat-t8.test.ts` — escalation blocked; `system_iam` positive patch |
| Policy engine | `policy-service.test.ts` — `system_iam` synthesis; no business-surface access |

**Gap:** No explicit test “`system_iam`-only actor assigns `system_iam` to another user” and “same actor blocked on `system_data`” in one PG integration test.

## Why the spike UI does not prove this end-to-end yet

1. **Bootstrap admin holds both** system classes — assigning `system_data` to someone looks allowed (correct for that actor).
2. **No user create** — hard to add a clean second IAM admin or an `system_iam`-only principal.
3. **Self-patch denied** — bootstrap cannot edit own roles to experiment on self.

**Partial demo today:** Act as `bootstrap-admin` → open **Field Tech** → add `system_iam` to their roles (keep `field_tech` app role). Shows super-admin granting IAM; does **not** isolate IAM-only vs data.

## Steps to prove in the spike

| Step | Action | Expected |
|------|--------|----------|
| 1 | [User create](./01-user-console.md) or SQL insert second user | Target for assignment |
| 2 | SQL or UI: one user with **only** `system_iam` (no `system_data`, no app roles) | IAM-only actor |
| 3 | Act as that user → assign `system_iam` to the new user | Success |
| 4 | Same actor → try to assign `system_data` to anyone | `ForbiddenError` / 403 |
| 5 | Act as `system_data`-only user (if seeded) → inverse: can assign `system_data`, not `system_iam` | Separation of duties |
| 6 | Add PG integration test mirroring steps 3–4 | CI stop gate |

Optional: manifest inspector on the new IAM user — `role_detail` and `user_roles_detail` should show full IAM vocabulary via synthesis.

## Related

- [01 — User console](./01-user-console.md)
- [03 — IAM ownership](./03-app-iam-ownership.md)
- P4a / P4b: [`packages/policy/docs/tasks/00-decisions-needed.md`](../../../../packages/policy/docs/tasks/00-decisions-needed.md)

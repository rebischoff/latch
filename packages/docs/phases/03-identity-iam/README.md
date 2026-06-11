# Phase 03 — Identity & IAM (`@latch/policy` + `apps/crm` IAM module)

> **Home packages:** `@latch/policy` (+ `apps/crm` IAM module; `@latch/iam` deferred) · **Status:** decisions locked (task **00**); implementation at task **04** · **Phase STATUS:** [`STATUS.md`](./STATUS.md) · **Tasks:** [`tasks/01-task-index.md`](./tasks/01-task-index.md)

## Goal

Replace the stub principal with **real identity**, store **user ↔ role** assignments in the database, and ship the two mandatory built-in roles: **IAM master** and **Data master**. Effective permissions are resolved from DB-backed roles via the existing `PolicyService` (multi-role `union_grants` in production, not just an env var).

## Depends on

- **Phase 00** — `PolicyService` + manifest.

## In / out of scope

| In scope | Out of scope (this phase) |
|----------|---------------------------|
| `latch_user_roles` (user ↔ role, many-to-many) | ABAC / ReBAC / policy DSL |
| Built-in role seeds incl. **`iam_master`** + **`data_master`** | Break-glass enhanced audit (design only) |
| IAM admin Surface (`user_roles_detail`) + HTTP API for role assignment | CRM IAM admin UI; external IdP-group sync (sketch only) |
| DB-backed `Principal` (roles loaded from DB) | Additional role-merge modes (Phase 06) |
| Real auth provider (resolve **D2**) | Multi-company identity (Phase 07) |

## Sub-goals — what this phase proves

1. A user assigned to ≥1 role gets the union of grants from the DB (T8: cannot self-assign roles).
2. **IAM master** can manage all users/roles/IAM Surfaces (and audit visibility, per config).
3. **Data master** can access **all** business Surfaces/Fields — **including Surfaces added later** without editing its policy. (Mechanism decided in [`decisions.md`](./decisions.md): wildcard grant vs codegen auto-grant.)
4. Role assignment is its own permission-gated Surface; default deny for non-admins.

## Definition of done

- [x] `latch_user_roles` migration + seeds for `iam_master`, `data_master`, and pilot app roles
- [x] `getPrincipal` resolves roles from DB (stub remains a local-dev fallback)
- [x] Auth provider chosen and wired (D2)
- [x] IAM admin Surface: assign/revoke roles, audited
- [x] Test: new Surface is automatically accessible to `data_master`

## Task chain

Execute in order — see [`tasks/01-task-index.md`](./tasks/01-task-index.md):

`00-decisions` → `04-db-schema` → `05-principal-db-roles` → `06`–`08` (Surface + policy + codegen) → `09`–`13` (DAL + API) → `14`–`15` (Auth.js + CRM login) → `20`–`21` (e2e + T8 + phase DoD).

## References

- [`../../reference/access-control.md`](../../reference/access-control.md) (RBAC, built-in roles)
- [`../../foundations/open-questions.md`](../../foundations/open-questions.md) (D2; identity storage)
- [`../../foundations/threat-model.md`](../../foundations/threat-model.md) (T8 privilege escalation)

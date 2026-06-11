# 03 — Role-editor IAM Surface

> **Status:** Complete (2026-06-08). Next: [04 — P10 test harness](./04-p10-test-harness.md). Part of the [runtime roles plan](./README.md).

## Goal

Let app users **create / update / delete roles and their grants** at runtime through a permission-gated, audited IAM Surface — the sibling of `user_roles_detail` (which manages *assignments*). This Surface manages *definitions*: rows in `latch_roles` + `latch_role_grants` ([01](./01-role-tables.md) / [01b](./01b-p11-catalog-realignment.md)), validated against the codegen-emitted Field/action **vocabulary** at write time (decision 4). The read path must already load DB grants via [02b](./02b-db-role-grant-provider.md).

## Background

- Phase 03 shipped `user_roles_detail` (assign/revoke roles to users, `system_iam`-only, self-patch denied, audited). This task adds a parallel Surface for the role catalog + grants.
- All mutations go through the **DAL** with a `PermissionContext` (invariant 2); writes are audited (invariant 6); the manifest is the only authority (invariant 1).
- The "can't grant an undefined Field/action" guarantee that codegen `--check` used to give moves here: the editor reads the codegen vocabulary catalog and **rejects** grants outside it (decision 4).

## Shape (proposed — fine-tune in task)

- **Surface id(s):** e.g. `role_detail` (catalog row: id, display name) and/or `role_grants_detail` (grant matrix for a role). `kind: iam` → excluded from `data_master` wildcard.
- **Gating:** `system_iam` only (like `user_roles_detail`); default deny for app/business roles.
- **Guards:**
  - System catalog rows (`role_class` `system_data` / `system_iam`) are **not** editable/deletable ([P11](./00-decisions-needed.md#p11--role-catalog-shape-uuid--role_class-2026-06-08)).
  - **Delete role:** blocked by DB **`ON DELETE RESTRICT`** on `latch_user_roles` while any user holds the role; DAL surfaces a clear error — revoke via `user_roles_detail` first ([P2](./00-decisions-needed.md#p2--fk-latch_user_rolesrole_id--latch_rolesid)).
  - **Sparse grants:** creating a role does not auto-populate all surfaces/fields; default deny until grants are added ([P2a](./00-decisions-needed.md#p2a--sparse-grants-default-deny)).
  - Self-escalation guard: a `system_iam` holder editing grants that would widen their own effective permissions — decide (mirror `user_roles_detail` self-patch denial, or allow with extra audit). **Open — [P8](./00-decisions-needed.md#p8--self-escalation-guard-for-the-role-editor).**
  - Every grant write validates `(surface_id, field_id, action)` against the codegen vocabulary catalog; unknowns → 4xx (reject, not strip — invariant 3).
- **Audit:** create/update/delete of roles and grants produce `latch_audit` rows (before/after).
- **Cache:** bump `latch_policy_version` on any grant change so manifests re-resolve (Phase 06 invalidation).

## Files (target — pattern mirrors `apps/*/src/lib/iam/*`; spike/template)

| Concern | File(s) |
|---------|---------|
| Surface metadata (vocabulary) | `modules/iam/role_detail.surface.yaml` + `.policies.yaml` (+ generated) |
| DAL glue | repository / project / apply-patch / descriptors / schemas for the role + grants tables |
| API | `/api/iam/roles*` handlers (REST) + server action helper |
| Validation | write-time check against the codegen vocabulary catalog |
| Audit + policy-version | reuse existing audit writer + `policyVersion` bump |

## Steps (outline)

1. Define the Surface(s) + vocabulary YAML; gate to `system_iam` ([P9](./00-decisions-needed.md#p9--role-editor-one-surface-or-split-catalog-vs-grant-matrix) — one Surface proposed).
2. DAL CRUD over `latch_roles` / `latch_role_grants` with `PermissionContext`.
3. Write-time validation against the codegen catalog (reject unknown surface/field/action; reject grants on `kind: iam` surfaces unless intended).
4. Protect built-ins; decide + implement the self-escalation guard.
5. Audit every mutation; bump `latch_policy_version`.
6. Tests: create role → assign via `user_roles_detail` → `resolve` reflects new grants ([02b](./02b-db-role-grant-provider.md) read path); threat tests (T8-style: non-`system_iam` cannot edit roles; unknown-field grant rejected; built-in not deletable).

## Verify (stop gate)

- [x] Roles + grants CRUD through the DAL with `PermissionContext`; `system_iam`-gated
- [x] Grant writes validated against the codegen vocabulary catalog (unknown → rejected, not stripped)
- [x] Built-in roles protected; self-escalation guard decided + enforced (P8: deny self grant/binding edits)
- [x] Every mutation audited; `latch_policy_version` bumped → manifests re-resolve
- [x] End-to-end: create role → assign to user → `PolicyService.resolve` reflects it
- [x] Threat tests: non-admin denied; unknown-field grant rejected; built-in delete denied

## Reference

- [`docs/phases/03-identity-iam/decisions.md`](../../../docs/phases/03-identity-iam/decisions.md) — `user_roles_detail` pattern, self-patch denial, T8
- [`docs/foundations/threat-model.md`](../../../docs/foundations/threat-model.md) — T8 (privilege escalation), T1 (mass assignment)
- [`01-role-tables.md`](./01-role-tables.md) · [`01b-p11-catalog-realignment.md`](./01b-p11-catalog-realignment.md) (tables)
- [`02-role-grant-provider.md`](./02-role-grant-provider.md) · [`02b-db-role-grant-provider.md`](./02b-db-role-grant-provider.md) (read path)
- [`.cursor/rules/10-invariants.mdc`](../../../../.cursor/rules/10-invariants.mdc) — invariants 1/2/3/5/6

# 01 — Role tables + built-in seeds

> **Status:** Stub (2026-06-06) — not started. Part of the [runtime roles plan](./README.md).

## Goal

Add the platform tables that make role definitions runtime data: `latch_roles` (catalog), `latch_role_surfaces` (per role × surface binding, including `row_scope`), and `latch_role_grants` (per role × surface × field × action grants). Seed the two built-ins so a fresh DB resolves permissions before any app user touches the role editor.

## Background

- Phase 03 deliberately shipped **no** `roles` table (assignments only, in `latch_user_roles`). This task reverses that under the "[roles are runtime data](../../../../docs/discussions/02-identity-and-permissions.md)" decision.
- Drizzle owns DDL (codegen never generates migrations — [`codegen-scope.md`](../../../../docs/reference/codegen-scope.md)). These are hand-written migrations + Drizzle schema, like `latch_user_roles`.
- Platform tables → eventually templatized (compartment 6).
- **`row_scope` per `(role, surface)`** is locked ([P1](./00-decisions-needed.md#p1--row_scope-granularity-per-grant-row-or-per-role-surface) Decision, 2026-06-06) — lives on `latch_role_surfaces`, not on grant rows.

## Shape (locked — P1 resolved)

| Table | Columns (sketch) | Notes |
|-------|------------------|-------|
| `latch_roles` | `id` (string PK, matches policy role key), `display_name`, `kind` (`app` \| `builtin`), `is_builtin` bool, `created_at` | `data_master` / `iam_master` seeded with `is_builtin = true` (not app-deletable) |
| `latch_role_surfaces` | `role_id` FK → `latch_roles.id`, `surface_id`, `row_scope` (`own` \| `all`, nullable), `created_at` | one row per role × surface; authoritative `row_scope` for the binding (role-editor control maps 1:1 here) |
| `latch_role_grants` | `role_id` FK → `latch_roles.id` **`ON DELETE CASCADE`**, `surface_id`, `field_id` (nullable = surface-level action), `action`, optional `mode` | sparse allow-rows only (default deny); **no `row_scope`**; PK/unique on the tuple |

- `latch_role_surfaces.role_id` → `latch_roles.id` **`ON DELETE CASCADE`** ([P1](./00-decisions-needed.md#p1--row_scope-granularity-per-grant-row-or-per-role-surface)).
- `latch_user_roles.role_id` → `latch_roles.id` **`ON DELETE RESTRICT`** ([P2](./00-decisions-needed.md#p2--fk-latch_user_rolesrole_id--latch_rolesid)) — revoke all assignments before deleting an app role.
- **Seed order:** `latch_roles` (built-ins + pilot per [P3](./00-decisions-needed.md#p3--seed-pilot-app-roles-or-start-the-catalog-empty)) before `latch_user_roles` assignment seeds.
- `data_master` / `iam_master`: catalog rows only (`is_builtin = true`); grants for **both** **not** stored as rows — synthesized in `PolicyService` ([P4](./00-decisions-needed.md#decision-synthesize-both-built-ins-in-code-2026-06-06)).
- Built-in **assignments** are ordinary `latch_user_roles` rows (no built-in columns on `latch_users`); "built-in" is the `is_builtin` catalog flag ([P4a](./00-decisions-needed.md#p4a--built-in-role-storage--exclusivity-blocks-task-01-seeds--task-03assignment-dal)).
- New roles need **no** grant rows until configured ([P2a](./00-decisions-needed.md#p2a--sparse-grants-default-deny)).
- `DbRoleGrantProvider` (task 02) joins `latch_role_surfaces` for `row_scope` when folding grant rows into `RoleGrant` per role×surface.

## Files (target — no `apps/crm` today; spike/template)

| File | Action |
|------|--------|
| migration `0NN_latch_roles.sql` (or Drizzle) | **Create** — `latch_roles` + `latch_role_surfaces` + `latch_role_grants` DDL |
| Drizzle schema | **Edit** — table definitions |
| seed | **Edit** — seed `data_master`, `iam_master` catalog rows (built-in); pilot app roles + grants per [P3](./00-decisions-needed.md#p3--seed-pilot-app-roles-or-start-the-catalog-empty); **one initial super-admin** user assigned `data_master` + `iam_master` per [P4b](./00-decisions-needed.md#p4b--first-admin-bootstrap--last-admin-protection-blocks-task-01-seeds) |
| `latch_app` role grants (T5) | **Edit** — ensure the app DB role can `SELECT` grants/bindings and the role-editor path can write them under `SET LOCAL` |

## Steps (outline)

1. Write DDL + Drizzle schema for all three tables; enforce grant tuple uniqueness and `(role_id, surface_id)` uniqueness on `latch_role_surfaces`.
2. Seed built-in catalog rows (`is_builtin = true`); confirm they can't be deleted via the editor (task 03 enforces).
3. Seed pilot app roles + `latch_role_surfaces` / `latch_role_grants` per P3 (reproducible spike/harness without task 03).
4. Seed **one initial super-admin** user with both built-ins assigned in `latch_user_roles` (P4b bootstrap); document the `LATCH_BOOTSTRAP_ADMIN_EMAIL` break-glass alongside.
5. Confirm `latch_app` (T5) can read grants and bindings; writes go through the audited IAM path only.

## Verify (stop gate)

- [ ] Migration creates `latch_roles`, `latch_role_surfaces`, and `latch_role_grants`; built-ins seeded
- [ ] `row_scope` lives only on `latch_role_surfaces`; grant rows have no `row_scope` column
- [ ] Grant tuple uniqueness enforced at the DB level; `(role_id, surface_id)` unique on bindings
- [ ] FK semantics: `latch_user_roles.role_id` RESTRICT; `latch_role_grants` / `latch_role_surfaces` CASCADE on role delete
- [ ] `data_master` / `iam_master` rows are flagged built-in and protected
- [ ] Both built-ins synthesized in `PolicyService` (no `latch_role_grants` rows for either) — P4
- [ ] One initial super-admin user seeded with `data_master` + `iam_master` assignments — P4b
- [ ] Pilot app roles (`field_tech`, `office_admin`) seeded with sparse grants per P3
- [ ] App DB role can read grants and bindings; cannot mutate audit/role tables outside the sanctioned path
- [ ] Migration runs clean on a fresh DB

## Reference

- [`00-decisions-needed.md`](./00-decisions-needed.md) — P1 (`row_scope`), P2 (FK), P3 (pilot seeds), P4 (synthesize both built-ins), P4a (storage + exclusivity), P4b (bootstrap)
- [`docs/phases/03-identity-iam/decisions.md`](../../../../docs/phases/03-identity-iam/decisions.md) — identity storage (superseded in part)
- [`docs/reference/compartments.md`](../../../../docs/reference/compartments.md) — platform tables
- [`02-role-grant-provider.md`](./02-role-grant-provider.md) — the consumer of these tables

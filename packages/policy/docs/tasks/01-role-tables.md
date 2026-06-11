# 01 — Role tables + built-in seeds

> **Status:** Complete (2026-06-08) for P1–P4b stop gate on the **pre-P11 prototype** (text PK, slug seeds). Canonical catalog shape ([P11](./00-decisions-needed.md#p11--role-catalog-shape-uuid--role_class-2026-06-08)) is **[01b](./01b-p11-catalog-realignment.md)**. Next: [01b](./01b-p11-catalog-realignment.md).

## Goal

Add the platform tables that make role definitions runtime data: `latch_roles` (catalog), `latch_role_surfaces` (per role × surface binding, including `row_scope`), and `latch_role_grants` (per role × surface × field × action grants). Seed **only** the two system rows (`system_data`, `system_iam`; [P11](./00-decisions-needed.md#p11--role-catalog-shape-uuid--role_class-2026-06-08)) so a fresh provisioned DB resolves permissions before any app user touches the role editor. The `app` catalog otherwise starts **empty** ([P3](./00-decisions-needed.md#p3--seed-pilot-app-roles-or-start-the-catalog-empty)).

## Background

- Phase 03 deliberately shipped **no** `roles` table (assignments only, in `latch_user_roles`). This task reverses that under the "[roles are runtime data](../../../docs/discussions/02-identity-and-permissions.md)" decision.
- Drizzle owns DDL (codegen never generates migrations — [`codegen-scope.md`](../../../codegen/docs/reference/codegen-scope.md)). These are hand-written migrations + Drizzle schema, like `latch_user_roles`.
- Platform tables → eventually templatized (compartment 6).
- **`row_scope` per `(role, surface)`** is locked ([P1](./00-decisions-needed.md#p1--row_scope-granularity-per-grant-row-or-per-role-surface) Decision, 2026-06-06) — lives on `latch_role_surfaces`, not on grant rows.
- **Pilot personas** (`field_tech`, `office_admin`, …) are **not** template seeds. Optional fixture seeds for tests live in [`apps/spike_policy`](../../../../apps/spike_policy) only (vocabulary from [`apps/spike_codegen`](../../../../apps/spike_codegen)).

## Shape (locked — P1 resolved)

| Table | Columns (sketch) | Notes |
|-------|------------------|-------|
| `latch_roles` | `id` `UUID` PK, `role_class` (`system_data` \| `system_iam` \| `app`), `display_name` | Template seeds one `system_data` + one `system_iam` row (fixed UUIDs); no `slug`, no row `created_at` ([P11](./00-decisions-needed.md#p11--role-catalog-shape-uuid--role_class-2026-06-08); timestamps via `latch_audit`) |
| `latch_role_surfaces` | `role_id` FK → `latch_roles.id`, `surface_id`, `row_scope` (`own` \| `all`, nullable) | one row per role × surface; authoritative `row_scope` for the binding (role-editor control maps 1:1 here) |
| `latch_role_grants` | `role_id` FK → `latch_roles.id` **`ON DELETE CASCADE`**, `surface_id`, `field_id` (nullable = surface-level action), `action`, optional `mode` | sparse allow-rows only (default deny); **no `row_scope`**; PK/unique on the tuple |

- `latch_role_surfaces.role_id` → `latch_roles.id` **`ON DELETE CASCADE`** ([P1](./00-decisions-needed.md#p1--row_scope-granularity-per-grant-row-or-per-role-surface)).
- `latch_user_roles.role_id` → `latch_roles.id` **`ON DELETE RESTRICT`** ([P2](./00-decisions-needed.md#p2--fk-latch_user_rolesrole_id--latch_rolesid)) — revoke all assignments before deleting an app role.
- **Seed order:** `latch_roles` (built-ins only per [P3](./00-decisions-needed.md#p3--seed-pilot-app-roles-or-start-the-catalog-empty)) before `latch_user_roles` assignment seeds.
- System catalog rows (`system_data`, `system_iam`): grants **not** stored as rows — synthesized in `PolicyService` from `role_class` ([P4](./00-decisions-needed.md#decision-synthesize-both-built-ins-in-code-2026-06-06), [P11](./00-decisions-needed.md#p11--role-catalog-shape-uuid--role_class-2026-06-08)).
- System **assignments** are ordinary `latch_user_roles` rows (catalog UUID FKs; no built-in columns on `latch_users`) ([P4a](./00-decisions-needed.md#p4a--built-in-role-storage--exclusivity-blocks-task-01-seeds--task-03assignment-dal)).
- New roles need **no** grant rows until configured ([P2a](./00-decisions-needed.md#p2a--sparse-grants-default-deny)).
- `DbRoleGrantProvider` ([02b](./02b-db-role-grant-provider.md)) joins `latch_role_surfaces` for `row_scope` when folding grant rows into `RoleGrant` per role×surface.

## Files (target — no `apps/crm` today; spike/template)

| File | Action |
|------|--------|
| migration `0NN_latch_roles.sql` (or Drizzle) | **Create** — `latch_roles` + `latch_role_surfaces` + `latch_role_grants` DDL |
| Drizzle schema | **Edit** — table definitions |
| seed | **Edit** — seed `system_data` + `system_iam` catalog rows only; **one initial super-admin** user assigned both system UUIDs per [P4b](./00-decisions-needed.md#p4b--first-admin-bootstrap--last-admin-protection-blocks-task-01-seeds) |
| `latch_app` role grants (T5) | **Edit** — ensure the app DB role can `SELECT` grants/bindings and the role-editor path can write them under `SET LOCAL` |
| [`apps/spike_policy`](../../../../apps/spike_policy) (fixture only) | **Optional** — pilot app roles + grants for harness/tests; not copied into the template |

## Steps (outline)

1. Write DDL + Drizzle schema for all three tables; enforce grant tuple uniqueness and `(role_id, surface_id)` uniqueness on `latch_role_surfaces`.
2. Seed system catalog rows (`system_data`, `system_iam`); confirm they can't be deleted via the editor (task 03 enforces).
3. Seed **one initial super-admin** user with both built-ins assigned in `latch_user_roles` (P4b bootstrap); document the `LATCH_BOOTSTRAP_ADMIN_EMAIL` break-glass alongside.
4. Confirm `latch_app` (T5) can read grants and bindings; writes go through the audited IAM path only.
5. *(Fixture, not template)* Update `apps/spike_policy` migration if needed so local harness can optionally seed pilot personas + grants against `spike_codegen` vocabulary.

## Verify (stop gate — pre-P11 prototype)

Stop gate for **table structure and P1–P4b semantics** on the pre-P11 sketch. P11-shaped catalog (UUID + `role_class`) is verified in **[01b](./01b-p11-catalog-realignment.md)**.

- [x] Migration creates `latch_roles`, `latch_role_surfaces`, and `latch_role_grants`; built-ins seeded (pre-P11: text PK + slug ids)
- [x] Template seed contains **only** the two system catalog rows — no pilot app roles ([P3](./00-decisions-needed.md#p3--seed-pilot-app-roles-or-start-the-catalog-empty))
- [x] `row_scope` lives only on `latch_role_surfaces`; grant rows have no `row_scope` column
- [x] Grant tuple uniqueness enforced at the DB level; `(role_id, surface_id)` unique on bindings
- [x] FK semantics: `latch_user_roles.role_id` RESTRICT; `latch_role_grants` / `latch_role_surfaces` CASCADE on role delete
- [x] Both built-ins synthesized in `PolicyService` (no `latch_role_grants` rows for either) — P4 (pre-P11: slug-based synthesis)
- [x] One initial super-admin user seeded with both built-in assignments — P4b (pre-P11: slug ids)
- [x] App DB role can read grants and bindings; cannot mutate audit/role tables outside the sanctioned path
- [x] Migration runs clean on a fresh DB — verified on `latch-dev` Neon ([`apps/spike_policy/README.md`](../../../../apps/spike_policy/README.md#verify-on-neon-task-01-stop-gate))

## Reference

- [`00-decisions-needed.md`](./00-decisions-needed.md) — P1 (`row_scope`), P2 (FK), P3 (system rows only), P4 (synthesize), P4a (storage + exclusivity), P4b (bootstrap), P11 (catalog shape)
- [`docs/phases/03-identity-iam/decisions.md`](../../../docs/phases/03-identity-iam/decisions.md) — identity storage (superseded in part)
- [`docs/reference/compartments.md`](../../../docs/reference/compartments.md) — platform tables
- [`01b-p11-catalog-realignment.md`](./01b-p11-catalog-realignment.md) — P11 catalog shape (next)
- [`02-role-grant-provider.md`](./02-role-grant-provider.md) · [`02b-db-role-grant-provider.md`](./02b-db-role-grant-provider.md) — read path
- [`apps/spike_policy`](../../../../apps/spike_policy) · [`apps/spike_codegen`](../../../../apps/spike_codegen) — disposable harness + vocabulary fixture

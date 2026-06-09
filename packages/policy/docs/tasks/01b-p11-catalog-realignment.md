# 01b — P11 catalog realignment (UUID + `role_class`)

> **Status:** Complete (2026-06-08). Next: [02b — DB-backed provider](./02b-db-role-grant-provider.md).
>
> **Blocks:** [02b](./02b-db-role-grant-provider.md) (stable DDL + UUID principals), [03](./03-role-editor-surface.md) (editor guards on `role_class`).

## Goal

Bring **code in line with the locked P11 decision** ([00 — P11](./00-decisions-needed.md#p11--role-catalog-shape-uuid--role_class-2026-06-08)). [Task 01](./01-role-tables.md) shipped the P1–P4b table *structure* using a **pre-P11 sketch** (text PK, `kind`, `is_builtin`, slug seeds `data_master` / `iam_master`). Docs and access-control references already describe the canonical shape; this task closes the gap before DB provider wiring or the role editor.

## Why a separate task

P11 was locked **after** task 01's stop gate passed. Realignment touches migrations, Drizzle, `@latch/policy` synthesis, seeds, and harness docs — distinct from "add the three tables" (01). Splitting it keeps 01's verify honest (pre-P11 prototype) and makes the execution order explicit.

## Scope

| Layer | Current (pre-P11) | Target (P11) |
|-------|-------------------|--------------|
| [`apps/spike_policy`](../../../../apps/spike_policy) migrations `003`, `004`, `007`, `900` | `id TEXT`, `kind`, `is_builtin`, slug seeds | `id UUID`, `role_class`, fixed system UUIDs, no slug / no row `created_at` on catalog |
| [`apps/spike_policy/db/schema.ts`](../../../../apps/spike_policy/db/schema.ts) | Drizzle matches pre-P11 DDL | Drizzle matches P11 DDL |
| [`@latch/policy`](../../src/policy-service.ts) | `DATA_MASTER_ROLE_ID` / `IAM_MASTER_ROLE_ID` slug strings; `principal.roles.includes(...)` | Synthesis keyed on `role_class` via `Principal.roleClasses`; **no** fixed system-UUID constants (P11 amended 2026-06-08 — DB picks ids) |
| [`apps/spike_policy/README.md`](../../../../apps/spike_policy/README.md) | Verify queries use slug ids | Verify queries use system UUIDs |

**Out of scope (later tasks):** `DbRoleGrantProvider` preload ([02b](./02b-db-role-grant-provider.md)); role-editor DAL ([03](./03-role-editor-surface.md)); assignment DAL exclusivity / last-`system_iam` guard (03 + existing IAM path).

## Canonical catalog shape (locked — do not re-litigate)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` PK | **DB-generated** (`gen_random_uuid()`) for all rows. System rows are identified by `role_class`, not a fixed id (P11 amended 2026-06-08). |
| `role_class` | `system_data` \| `system_iam` \| `app` | Replaces `is_builtin` and `kind`. |
| `display_name` | `TEXT NOT NULL` | UI / audit; not unique. |

- Partial unique index: at most one row per `role_class IN ('system_data', 'system_iam')` — the singleton that makes `role_class` a stable identifier.
- `latch_user_roles.role_id`, `latch_role_grants.role_id`, `latch_role_surfaces.role_id` → `latch_roles.id` (`UUID`).
- System grants **not** stored as rows — synthesized in `PolicyService` from assigned `role_class` ([P4](./00-decisions-needed.md#decision-synthesize-both-built-ins-in-code-2026-06-06)).

## Files (target)

| File | Action |
|------|--------|
| `apps/spike_policy/migrations/003_latch_roles.sql` | **Rewrite** — P11 DDL; `id DEFAULT gen_random_uuid()`; seed system rows without id literals |
| `apps/spike_policy/migrations/004_latch_user_roles_role_fk.sql` | **Edit** — `role_id` type `UUID` if needed |
| `apps/spike_policy/migrations/007_bootstrap_super_admin.sql` | **Edit** — assign system rows by `role_class` subquery |
| `apps/spike_policy/migrations/900_fixture_pilot_roles.sql` | **Edit** — `role_class = 'app'`; client-picked UUIDs (related-data fixture) |
| `apps/spike_policy/db/schema.ts` | **Edit** — P11 column set; `id` `.defaultRandom()` |
| `apps/spike_policy/README.md` | **Edit** — verify section (role_class lookups) + schema note |
| `packages/policy/src/policy-service.ts` | **Edit** — `role_class`-based synthesis via `Principal.roleClasses`; remove system-UUID constants |
| `packages/contracts/src/types.ts` | **Edit** — add `RoleClass` + `Principal.roleClasses` |
| `packages/policy/src/policy-service.test.ts` | **Edit** — principals tagged with `roleClasses` |
| `packages/policy/src/index.ts` | **Edit** — drop system-UUID constant exports |

System rows are identified by `role_class` (singleton index), **not** fixed UUIDs — Postgres mints all ids (P11 amended 2026-06-08). No system-UUID constants in `@latch/policy`.

## Steps (outline)

1. Add `RoleClass` + `Principal.roleClasses` to `@latch/contracts`.
2. Rewrite `003` (`gen_random_uuid()` default, seed without id) + dependent migrations and Drizzle schema to P11 shape; re-verify on a fresh Neon branch.
3. Update bootstrap (`007`) to assign system rows via `WHERE role_class IN (...)`; fixture (`900`) keeps client-picked UUIDs.
4. Change `PolicyService.resolve` to synthesize from `role_class` (`Principal.roleClasses` map); remove system-UUID constants.
5. Update policy unit tests; confirm no slug- or fixed-UUID built-in ids remain in the runtime-roles path.

## Verify (stop gate)

- [x] `latch_roles` uses `UUID` PK + `role_class`; no `slug`, `is_builtin`, `kind`, or row `created_at` on catalog
- [x] Partial unique index enforces singleton `system_data` and `system_iam` rows
- [x] Template seeds **only** the two system rows (fixed UUIDs); `900_fixture` pilot roles use `role_class = 'app'` with UUID ids
- [x] `007_bootstrap_super_admin` assigns both system UUIDs to the bootstrap user
- [x] All role FK columns (`latch_user_roles`, `latch_role_grants`, `latch_role_surfaces`) are `UUID`
- [x] `@latch/policy` synthesizes `system_data` / `system_iam` from assigned catalog ids (not slug string matching)
- [x] Exported template UUID constants match migration seeds
- [x] `packages/policy` tests pass with UUID principals
- [x] Migration chain runs clean on a fresh DB — re-verify per [`apps/spike_policy/README.md`](../../../../apps/spike_policy/README.md)

## Reference

- [`00-decisions-needed.md`](./00-decisions-needed.md) — P11 (shape), P4 (synthesis), P4a (UUID assignments), P4b (bootstrap UUIDs)
- [`01-role-tables.md`](./01-role-tables.md) — pre-P11 prototype (complete)
- [`docs/reference/access-control.md`](../../../../docs/reference/access-control.md) — graduated P11 shape

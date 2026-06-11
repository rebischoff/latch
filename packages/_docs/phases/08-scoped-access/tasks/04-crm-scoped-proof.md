# 04 — Business scoped visibility proof (`apps/spike_business`)

> **Status:** Complete (2026-06-10). Next: [05-platform-regression.md](./05-platform-regression.md). **Depends on:** [03-dal-scope-filter.md](./03-dal-scope-filter.md). **Harness:** [two-harness decision](../decisions.md#decision-two-harness-proof-model--repoint-task-04-2026-06-10) — replaces deleted `apps/crm`.

## Goal

Prove scoped row filtering on a **real business table** in a **dedicated consumer harness**. `apps/spike_policy` exercises policy only (no business DDL); this task owns the consumer half.

## Deliverables

### New app: `apps/spike_business`

Disposable sibling of `spike_policy`. Graduates toward [discussion 07 template](../../discussions/07-template-scaffold.md); not a CRM rebuild.

### Schema

- Migration: one business table (e.g. `jobs` or `widgets`) with nullable `scope_id` UUID FK → `latch_scopes.id` (reuse platform table from spike migration chain).
- Seed: at least two scopes (e.g. Branch A / B); rows tagged per branch; persona with `row_scope: scope` on the surface binding bound to one branch.

### Runtime roles

- App role (e.g. `branch_sales`) with `latch_role_surfaces.row_scope = 'scope'` on list + detail surface bindings.
- Test user assigned `(role, scope_id)` via `latch_user_roles`.

### Store + DAL wiring

- Store adapter list/get/bulk pass `scopeIds` from manifest (wire generic `createSurfaceDal` + codegen glue).
- `projectRow` includes `scope_id` only where manifest grants read (if exposed).

### Tests (`apps/spike_business/**/*.test.ts`)

- Scoped user list returns only in-scope rows.
- Cross-scope row id: get denied (404/403 per T8 pattern).
- `own` / `all` rungs unchanged if seeded (regression optional in same harness).

## Verify (stop gate)

- [x] Business table `scope_id` migrated + seeded
- [x] Scoped persona test in `npm run test` (`apps/spike_business`)
- [x] Store honors `manifest.scopeIds` on list/get/bulk
- [x] Demo or README note in `apps/spike_business/docs/` or phase Recently completed

## Out of scope

- Full trades CRM / customer surfaces
- Changes to `apps/spike_policy` (policy console stays IAM-only)
- Native Postgres RLS (Phase 07)
- Business-app template CLI (discussion 07 — follow-on)

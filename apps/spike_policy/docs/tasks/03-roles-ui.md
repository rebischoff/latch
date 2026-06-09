# 03 — Roles UI + Postgres `role_detail` DAL

> **Status:** Stub (2026-06-08). **Depends on** [01](./01-next-shell.md), [02](./02-vocabulary-fixture.md) (grant matrix needs full registry). **Builds on** lib task 03 ([`role_detail`](../../../packages/policy/docs/tasks/03-role-editor-surface.md)) — today **memory-only**.

## Goal

`/roles` list and `/roles/[id]` detail: create/update/delete app roles, edit `surface_bindings` + sparse `grants`, validated against codegen vocabulary. **Persist to Postgres** so role definitions survive dev restarts. Forms use **react-hook-form** + Ant Design 6.

## Deliverables

### Server

- Surface YAML already exists: [`modules/iam/role_detail.*`](../../modules/iam/role_detail.surface.yaml)
- **Postgres store adapter** for `latch_roles` / `latch_role_surfaces` / `latch_role_grants` (replace `MemoryRoleStore` on the UI path)
- Server actions (preferred): list roles, get role, create, patch, delete
- Actor flow: `loadPrincipalFromDb(actAs)` → `createPolicyServiceForPrincipal` → `resolve(..., { surface: "role_detail" })` → `PermissionContext` → `createRoleDetailDal(pgStore, { pool })`
- **`policyVersion` bump** ([`policy-version.ts`](../../lib/iam/policy-version.ts)) on:
  - grant or `surface_bindings` patch (`patchTouchesPolicyData`)
  - app role **delete**
  - then **`revalidatePath('/', 'layout')`** so nav `Policy v{N}` updates
- `@latch/policy` **`validateGrantTuple`** on patch (already in [`validate-patch.ts`](../../lib/iam/validate-patch.ts))

### UI (Ant Design + react-hook-form)

- **`/roles`** — `Table` of catalog roles (`display_name`, `role_class`, assignment count optional)
- **`/roles/[id]`** — detail form:
  - `display_name` (text)
  - Per-surface **row scope** (`own` | `all`) when surface is bound
  - Sparse **grant matrix** — checkboxes grouped by surface → field → action (vocabulary from `spikePolicyRegistry`; unchecked = **default deny**, no row written)
  - Built-in roles: read-only / delete disabled
  - Submit via RHF; server action re-resolves actor manifest before write

### Guards (already in lib — wire through PG)

- Built-in roles read-only / not deletable
- P8 self grant/binding edit denied (`ForbiddenError` — auth deny, not `denyWins`)
- Delete blocked when assignments exist (RESTRICT)

## Verify (stop gate)

- [ ] `system_iam` actor can CRUD app roles through UI; data persists after server restart
- [ ] Unknown field grant rejected (400) — proves `validateGrantTuple`
- [ ] Built-in delete disabled; assignment-blocked delete shows clear error
- [ ] Grant matrix lists all fixture surfaces from task **02**
- [ ] Saving grant/binding changes or deleting a role **increments nav `Policy v{N}`**
- [ ] Display-name-only patch does **not** bump version
- [ ] Unit/integration tests for PG DAL

## Next

[04 — Users UI + inspector](./04-users-ui.md)

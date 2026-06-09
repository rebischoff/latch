# `apps/spike_policy` — platform + runtime-roles fixture

Disposable harness for [policy tasks 01 / 01b](../../packages/policy/docs/tasks/README.md). Prototypes the **platform migration spine** a future business-app template will ship. Vocabulary for pilot grant fixtures lives in [`apps/spike_codegen`](../spike_codegen).

> **Schema (P11, 2026-06-08):** `latch_roles` uses `UUID` PK + `role_class` (`system_data` | `system_iam` | `app`); no `slug`, `is_builtin`, `kind`, or row `created_at` on the catalog. Ids are **DB-generated** (`gen_random_uuid()`); system rows are identified by `role_class` (one each, partial unique index), never by a fixed id. `@latch/policy` synthesizes from `role_class` via `Principal.roleClasses` — no exported system-UUID constants.

## Template vs fixture migrations

| File | Contents | Graduates to template? |
|------|----------|------------------------|
| `001_latch_users.sql` | `latch_users` | Yes |
| `002_latch_user_roles.sql` | Assignments table (no role FK yet) | Yes |
| `003_latch_roles.sql` | Role catalog + bindings + grants DDL; system seeds only (P11) | Yes |
| `004_latch_user_roles_role_fk.sql` | `role_id` UUID + FK → `latch_roles.id` RESTRICT | Yes |
| `005_latch_policy_version.sql` | Manifest invalidation counter | Yes |
| `006_latch_app_role.sql` | `latch_app` + platform GRANTs | Yes |
| `007_bootstrap_super_admin.sql` | Bootstrap user with both system UUIDs (P4b) | Yes |
| `008_latch_app_role_editor.sql` | `latch_app` INSERT/UPDATE/DELETE on role catalog + grants | Yes |
| `900_fixture_pilot_roles.sql` | `field_tech` / `office_admin` + `widget_list` grants | **Spike only** |

## Migrate (Neon — recommended)

Neon is the default Postgres workflow — see [`docs/foundations/development.md`](../../docs/foundations/development.md). Docker is optional.

1. Create or reuse a Neon project; use a **dedicated branch** (e.g. `spike-policy-verify`) so you can reset without touching other work.
2. Copy the **direct** connection string (not pooler) into `apps/spike_policy/.env.local`:

```env
DATABASE_URL=postgresql://...@ep-....neon.tech/neondb?sslmode=require
LATCH_APP_ROLE_PASSWORD=<non-default>
```

Generate a password: `openssl rand -base64 24` (required — migrate rejects the default password on `.neon.` hosts).

3. Apply migrations from repo root:

```bash
cp apps/spike_policy/.env.local.example apps/spike_policy/.env.local   # first time
node scripts/db-migrate.mjs --app=spike_policy --check
node scripts/db-migrate.mjs --app=spike_policy
```

**Template chain only** (P3 — excludes `900_fixture_pilot_roles.sql`): apply `001` through `007` individually:

```bash
for f in 001_latch_users.sql 002_latch_user_roles.sql 003_latch_roles.sql \
  004_latch_user_roles_role_fk.sql 005_latch_policy_version.sql \
  006_latch_app_role.sql 007_bootstrap_super_admin.sql; do
  node scripts/db-migrate.mjs --app=spike_policy --only="$f"
done
```

**Full spike chain** (includes pilot fixture): default `node scripts/db-migrate.mjs --app=spike_policy` (runs `900_*.sql` after `007`).

## Verify on Neon (task 01b stop gate)

Use a **fresh branch** (Neon console → Reset branch, or as owner: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`), then run the template migrate above.

### Post-migrate SQL checklist

```sql
-- Tables + system catalog rows (template run: only system_data, system_iam)
SELECT id, role_class, display_name FROM latch_roles ORDER BY role_class, id;

-- P4: no grant rows for system classes
SELECT g.* FROM latch_role_grants g
JOIN latch_roles r ON r.id = g.role_id
WHERE r.role_class IN ('system_data', 'system_iam');

-- P4b bootstrap (both system classes assigned to one user)
SELECT ur.user_id, r.role_class
FROM latch_user_roles ur
JOIN latch_roles r ON r.id = ur.role_id
WHERE ur.user_id = 'bootstrap-admin'
ORDER BY r.role_class;

-- row_scope lives on bindings only
SELECT column_name FROM information_schema.columns
WHERE table_name = 'latch_role_grants' AND column_name = 'row_scope';

-- FK delete rules (confdeltype: r=RESTRICT, c=CASCADE)
SELECT conname, confdeltype FROM pg_constraint
WHERE conname LIKE 'latch_%' AND contype = 'f';
```

### FK RESTRICT / CASCADE exercises (owner connection)

Run as the owner `DATABASE_URL` user:

```sql
BEGIN;
INSERT INTO latch_roles (id, role_class, display_name)
  VALUES ('b1000001-0000-4000-8000-000000000099', 'app', 'Verify');
INSERT INTO latch_role_surfaces (role_id, surface_id, row_scope)
  VALUES ('b1000001-0000-4000-8000-000000000099', 'widget_list', 'own');
INSERT INTO latch_role_grants (role_id, surface_id, field_id, action)
  VALUES ('b1000001-0000-4000-8000-000000000099', 'widget_list', 'summary', 'read');
INSERT INTO latch_user_roles (user_id, role_id)
  VALUES ('bootstrap-admin', 'b1000001-0000-4000-8000-000000000099');

-- RESTRICT: should fail
DELETE FROM latch_roles WHERE id = 'b1000001-0000-4000-8000-000000000099';

DELETE FROM latch_user_roles
WHERE user_id = 'bootstrap-admin'
  AND role_id = 'b1000001-0000-4000-8000-000000000099';

-- CASCADE: should succeed; grants/bindings gone
DELETE FROM latch_roles WHERE id = 'b1000001-0000-4000-8000-000000000099';
SELECT COUNT(*) FROM latch_role_grants
WHERE role_id = 'b1000001-0000-4000-8000-000000000099';
SELECT COUNT(*) FROM latch_role_surfaces
WHERE role_id = 'b1000001-0000-4000-8000-000000000099';
ROLLBACK;
```

### `latch_app` read-only on role tables

Connect as `latch_app` (same host, user `latch_app`, password from `LATCH_APP_ROLE_PASSWORD`):

```sql
SELECT current_user;
SELECT COUNT(*) FROM latch_role_grants;
-- INSERT INTO latch_roles (id, role_class, display_name) VALUES (gen_random_uuid(), 'app', 'X');
-- should fail: permission denied
```

## Bootstrap + break-glass (P4b)

Provisioning seeds user `bootstrap-admin` with both system catalog UUIDs. For lockout recovery when zero `system_iam` holders exist, set:

```env
LATCH_BOOTSTRAP_ADMIN_EMAIL=admin@example.com
```

Break-glass promotion is implemented in the app auth layer (not in these migrations).

## Request-scoped grant preload (task 02b)

Runtime grants load **once per request** at bootstrap into a sync `MemoryRoleGrantProvider` snapshot — `PolicyService.resolve` stays sync; no Postgres import in `@latch/policy` (P5).

| Module | Role |
|--------|------|
| [`lib/preload-role-grants.ts`](./lib/preload-role-grants.ts) | `SELECT` grant rows + binding `row_scope`; fold to provider |
| [`lib/fold-role-grants.ts`](./lib/fold-role-grants.ts) | Pure fold: sparse rows → one `RoleGrant` per role×surface |
| [`lib/request-policy.ts`](./lib/request-policy.ts) | `loadPrincipalFromDb` + `createPolicyServiceForPrincipal` |

**Template app reuse:** at the same layer that builds `PermissionContext`, call `preloadRoleGrantProvider(pool, principal.roles)` (or `createPolicyServiceForPrincipal`), then pass the snapshot to `new PolicyService({ grantProvider, registry })`. Grant edits bump `latch_policy_version` (task 03 write path); manifest cache keys already include `policyVersion` (Phase 06).

```ts
import { createPolicyServiceForPrincipal, loadPrincipalFromDb } from "./lib/request-policy.js";
import { widgetListSurfacePolicyDef } from "../spike_codegen/modules/widget/generated/widget_list.schema.generated.js";
import { definePolicyRegistry } from "@latch/policy";

const principal = await loadPrincipalFromDb(pool, session.userId);
const policy = await createPolicyServiceForPrincipal(
  pool,
  principal,
  definePolicyRegistry(widgetListSurfacePolicyDef),
);
const manifest = policy.resolve(principal, { surface: "widget_list" });
```

### Tests

Unit fold tests always run. DB integration tests skip unless `apps/spike_policy/.env.local` has `DATABASE_URL` (full spike chain including `900_fixture_pilot_roles.sql`):

```bash
npm test -- apps/spike_policy/lib
```

## Role-editor IAM Surface (task 03)

`role_detail` — CRUD app roles + sparse grants; gated to `system_iam` synthesis; audited; `latch_policy_version` bumped on grant/binding changes.

| Module | Role |
|--------|------|
| [`modules/iam/role_detail.surface.yaml`](./modules/iam/role_detail.surface.yaml) | Surface vocabulary |
| [`lib/iam/repository.ts`](./lib/iam/repository.ts) | `createRoleDetailDal` — create / get / patch / delete |
| [`lib/policy-registry.ts`](./lib/policy-registry.ts) | `widget_list` + `role_detail` registry |
| `@latch/policy` `validateGrantTuple` | Write-time grant validation against codegen catalog (P6) |

Decisions locked at implementation: **P8** deny self grant/binding edits; **P9** one Surface (`role_detail`); **P7** `mode` deferred (NULL).

```ts
import { createMemoryAuditWriter, setAuditWriter } from "@latch/audit";
import {
  createRoleDetailDal,
  MemoryRoleStore,
  seedSystemRoles,
  spikePolicyRegistry,
} from "@latch/spike-policy/lib";
import { PolicyService } from "@latch/policy";

setAuditWriter(createMemoryAuditWriter().writer);
const store = new MemoryRoleStore({ roles: seedSystemRoles() });
const dal = createRoleDetailDal(store, { registry: spikePolicyRegistry });
const policy = new PolicyService({ registry: spikePolicyRegistry });
const ctx = {
  principal: { id: "admin", roles: [/* system_iam UUID */], roleClasses: { /* … */ } },
  manifest: policy.resolve(principal, { surface: "role_detail" }),
  surface: "role_detail" as const,
};
```

## Task plans

| Plan | Path |
|------|------|
| Platform / runtime roles (01–03 complete) | [`packages/policy/docs/tasks`](../../packages/policy/docs/tasks/README.md) |
| **Policy console UI** (next: task 01 — shell + antd + policy API page) | [`docs/tasks/README.md`](./docs/tasks/README.md) |

## Related

- [`packages/policy/docs/tasks/README.md`](../../packages/policy/docs/tasks/README.md)
- [`apps/spike_codegen/README.md`](../spike_codegen/README.md)

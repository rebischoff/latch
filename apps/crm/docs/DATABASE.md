# CRM — database plan (docs only)

`apps/crm` **owns** its schema, seed, store, and migrations. The `@latch/*` packages are domain-agnostic kernels; the CRM app is the only place business tables are defined. CRM uses the **same company Postgres** (or in-memory store) as the rest of Latch — it does not own a separate database.

## Principles

1. **DAL is the only app path to data** — routes and Server Actions call `@latch/dal`, never Drizzle directly from UI/route code.
2. **Schema home** — `apps/crm/db/` (Drizzle schema + seed + store) and `apps/crm/migrations/` (SQL).
3. **Tables** — CRM owns `jobs`, `assignments`, `latch_users`, `latch_user_roles`, `customers`, `sites`. `@latch/audit` still owns `latch_audit`.

## Environments

| Environment | `DATABASE_URL` | Notes |
|-------------|----------------|-------|
| Local / preview / prod | **Neon** connection string | Set in `apps/crm/.env.local` |
| No Postgres | Omit `DATABASE_URL` | In-memory store + in-memory audit (default for UI-only work) |

See [`../../../docs/foundations/development.md`](../../../docs/foundations/development.md) for Neon setup and `npm run db:migrate`.

## Migration plan

| Step | Action |
|------|--------|
| 1 | Apply `apps/crm/migrations/001_init.sql` on a fresh Neon DB (`npm run db:migrate` from repo root) |
| 2 | If an old DB had soft-delete columns, apply `002_drop_soft_delete_columns.sql` |
| 3 | Apply `apps/crm/migrations/003_customers_sites.sql` — `customers`, `sites`, `jobs.customer_id` (+ pilot seed rows for QA) |
| | `psql "$DATABASE_URL" -f apps/crm/migrations/003_customers_sites.sql` |
| 4 | Apply `apps/crm/migrations/004_latch_user_roles.sql` — `latch_user_roles` (+ pilot user/role seed rows) |
| | `psql "$DATABASE_URL" -f apps/crm/migrations/004_latch_user_roles.sql` |
| 5 | Apply `apps/crm/migrations/005_latch_app_role.sql` — role **`latch_app`**, business-table CRUD, **`INSERT` only** on `latch_audit` |
| | `psql "$DATABASE_URL" -f apps/crm/migrations/005_latch_app_role.sql` (run as DB owner / migration role) |

### Application role (`latch_app`)

| Connection | Role | Use |
|------------|------|-----|
| **Owner / migrate** | Neon project owner, Docker `latch` user, etc. | `npm run db:migrate`, applying SQL migrations **001–005** |
| **App runtime** | **`latch_app`** | `DATABASE_URL` in Vercel preview/production and anywhere the CRM app mutates data |

Migration **005** creates `latch_app` with:

- **`SELECT` / `INSERT` / `UPDATE` / `DELETE`** on business tables (`jobs`, `assignments`, `latch_users`, `latch_user_roles`, `customers`, `sites`).
- **`INSERT` only** on `latch_audit` (plus sequence usage for `id`). **`UPDATE` / `DELETE` revoked** on `latch_audit`.
- Existing **`latch_audit_deny_mutation`** trigger remains (belt + suspenders per [Phase 04 T6 decision](../../../docs/phases/04-audit-lifecycle/decisions.md)).

**Production must not** use the database owner or superuser for app `DATABASE_URL` — that bypasses T6 role grants. Local dev may keep an owner URL for migrations while the app still uses in-memory job data; when testing Postgres audit writes, prefer `latch_app` after step 5.

Pilot default password in **005** is `latch_app` (Docker / CI only). Rotate on real deployments.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | App connection (production: **`latch_app`**) |
| `LATCH_APP_DATABASE_URL` | Optional override for threat test **T6** in CI/local (`postgresql://latch_app:latch_app@…`) |

### `latch_user_roles`

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | `TEXT` | FK → `latch_users.id`, `ON DELETE CASCADE` |
| `role_id` | `TEXT` | Policy catalog key (e.g. `field_tech`, `iam_master`) |

Composite primary key `(user_id, role_id)`. No `roles` table in v1 — catalog is built-in + app YAML ([Phase 03 decisions](../../../docs/phases/03-identity-iam/decisions.md)).

**Seed data:** `apps/crm/db/seed.ts` (`seedPilotJobs` — users, role assignments, customers, sites, jobs). Migrations `003`/`004` mirror the same ids for Postgres manual QA.

| Constant | User id | Role(s) |
|----------|---------|---------|
| `SEED_TECH_ID` | `seed-field-tech` | `field_tech` |
| `SEED_ADMIN_ID` | `seed-office-admin` | `office_admin` |
| `SEED_IAM_ID` (optional QA) | `seed-iam-admin` | `iam_master` |

`data_master` is **not** seeded on pilot users (dedicated QA login only).

## Store selection (implementation)

```
if DATABASE_URL set
  → Postgres audit writer + Postgres DAL adapter (when built)
else
  → in-memory job store + seedPilotJobs (dev default)
```

Store wiring lives in `apps/crm/src/lib/latch.ts` — one place assembles the Surface descriptor, policy registry, and store adapter.

## What CRM proves for DB

| Check | How |
|-------|-----|
| Reads respect row scope | Tech list ≠ admin list row count |
| Writes audit | After delete, `latch_audit` row exists when `DATABASE_URL` points at Neon |
| No tombstone columns | Deleted job absent from `jobs` table (when Postgres DAL lands) |

**Phase 04+:** partition sketch + restore operator (below); automated partition jobs remain post-phase.

## Cascade on delete (v1 pilot)

Hard delete removes the **anchor row only** from the DAL; Postgres **`ON DELETE CASCADE`** removes structural children. The DAL writes **one** audit row on the anchor — never per-child deletes or audit rows. See [Phase 04 cascade decision](../../../docs/phases/04-audit-lifecycle/decisions.md) and [`audit-and-lifecycle.md`](../../../docs/reference/audit-and-lifecycle.md).

### FK cascade (schema)

| Child table | Parent | FK column | On parent delete |
|-------------|--------|-----------|------------------|
| `assignments` | `jobs` | `job_id` | `ON DELETE CASCADE` (`001_init.sql`) |
| `sites` | `customers` | `customer_id` | `ON DELETE CASCADE` (`003_customers_sites.sql`) |
| `latch_user_roles` | `latch_users` | `user_id` | `ON DELETE CASCADE` (`004_latch_user_roles.sql`) |
| `jobs` | `customers` | `customer_id` | **RESTRICT** (no `ON DELETE` clause in `003_customers_sites.sql`) |

**`jobs.customer_id` → RESTRICT:** deleting a customer fails while jobs reference that customer. v1 CRM does not expose customer `delete`; the FK still enforces integrity for future work.

### Per Surface (pilot)

| Surface | Anchor | CASCADE children | `delete` in CRM v1 | Notes |
|---------|--------|------------------|--------------------|-------|
| `job_detail`, `job_list` | `jobs` | `assignments` | **Yes** | `job_detail.policies.yaml` / `job_list.policies.yaml` grant `delete` to `office_admin`. DAL deletes `jobs` only; assignments removed by DB CASCADE. |
| `customer_detail` | `customers` | `sites` | **No** | Customer hard delete deferred (Phase 02). `customer_detail` has no `delete` action today. |
| `user_roles_detail` | `latch_users` | `latch_user_roles` | **No** | IAM assign/revoke only; user hard delete not in v1. |

### Delete audit `before` and restore

Recoverable deletes embed CASCADE children in audit `before` when the Surface grants **`restore`** (pilot: `office_admin` on `job_detail`).

| Step | Task | Deliverable |
|------|------|-------------|
| Snapshot shape | [**06** — delete audit snapshots](../../../docs/phases/04-audit-lifecycle/tasks/06-delete-audit-snapshots.md) | `deleteAuditSnapshot(row, related)` — anchor + `assignments` (and `sites` helper for future customer delete) |
| Replay | [**07** — restore tool](../../../docs/phases/04-audit-lifecycle/tasks/07-restore-tool.md) | `@latch/audit` restore API + CRM script; INSERT anchor + children from `before` |

`job_list` bulk delete uses the same per-row snapshot contract when `restore` is granted on that Surface.

## Restore-from-audit operator

Privileged replay — **not** a tombstone column. Canonical contract: [Phase 04 restore decision](../../../docs/phases/04-audit-lifecycle/decisions.md) · [`audit-and-lifecycle.md`](../../../docs/reference/audit-and-lifecycle.md).

| Topic | v1 |
|-------|-----|
| **Who** | Principal with **`restore`** on the anchor Surface (pilot: `office_admin` on `job_detail`) |
| **How** | `@latch/audit` `restoreFromAuditEntry` + `npm run restore-audit` — **no** CRM React admin page in Phase 04 |
| **Eligible audit** | `action = delete`, non-null `before`, matching entity |
| **Conflict** | Live row present → **409** (default; no overwrite) |

### Operator runbook — `restore-audit`

1. **Role:** principal must have **`restore`** on the anchor Surface (pilot: `office_admin` → `job_detail`). The tool re-resolves the manifest from `latch_user_roles`; CLI flags do not bypass policy.
2. **Find the audit row:** after a recoverable delete, note `latch_audit.id` (`action = delete`, `module_id` = Surface id, `entity_type` = anchor table).
3. **Run** (from repo root; requires `DATABASE_URL` in `apps/crm/.env.local` or the environment):

   ```bash
   npm run restore-audit -- <audit-id> --actor <principal-id>
   ```

   Example: `npm run restore-audit -- 42 --actor seed-office-admin`

4. **Store:** replay INSERTs into the pilot **memory** store (local dev). Postgres is used to **read** the audit row and **append** the `restore` audit entry when `DATABASE_URL` is set.
5. **Outcomes:** success → anchor + embedded children (e.g. `assignments`) visible again + new `restore` audit row; live row already present → **409**; no `restore` grant → **403**.

**App role (`latch_app`):** See [Application role](#application-role-latch_app) above. CI sets `LATCH_APP_DATABASE_URL` and runs threat **T6** as `latch_app` after migration **005**.

## Audit retention (v1 seam)

- **`auditRetentionYears`:** default **3** ([global options](../../../docs/foundations/global-options.md)). Runtime type: `@latch/audit` — `getAuditConfig().retentionYears` ([`packages/audit/src/config.ts`](../../../packages/audit/src/config.ts)). CRM env re-export is optional later.
- **Partitioning:** monthly range on `latch_audit.occurred_at` (`auditPartitionBy: month`). Pilot migration **001** uses a non-partitioned table; convert when volume warrants it.

### Partition DDL sketch (not in pilot CI)

```sql
-- Illustrative monthly partitions — operator or future migration; not run in Phase 04 CI.
CREATE TABLE latch_audit (
  id BIGSERIAL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  module_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  field_ids TEXT[],
  before JSONB,
  after JSONB,
  patch JSONB,
  request_id TEXT,
  approval_id TEXT,
  PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);

CREATE TABLE latch_audit_y2026m06 PARTITION OF latch_audit
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
```

Re-attach `latch_audit_deny_mutation` on the parent after cutover. `latch_app` keeps **INSERT** only on the parent (inherits to partitions).

### Operator runbook — archive and drop

1. Resolve retention: `getAuditConfig().retentionYears` or deployment `auditRetentionYears` (must be ≥ global default unless compliance requires longer retention).
2. For each month partition with `upper(occurred_at) < now() - retention`, **archive** first (`pg_dump` table, object store, etc.).
3. **Detach** then **DROP** partition tables only after archive is verified. Do not `DELETE` from `latch_audit` — rows are immutable; app role cannot mutate audit data.
4. **No automated job** in Phase 04 — create next month’s partition and drop expired partitions on a maintenance calendar until post-phase automation lands.

See [`audit-and-lifecycle.md`](../../../docs/reference/audit-and-lifecycle.md#retention) and Phase 04 task **08**.

## Related

- [`../../../docs/reference/audit-and-lifecycle.md`](../../../docs/reference/audit-and-lifecycle.md)
- [`../../../docs/phases/04-audit-lifecycle/decisions.md`](../../../docs/phases/04-audit-lifecycle/decisions.md)
- [`../../../docs/foundations/development.md`](../../../docs/foundations/development.md)

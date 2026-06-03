# Audit and lifecycle

Audit logging plus **hard delete** semantics. Recovery is from audit, not tombstone columns.

## Audit principles

1. **Complete**: every successful mutation that changes business data produces an audit event.
2. **Immutable**: no UPDATE/DELETE on audit rows (only archival/partitioning).
3. **Attributable**: actor, time, source (API, batch, approval accept).
4. **Reconstructable**: enough payload to understand what changed (full row snapshot and/or JSON patch).

## Audit event shape

| Column | Description |
|--------|-------------|
| `id` | Bigserial / UUID |
| `occurred_at` | Timestamptz |
| `actor_id` | Principal |
| `action` | `insert`, `update`, `delete`, `restore`, `approve`, `reject`, `bulk_summary` |
| `module_id` | Logical module / Surface |
| `entity_type` | Table or entity name |
| `entity_id` | Primary key (text or jsonb for composite) |
| `field_ids` | Fields touched (optional) |
| `before` | JSONB snapshot or null |
| `after` | JSONB snapshot or null (null on delete) |
| `patch` | JSONB RFC6902-style diff (optional) |
| `request_id` | Correlation |
| `approval_id` | Link to trail if applicable |

> **Do not use** `soft_delete` or `hard_delete` audit actions — superseded by **`delete`** (2026-05-30).

### Decision: delete `before` payload (Surface-scoped) (2026-06-02)

**Choice:** Every successful delete writes `action = delete` with `after = null`. **`before` richness is Surface-scoped:**

| Recoverability | Surface action | `before` shape |
|----------------|----------------|----------------|
| **Full** | `restore` granted | Anchor row + embedded CASCADE children keyed by table name (via `deleteAuditSnapshot(row, related)`) |
| **Limited** | `delete` only | Anchor columns only |
| **Metadata-only** | `delete` only (optional) | Actor, time, `entity_type`, `entity_id`, `field_ids` |

**Rationale:** All meaningful deletes are audited; operator undelete and full snapshots apply only where policy grants `restore`.

**Canonical detail:** [`../phases/04-audit-lifecycle/decisions.md`](../phases/04-audit-lifecycle/decisions.md) · Phase 04 task **06**.

### Decision: Phase 04 vs Phase 05 audit actions (2026-06-02)

**Choice:** Phase 04 proves `insert`, `update`, `delete`, `bulk_summary`, and implements **`restore`**. **`approve`** and **`reject`** are wired in Phase 05 on accept/reject only (types already exist).

**Canonical detail:** [`../phases/04-audit-lifecycle/decisions.md`](../phases/04-audit-lifecycle/decisions.md).

## Implementation options

| Approach | Pros | Cons |
|----------|------|------|
| Postgres triggers on business tables | Hard to bypass | Must generate per table; Field mapping in trigger |
| Application middleware | Rich context | Easy to miss a code path |
| Event outbox + worker | Scalable | More moving parts |

**v1**: app-path `writeAudit` on DAL mutations; DB triggers for immutability on `latch_audit` only. Table-level mutation triggers on business tables are **deferred** (2026-06-02).

### Decision: v1 pilot audit path (2026-05-28)

**Choice:** DAL `writeAudit` → Postgres INSERT (`audit-db-writer.ts` when `DATABASE_URL` is set). `latch_audit` has **BEFORE UPDATE OR DELETE** immutability triggers only — **no** `AFTER INSERT/UPDATE/DELETE` on business tables in Phase 04.

**Rationale:** App-path mutations already call `writeAudit` with Field ids and snapshots. A table trigger on `jobs` would duplicate rows on every DAL patch unless gated by session vars. Direct-SQL bypass remains a documented ops risk; optional hardening is post-v1.

### Decision: T6 immutability — defense in depth (2026-06-02)

**Choice:** **Both** layers:

1. **Trigger** (exists): `BEFORE UPDATE OR DELETE ON latch_audit` → raise.
2. **Role grants** (Phase 04 task **04**): app role `latch_app` — **`INSERT` only** on `latch_audit`; no `UPDATE`/`DELETE`.

**CI:** Threat **T6** runs as `latch_app`, not superuser. Production `DATABASE_URL` must use the app role; local dev may use superuser (see [`../../apps/crm/docs/DATABASE.md`](../../apps/crm/docs/DATABASE.md)).

**Canonical detail:** [`../phases/04-audit-lifecycle/decisions.md`](../phases/04-audit-lifecycle/decisions.md).

## Hard delete (v1 — only delete model)

There is **no soft delete**. Live tables do not use `deleted_at` / `deleted_by`.

Behavior:

1. Principal must have Surface- or Field-level **`delete`** (per manifest).
2. DAL loads row (+ `store.getRelated` when recoverable), writes audit with `action = delete`, **`before`** per Surface-scoped contract, `after = null`.
3. DAL deletes **anchor row only**; Postgres **`ON DELETE CASCADE`** removes structural children (pilot: `assignments` → `jobs`, `sites` → `customers`, `latch_user_roles` → `latch_users`). `jobs.customer_id` is **RESTRICT** — no customer delete in v1 CRM.
4. Subsequent `get` / `list` → **404** / not in result set (same as unauthorized row, per global option).

**Recovery:** privileged **restore-from-audit** replays eligible `delete` audit `before` payloads (Phase 04 task **07**); not an undelete column.

RLS (when added) treats deleted rows as absent because they no longer exist.

### Decision: cascade on hard delete (v1 pilot) (2026-06-02)

**Choice:** Keep existing **Postgres `ON DELETE CASCADE`** for structural children; DAL deletes **anchor row only** (`deleteRowWithAudit`). One audit row per delete — always on the **anchor** table; the DAL never issues separate deletes (or audit rows) for CASCADE children.

| Child table | Parent | FK | On parent delete |
|-------------|--------|-----|------------------|
| `assignments` | `jobs` | `job_id` | CASCADE (DB) |
| `sites` | `customers` | `customer_id` | CASCADE (DB) |
| `latch_user_roles` | `latch_users` | `user_id` | CASCADE (DB) |
| `jobs` | `customers` | `customer_id` | **RESTRICT** (default FK; no `ON DELETE`) |

**`jobs.customer_id` → RESTRICT:** Postgres blocks `DELETE` on a `customers` row while any `jobs` row references it. v1 CRM has no customer `delete` Surface; this FK still protects referential integrity if a customer delete is added later.

**Rationale:** Children are not separate policy anchors in v1; per-child DAL delete + audit would duplicate CASCADE and risk audit gaps. Restore replays anchor `before` including embedded children where `restore` is granted ([task **06**](../phases/04-audit-lifecycle/tasks/06-delete-audit-snapshots.md)); the restore operator INSERTs anchor + children from that payload ([task **07**](../phases/04-audit-lifecycle/tasks/07-restore-tool.md)).

**Pilot Surfaces** (anchor → CASCADE children; audit on anchor only):

| Surface | Anchor table | CASCADE children | `delete` in CRM v1 | DAL on delete | Audit |
|---------|--------------|------------------|--------------------|---------------|-------|
| `job_detail`, `job_list` | `jobs` | `assignments` (`job_id`) | **Yes** (`office_admin`) | `DELETE` anchor only; DB removes assignments | One `delete` row on `jobs`; `before` embeds `assignments` when `restore` granted (task **06**) |
| `customer_detail` | `customers` | `sites` (`customer_id`) | **No** (deferred Phase 02) | N/A today | When delete ships: anchor-only DAL + one audit row; embed `sites` in `before` if `restore` granted |
| `user_roles_detail` | `latch_users` | `latch_user_roles` (`user_id`) | **No** (user delete deferred) | N/A today | Assign/revoke only; user hard delete not exposed — typically **non-recoverable** if added |

**Out of scope:** Ordered multi-table DAL deletes without CASCADE; customer or user `delete` Surfaces in v1 CRM.

**Canonical detail:** [`../phases/04-audit-lifecycle/decisions.md`](../phases/04-audit-lifecycle/decisions.md) · [`../../apps/crm/docs/DATABASE.md`](../../apps/crm/docs/DATABASE.md#cascade-on-delete-v1-pilot).

### Decision: restore-from-audit replay (2026-06-02)

**Choice:**

| Topic | v1 |
|-------|-----|
| **Who** | Principal with Surface action **`restore`** on anchor Surface |
| **Entry** | `@latch/audit` restore API + CRM CLI/script — no CRM React admin page in Phase 04 |
| **Eligible rows** | `action = delete`; `before` non-null; matching `entity_type` / `entity_id` |
| **Steps** | Re-resolve manifest → require `restore` → if live row exists **409** → INSERT anchor + children from `before` in FK-safe order → audit `action = restore` |
| **Idempotency** | Second restore → **409** (default); `--force` documented only |

**Not restore:** `update` / `approve` / `reject` audit rows (Phase 05).

**Canonical detail:** [`../phases/04-audit-lifecycle/decisions.md`](../phases/04-audit-lifecycle/decisions.md) · task **07**.

## Retention

### Decision: retention and immutability (2026-05-27)

**Choice:**

- **Immutable by default** — no UPDATE/DELETE on audit rows; only insert, plus partition drop/archive after retention.
- **Default retention:** **3 years** (`auditRetentionYears` global option); deployments may increase for compliance.
- **Partitioning:** by month on `occurred_at` (configurable via global options).
- **GDPR / erasure:** default **off** (`gdprErasureMode: off`). Optional `pseudonymize` mode may redact actor/PII in audit payloads while keeping event skeleton; legal hold blocks erasure. Use only where legal/compliance requires — not default.

See [global-options.md](../foundations/global-options.md).

### Decision: retention seam (v1 — Phase 04) (2026-06-02)

**Choice:** **Config seam only** in Phase 04 — no automated partition create/drop in CI.

| Item | v1 |
|------|-----|
| `auditRetentionYears` | Global options; default **3** |
| Partition DDL | Monthly `occurred_at` sketch documented in `DATABASE.md` + this doc |
| Archive/drop job | **TBD** — operator runbook paragraph only |

Automated retention enforcement is **post–Phase 04** unless a later task proves trivial.

**Runtime seam:** `@latch/audit` exports `AuditConfig`, `getAuditConfig()`, and `DEFAULT_AUDIT_RETENTION_YEARS` (**3**). No cron or partition automation in CI.

**Canonical detail:** Phase 04 task **08**.

### Partition sketch (monthly on `occurred_at`)

Pilot `latch_audit` is a single table today ([`001_init.sql`](../../apps/crm/migrations/001_init.sql)). When volume warrants partitioning, migrate to a **range-partitioned** parent keyed on `occurred_at` (global option `auditPartitionBy: month`):

```sql
-- Illustrative — not applied in Phase 04 pilot migrations.
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
-- … one child per month; attach immutability trigger on parent (inherits to children in PG 11+).
```

**Operator runbook (archive/drop):**

1. Read `getAuditConfig().retentionYears` (or deployment override of `auditRetentionYears`).
2. **Archive** partitions older than retention (e.g. `COPY` / `pg_dump` to cold storage) before any drop.
3. **Drop** detached partitions only after archive is verified — never `DELETE` rows on `latch_audit` (immutability + `latch_app` is INSERT-only).
4. **Automation deferred** — partition create/attach and scheduled drop are not in Phase 04 CI; operators run DDL on a maintenance window until a later task ships jobs.

See [`apps/crm/docs/DATABASE.md`](../../apps/crm/docs/DATABASE.md#audit-retention-v1-seam).

## Bulk operations

Bulk updates and bulk deletes produce **one audit row per successfully changed entity**, plus an **optional batch summary row** linked by `request_id`. See [`bulk-operations.md`](./bulk-operations.md). Bulk delete uses the same **`delete`** audit action per row.

Threat to watch: a bulk implementation that bypasses per-row `writeAudit` will silently lose audit rows. Tests T15 and T16 in [`../foundations/threat-model.md`](../foundations/threat-model.md) cover this.

## v1 scope note

- **Hard delete only** ([`../foundations/scope.md`](../foundations/scope.md)).
- **Restore-from-audit** operator: Phase 04 tasks **06–07** (CLI + `@latch/audit`; no CRM admin UI).
- **3-year retention default.** Partition automation = config seam + docs in Phase 04; enforcement post-phase unless trivial.
- **Threat tests in Phase 04 DoD:** **T6** (app role immutability), **T16** (delete audit, no gap). **T17** (denied access audit): design note only — see [`../foundations/open-questions.md`](../foundations/open-questions.md).

## Relationship to approval

Changes applied via **accept** generate audit with `action = approve` and reference `approval_id`. Rejected pending changes may log `reject` without touching live data.

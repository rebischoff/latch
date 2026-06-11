# Phase 04 — decisions

## Decided

| Date | Topic | Choice |
|------|-------|--------|
| 2026-05-27 | Audit immutability | Append-only; no UPDATE/DELETE on audit rows |
| 2026-05-27 | Retention default | 3 years; partition by month |
| 2026-05-30 | **Delete model (global)** | **Hard delete only.** No `deleted_at` / soft delete. Live row removed; audit `before` snapshot; recovery = restore-from-audit (privileged replay). Locked in [`../../foundations/scope.md`](../../foundations/scope.md). |
| 2026-05-30 | Audit action for delete | Single action: **`delete`** (not `soft_delete` / `hard_delete`). |
| 2026-05-30 | Policy action for delete | Surface/Field action **`delete`** gates who may remove live rows. |
| 2026-06-02 | Delete recoverability | **Surface-scoped.** Full delete snapshots (embedded CASCADE children) only where **`restore`** is granted; elsewhere delete audit may be anchor-only or metadata-only. |
| 2026-06-02 | Cascade on hard delete (v1 pilot) | Keep Postgres **`ON DELETE CASCADE`** for structural children; DAL deletes **anchor row only** (`deleteRowWithAudit`). |
| 2026-06-02 | Delete audit snapshot contract | **`deleteAuditSnapshot(row, related)`** on recoverable Surfaces; anchor-only or metadata-only elsewhere. |
| 2026-06-02 | Restore-from-audit operator | **`@latch/audit`** API + CRM CLI/script; **`restore`** Surface action; no CRM admin UI in Phase 04. |
| 2026-06-02 | T6 immutability (defense in depth) | **Both:** existing `BEFORE UPDATE OR DELETE` trigger on `latch_audit` **and** app role **`INSERT` only** on `latch_audit` (migration task **04**). |
| 2026-06-02 | Business-table mutation triggers | **Deferred** — no `AFTER INSERT/UPDATE/DELETE` on `jobs` / `customers` in Phase 04; DAL `writeAudit` is v1 path. |
| 2026-06-02 | Retention / partitioning (v1) | **Config seam only** — `auditRetentionYears` default **3**; partition DDL documented; no automated drop in CI. |
| 2026-06-02 | Audit actions — Phase 04 vs 05 | Phase 04: `insert`, `update`, `delete`, `bulk_summary`, **`restore`**. Phase 05: **`approve`**, **`reject`** wiring on accept/reject. |
| 2026-06-02 | Restore package layout | Restore logic in **`@latch/audit`**; CRM script is thin caller; no `restore` on generic `createSurfaceDal` in v1. |
| 2026-06-02 | Threat tests in Phase 04 DoD | **T6** (app role cannot UPDATE `latch_audit`); **T16** (delete → audit, no gap). **T17** (denied access audit): design note only. |

### Decision: delete recoverability (Surface-scoped) (2026-06-02)

**Choice:** Recoverability is **Surface-scoped**, not global.

- Every successful delete still writes an append-only audit row (`action = delete`).
- **Recoverable Surfaces** — principal has Surface action **`restore`** (e.g. `office_admin` on `job_detail`): delete `before` uses **`deleteAuditSnapshot(row, related)`** and embeds CASCADE children keyed by table name (assignments, sites, …). Restore-from-audit tool applies only to these rows.
- **Non-recoverable Surfaces** — no `restore` grant: delete audit may be **anchor-only** (row columns) or **metadata-only** (actor, time, entity id, field ids); no embedded children required; restore tool rejects replay.

**Rationale:** Compliance expects audit on all meaningful deletes; not every entity tier needs operator undelete (IAM, ephemeral data, future GDPR erasure). Policy action `restore` gates both tooling and snapshot richness.

**Canonical detail:** [`tasks/00-decisions.md`](./tasks/00-decisions.md) §2 · implementation task **06**.

### Decision: cascade mechanism (v1 pilot) (2026-06-02)

**Choice:** Keep existing **Postgres `ON DELETE CASCADE`** for structural children; DAL deletes **anchor row only** (current `deleteRowWithAudit` pattern). **One audit row per delete** on the anchor — no per-child DAL deletes or audit rows.

| Child table | Parent | FK (pilot) | On parent delete |
|-------------|--------|------------|------------------|
| `assignments` | `jobs` | `job_id` | CASCADE (DB) |
| `sites` | `customers` | `customer_id` | CASCADE (DB) |
| `latch_user_roles` | `latch_users` | `user_id` | CASCADE (DB) |
| `jobs` | `customers` | `customer_id` | **RESTRICT** (`jobs.customer_id` has no `ON DELETE`; Postgres default) |

| Surface | Anchor | CASCADE children | `delete` in CRM v1 |
|---------|--------|------------------|--------------------|
| `job_detail`, `job_list` | `jobs` | `assignments` | **Yes** |
| `customer_detail` | `customers` | `sites` | **No** (deferred) |
| `user_roles_detail` | `latch_users` | `latch_user_roles` | **No** (user delete deferred) |

**Rationale:** Children are not separate policy anchors in v1; per-child DAL delete + audit would duplicate CASCADE and risk audit gaps. Restore replays from the anchor `before` payload ([task **06**](./tasks/06-delete-audit-snapshots.md)); operator INSERTs anchor + embedded children ([task **07**](./tasks/07-restore-tool.md)).

**Out of scope this phase:** Ordered multi-table DAL deletes without CASCADE; customer `delete` Surface (deferred from Phase 02).

**Canonical detail:** [`../../reference/audit-and-lifecycle.md`](../../../audit/docs/audit-and-lifecycle.md) · [`../../../../apps/crm/docs/DATABASE.md`](../../../../../apps/crm/docs/DATABASE.md#cascade-on-delete-v1-pilot).

### Decision: delete audit snapshot contract (restore input) (2026-06-02)

**Choice:** Use **`deleteAuditSnapshot(row, related)`** on the descriptor for delete paths; keep **`auditSnapshot(row)`** row-only for patch/approve audits. DAL calls `store.getRelated(id)` before delete and passes `related` into the snapshot helper.

| Recoverability | Surface action | Delete `before` shape |
|----------------|----------------|------------------------|
| **Full (recoverable)** | `restore` granted | Anchor columns + embedded CASCADE children keyed by table name |
| **Limited** | `delete` only | Anchor columns only (no embedded children) |
| **Metadata-only** | `delete` only (optional tier) | Actor, time, `entity_type`, `entity_id`, `field_ids` — minimal payload |

| Surface | Anchor | Full snapshot (when `restore` granted) |
|---------|--------|----------------------------------------|
| `job_detail` / `job_list` | `jobs` | Anchor columns + `assignments: [{ job_id, user_id }, …]` |
| `customer_detail` | `customers` | Anchor columns + `sites: [{ id, customer_id, label }, …]` (when customer delete ships) |
| `user_roles_detail` | `latch_users` | Profile fields + `latch_user_roles: [{ user_id, role_id }, …]` (if user delete added; typically **non-recoverable**) |

**Pilot:** `office_admin` has `restore` on `job_detail` — task **06** implements full snapshot for jobs. Bulk delete on recoverable Surfaces uses the same per-row shape; optional `bulk_summary` unchanged ([`../../reference/bulk-operations.md`](../../../dal/docs/bulk-operations.md)).

**Gap (task 06):** Pilot `jobRowAuditSnapshot` today omits `assignments` — add `deleteAuditSnapshot` in implementation.

### Decision: restore-from-audit operator (privileged replay) (2026-06-02)

**Choice:**

| Topic | v1 choice |
|-------|-----------|
| **Who** | Principal with Surface action **`restore`** on the anchor Surface (pilot: `office_admin` on `job_detail`). No new built-in role. |
| **Entry point** | **`@latch/audit`** restore API + **CRM CLI/script** under `apps/crm/scripts/` (or `npm run restore-audit` at repo root). **No** CRM React admin page in this phase ([`../../reference/crm-and-phases.md`](../../reference/crm-and-phases.md)). |
| **Eligible audit rows** | `action = delete` only; `before` non-null; `entity_type` + `entity_id` match anchor. |
| **Replay steps** | 1) Re-resolve manifest for caller + Surface. 2) Require `restore`. 3) If live row exists → **409** (no overwrite). 4) INSERT anchor from `before`; INSERT children from embedded keys in FK-safe order. 5) `writeAudit` with `action = restore`, `after` = reconstructed row, `before` = null. |
| **Idempotency** | Second restore of same deleted entity → **409** unless operator passes explicit `--force` (document only; default deny). |
| **Store** | Memory store + Postgres when `DATABASE_URL` set (mirror DAL delete tests). |

**Not restore:** `update` / `approve` / `reject` rows (Phase 05 owns approval replay semantics).

**Canonical detail:** task **07** · [`../../../../apps/crm/docs/DATABASE.md`](../../../../../apps/crm/docs/DATABASE.md#restore-from-audit-operator).

### Decision: T6 audit immutability (defense in depth) (2026-06-02)

**Choice:** **Both** (align with [`../../foundations/threat-model.md`](../../foundations/threat-model.md)):

1. **DB trigger** (exists): `BEFORE UPDATE OR DELETE ON latch_audit` → raise.
2. **Role grants (new):** Migration introduces `latch_app` (or documents reuse of deployment app role). App runtime `DATABASE_URL` uses that role: **`INSERT` only** on `latch_audit`; **no** `UPDATE`/`DELETE` on `latch_audit`.

**CI:** Threat **T6** SQL test runs as **`latch_app`** (not superuser). Keep existing unit proxy (no `updateAudit` / `deleteAudit` exports).

**Pilot note:** Local dev may still use superuser `DATABASE_URL`; document in `DATABASE.md` — production must use `latch_app`.

**Canonical detail:** task **04**.

### Decision: business-table mutation triggers (2026-06-02)

**Choice:** **Deferred** — no `AFTER INSERT/UPDATE/DELETE` triggers on `jobs` / `customers` in Phase 04.

**Rationale:** DAL `writeAudit` is the v1 path; table triggers duplicate rows unless session-gated. Direct-SQL bypass remains a documented ops risk; optional hardening is post-v1 or a change order.

### Decision: retention / partitioning (v1 seam) (2026-06-02)

**Choice:** **Config seam only** in Phase 04 — no automated partition create/drop in CI.

| Item | v1 |
|------|-----|
| `auditRetentionYears` | Read from global options type in `@latch/audit` (or `apps/crm` config re-export); default **3** |
| Partition DDL | Document monthly `occurred_at` partition sketch in `DATABASE.md` + reference doc |
| Archive/drop job | **TBD** — operator runbook paragraph only |

Automated retention enforcement is explicitly **post–Phase 04** unless a later task proves trivial.

**Canonical detail:** task **08**.

### Decision: audit action set — Phase 04 vs Phase 05 (2026-06-02)

| Action | Phase 04 responsibility |
|--------|-------------------------|
| `insert`, `update`, `delete` | Prove no gap on delete paths (**T16**); existing DAL paths |
| `bulk_summary` | Already emitted on bulk; document + test |
| `restore` | Implement replay tool (restore operator decision) |
| `approve`, `reject` | **Phase 05** — types exist; wire on accept/reject only |

### Decision: restore package layout (2026-06-02)

**Choice:** Restore logic lives in **`@latch/audit`** (`restoreFromAudit` or similar); CRM script is a thin caller. DAL does **not** expose restore on generic `createSurfaceDal` in v1 — operators use audit tool + manifest check, not a public `PATCH`.

## Superseded

| Date | Topic | Superseded by |
|------|-------|----------------|
| 2026-05-27 | v1 delete = soft delete only | 2026-05-30 hard delete only |

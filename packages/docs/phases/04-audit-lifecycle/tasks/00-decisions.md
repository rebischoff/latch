# 00 — Lock Phase 04 Audit & lifecycle decisions

> **Status:** Complete (2026-06-02). Next: [`04-audit-role-grants.md`](./04-audit-role-grants.md).

## Goal

Record cascade rules, delete/restore audit contracts, T6 immutability model, restore-from-audit operator boundary, retention seam, and Phase 05 handoff so tasks **04–21** do not re-debate them. **Docs only — do not add application code.**

## Prerequisites

- Phase 03 complete ([`../../03-identity-iam/STATUS.md`](../../03-identity-iam/STATUS.md)).
- Skim the [phase README](../README.md), [`../decisions.md`](../decisions.md), and [`../../../reference/audit-and-lifecycle.md`](../../../reference/audit-and-lifecycle.md).

## Files (docs only — do not add application code)

| File | Action |
|------|--------|
| [`../decisions.md`](../decisions.md) | Open items → **Decided** table + Decision blocks (cascade, snapshots, T6, restore, retention, triggers, Phase 05 boundary) |
| [`../../../reference/audit-and-lifecycle.md`](../../../reference/audit-and-lifecycle.md) | Add Decision blocks for cascade table + restore replay; align event shape with locked choices |
| [`../../../foundations/open-questions.md`](../../../foundations/open-questions.md) | Move resolved audit/delete rows to **Resolved**; leave break-glass / denied-bulk audit as deferred notes |
| [`../../../../apps/crm/docs/DATABASE.md`](../../../../apps/crm/docs/DATABASE.md) | Cross-link cascade + restore operator section (no new migrations in this task) |
| [`../STATUS.md`](../STATUS.md) | After verify: **Execute now** → `04-audit-role-grants.md` |

## Decisions to lock (copy into [`../decisions.md`](../decisions.md))

### 1. Cascade mechanism (v1 pilot)

**Choice:** Keep existing **Postgres `ON DELETE CASCADE`** for structural children; DAL deletes **anchor row only** (current `deleteRowWithAudit` pattern).

| Child table | Parent | FK (pilot) | On parent delete |
|-------------|--------|------------|------------------|
| `assignments` | `jobs` | `job_id` | CASCADE (DB) |
| `sites` | `customers` | `customer_id` | CASCADE (DB) |
| `latch_user_roles` | `latch_users` | `user_id` | CASCADE (DB) |
| `jobs` | `customers` | `customer_id` | **RESTRICT** (no customer delete in v1 CRM) |

**Rationale:** Children are not separate policy anchors in v1; per-child DAL delete + audit would duplicate CASCADE and risk audit gaps. Restore replays from the anchor `before` payload (decision 2).

**Out of scope this phase:** Switching to ordered multi-table DAL deletes without CASCADE; customer `delete` Surface (deferred from Phase 02).

### 2. Delete audit snapshot contract (restore input)

**Choice:** Recoverability is **Surface-scoped**. Full delete snapshots (with embedded CASCADE children) **only where `restore` is granted** on the anchor Surface; elsewhere delete audit may be anchor-only or metadata-only. All deletes still produce an append-only `delete` audit row.

**API:** Use **`deleteAuditSnapshot(row, related)`** on the descriptor for delete paths; keep **`auditSnapshot(row)`** row-only for patch/approve audits. DAL calls `store.getRelated(id)` before delete ([`delete-row.ts`](../../../../packages/dal/src/delete-row.ts) must pass `related`).

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

**Pilot:** `office_admin` has `restore` on `job_detail` — task **06** implements full snapshot for jobs. `job_list` bulk deletes: see §3 restore authz (Surface tied to `restore` grant, not only `module_id`).

**Gap (task 06):** Pilot `jobRowAuditSnapshot` today omits `assignments` — add `deleteAuditSnapshot` in implementation.

**Bulk delete:** Same snapshot shape per row on recoverable Surfaces; optional `bulk_summary` row unchanged ([`../../../reference/bulk-operations.md`](../../../reference/bulk-operations.md)).

### 3. Restore-from-audit operator (privileged replay)

**Choice:**

| Topic | v1 choice |
|-------|-----------|
| **Who** | Principal with Surface action **`restore`** on the anchor Surface (pilot: `office_admin` on `job_detail` per existing YAML). No new built-in role. |
| **Entry point** | **`@latch/audit` restore API** + **CRM CLI/script** under `apps/crm/scripts/` (or `npm run restore-audit` at repo root). **No** CRM React admin page in this phase ([`../../../reference/crm-and-phases.md`](../../../reference/crm-and-phases.md)). |
| **Eligible audit rows** | `action = delete` only; `before` non-null; `entity_type` + `entity_id` match anchor. |
| **Replay steps** | 1) Re-resolve manifest for caller + Surface. 2) Require `restore`. 3) If live row exists → **409** (no overwrite). 4) INSERT anchor from `before`; INSERT children from embedded keys in FK-safe order. 5) `writeAudit` with `action = restore`, `after` = reconstructed row, `before` = null. |
| **Idempotency** | Second restore of same deleted entity → 409 unless operator passes explicit `--force` (document only; default deny). |
| **Store** | Memory store + Postgres when `DATABASE_URL` set (mirror DAL delete tests). |

**Not restore:** `update` / `approve` / `reject` rows (Phase 05 owns approval replay semantics).

### 4. T6 audit immutability (defense in depth)

**Choice:** **Both** (align with [`../../../foundations/threat-model.md`](../../../foundations/threat-model.md)):

1. **DB trigger** (exists): `BEFORE UPDATE OR DELETE ON latch_audit` → raise.
2. **Role grants (new):** Migration introduces `latch_app` (or documents reuse of deployment app role). App runtime `DATABASE_URL` uses that role: **`INSERT` only** on `latch_audit`; **no** `UPDATE`/`DELETE` on `latch_audit`.

**CI:** Threat **T6** SQL test runs as **`latch_app`** (not superuser). Keep existing unit proxy (no `updateAudit` / `deleteAudit` exports).

**Pilot note:** Local dev may still use superuser `DATABASE_URL`; document in `DATABASE.md` — production must use `latch_app`.

### 5. Business-table mutation triggers

**Choice:** **Deferred** — no `AFTER INSERT/UPDATE/DELETE` triggers on `jobs` / `customers` in Phase 04.

**Rationale:** DAL `writeAudit` is the v1 path; table triggers duplicate rows unless session-gated ([`audit-and-lifecycle.md`](../../../reference/audit-and-lifecycle.md) Decision 2026-05-28). Direct-SQL bypass remains a documented ops risk; optional hardening is post-v1 or a change order.

### 6. Retention / partitioning (v1 seam)

**Choice:** **Config seam only** in Phase 04 — no automated partition create/drop in CI.

| Item | v1 |
|------|-----|
| `auditRetentionYears` | Read from global options type in `@latch/audit` (or `apps/crm` config re-export); default **3** |
| Partition DDL | Document monthly `occurred_at` partition sketch in `DATABASE.md` + reference doc |
| Archive/drop job | **TBD** — operator runbook paragraph only |

Automated retention enforcement is explicitly **post–Phase 04** unless a later task proves trivial.

### 7. Audit action set — Phase 04 vs Phase 05

| Action | Phase 04 responsibility |
|--------|-------------------------|
| `insert`, `update`, `delete` | Prove no gap on delete paths (**T16**); existing DAL paths |
| `bulk_summary` | Already emitted on bulk; document + test |
| `restore` | Implement replay tool (decision 3) |
| `approve`, `reject` | **Phase 05** — types exist; wire on accept/reject only |

### 8. Threat tests in scope

| Id | Phase 04 deliverable |
|----|----------------------|
| **T6** | App role cannot UPDATE `latch_audit` (CI as `latch_app`) |
| **T16** | Single + bulk delete → audit row(s) present; no silent gap |

**T17** (denied access audit): design note in `open-questions.md` only — not Phase 04 DoD.

### 9. Package layout

**Choice:** Restore logic lives in **`@latch/audit`** (`restoreFromAudit` or similar); CRM script is a thin caller. DAL does **not** expose restore on generic `createSurfaceDal` in v1 — operators use audit tool + manifest check, not a public `PATCH`.

## Verify (stop gate)

- [x] No unchecked items in [`../decisions.md`](../decisions.md) **Open / to lock** section
- [x] Decision blocks exist for cascade, delete snapshot contract, restore operator, T6 model, retention seam, business-trigger deferral, and Phase 05 boundary
- [x] [`../../../reference/audit-and-lifecycle.md`](../../../reference/audit-and-lifecycle.md) updated with cascade + restore decisions
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `04-audit-role-grants.md`
- [x] No new files under `packages/*` or `apps/crm/src` from this task (docs-only)

## Out of scope

- Migrations, restore implementation, snapshot code changes (tasks **04**+)
- CRM restore admin UI
- GDPR erasure / legal hold
- Business-table audit triggers
- `approve` / `reject` audit wiring (Phase 05)
- Automated partition lifecycle jobs

# Audit and lifecycle

Audit logging plus **hard delete** semantics. Recovery is from audit, not tombstone columns.

## Audit principles

1. **Complete**: every successful mutation that changes business data produces an audit event.
2. **Immutable**: no UPDATE/DELETE on audit rows (only archival/partitioning).
3. **Attributable**: actor, time, source (API, batch, approval accept).
4. **Reconstructable**: enough payload to understand what changed (full row snapshot and/or JSON patch).

## Audit event shape (draft)

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

## Implementation options

| Approach | Pros | Cons |
|----------|------|------|
| Postgres triggers on business tables | Hard to bypass | Must generate per table; Field mapping in trigger |
| Application middleware | Rich context | Easy to miss a code path |
| Event outbox + worker | Scalable | More moving parts |

**Proposal for v1**: app-path `writeAudit` on DAL mutations; DB triggers for immutability on `latch_audit` only. Table-level mutation triggers deferred to Phase 04 hardening.

### Decision: v1 pilot audit path (2026-05-28)

**Choice:** DAL `writeAudit` → Postgres INSERT (`audit-db-writer.ts` when `DATABASE_URL` is set). `latch_audit` has **BEFORE UPDATE OR DELETE** immutability triggers only — **no** `AFTER UPDATE` trigger on `jobs` yet.

**Rationale:** App-path mutations already call `writeAudit` with Field ids and snapshots. A table trigger on `jobs` would duplicate rows on every DAL patch unless gated by session vars. Direct-SQL bypass coverage is deferred to Phase 04 hardening.

## Hard delete (v1 — only delete model)

There is **no soft delete**. Live tables do not use `deleted_at` / `deleted_by`.

Behavior:

1. Principal must have Surface- or Field-level **`delete`** (per manifest).
2. DAL loads row, writes audit with `action = delete`, full **`before`** snapshot, `after = null`.
3. Row removed from primary table(s); children per cascade policy (assignments: cascade on `jobs` FK in pilot schema).
4. Subsequent `get` / `list` → **404** / not in result set (same as unauthorized row, per global option).

**Recovery (deferred tooling, Phase 04):** privileged **restore-from-audit** replays the `before` snapshot into live tables — not an undelete column.

RLS (when added) treats deleted rows as absent because they no longer exist.

## Retention

### Decision: retention and immutability (2026-05-27)

**Choice:**

- **Immutable by default** — no UPDATE/DELETE on audit rows; only insert, plus partition drop/archive after retention.
- **Default retention:** **3 years** (`auditRetentionYears` global option); deployments may increase for compliance.
- **Partitioning:** by month on `occurred_at` (configurable via global options).
- **GDPR / erasure:** default **off** (`gdprErasureMode: off`). Optional `pseudonymize` mode may redact actor/PII in audit payloads while keeping event skeleton; legal hold blocks erasure. Use only where legal/compliance requires — not default.

See [global-options.md](../foundations/global-options.md).

## Bulk operations

Bulk updates and bulk deletes produce **one audit row per successfully changed entity**, plus an **optional batch summary row** linked by `request_id`. See [`bulk-operations.md`](./bulk-operations.md). Bulk delete uses the same **`delete`** audit action per row.

Threat to watch: a bulk implementation that bypasses per-row `writeAudit` will silently lose audit rows. Tests T15 and T16 in [`../foundations/threat-model.md`](../foundations/threat-model.md) cover this.

## v1 scope note

- **Hard delete only** ([`../foundations/scope.md`](../foundations/scope.md)).
- **Restore-from-audit** tool/UI: Phase 04 (deferred).
- **3-year retention default.** Partition drop/archive automation deferred to Phase 04 hardening.

## Relationship to approval

Changes applied via **accept** generate audit with `action = approve` and reference `approval_id`. Rejected pending changes may log `reject` without touching live data.

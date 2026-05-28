# Audit and lifecycle

Audit logging plus **soft** and **hard** delete semantics.

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
| `action` | `insert`, `update`, `soft_delete`, `hard_delete`, `restore`, `approve`, `reject` |
| `module_id` | Logical module |
| `entity_type` | Table or entity name |
| `entity_id` | Primary key (text or jsonb for composite) |
| `field_ids` | Fields touched (optional) |
| `before` | JSONB snapshot or null |
| `after` | JSONB snapshot or null |
| `patch` | JSONB RFC6902-style diff (optional) |
| `request_id` | Correlation |
| `approval_id` | Link to trail if applicable |

## Implementation options

| Approach | Pros | Cons |
|----------|------|------|
| Postgres triggers on business tables | Hard to bypass | Must generate per table; Field mapping in trigger |
| Application middleware | Rich context | Easy to miss a code path |
| Event outbox + worker | Scalable | More moving parts |

**Proposal for v1**: triggers for `INSERT/UPDATE/DELETE` on registered Module tables + app sets session vars for actor; Field list computed in app or simplified in trigger.

## Soft delete

Standard columns on registered tables:

- `deleted_at TIMESTAMPTZ`
- `deleted_by TEXT` (or UUID FK to users)

Behavior:

- Default ORM/query layer adds `deleted_at IS NULL`
- `soft_delete` permission required
- Audit action `soft_delete`; `restore` clears columns with audit

RLS policies should treat soft-deleted rows as invisible unless role has `read_deleted`.

## Hard delete

- Requires elevated permission (`hard_delete`)
- Transaction: copy final state to audit ? `DELETE` from primary table(s)
- Cascades defined per Module (children, attachments)

## Retention

### Decision: retention and immutability (2026-05-27)

**Choice:**

- **Immutable by default** — no UPDATE/DELETE on audit rows; only insert, plus partition drop/archive after retention.
- **Default retention:** **3 years** (`auditRetentionYears` global option); deployments may increase for compliance.
- **Partitioning:** by month on `occurred_at` (configurable via global options).
- **GDPR / erasure:** default **off** (`gdprErasureMode: off`). Optional `pseudonymize` mode may redact actor/PII in audit payloads while keeping event skeleton; legal hold blocks erasure. Use only where legal/compliance requires — not default.

See [global-options.md](./global-options.md).

- Soft-deleted rows: purge job after policy period (out of v1; hard-delete-with-audit is post-v1).

## Bulk operations

Bulk updates and bulk soft-deletes produce **one audit row per successfully changed entity**, plus an **optional batch summary row** linked by `request_id`. See [`bulk-operations.md`](./bulk-operations.md). The summary row is shaped like a normal audit row with `action = bulk_summary` and the patch + counts in `after` / `metadata`.

Threat to watch: a bulk implementation that swaps the per-row trigger path for a set-based `UPDATE` will silently lose audit rows. Tests T15 and T16 in [`../threat-model.md`](../threat-model.md) cover this.

## v1 scope note

- **Soft delete only.** Hard delete, restore, and GDPR erasure are deferred ([`../scope.md`](../scope.md)).
- **3-year retention default.** Partition drop/archive automation deferred to Phase 4 hardening.

## Relationship to approval

Changes applied via **accept** generate audit with `action = approve` and reference `approval_id`. Rejected pending changes may log `reject` without touching live data.

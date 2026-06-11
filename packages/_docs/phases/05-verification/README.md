# Phase 05 — Verification (`@latch/approval`)

> **Home package:** `@latch/approval` · **Status:** complete (2026-06-03) · **Phase STATUS:** [`STATUS.md`](./STATUS.md)

## Goal

A **verification process** where roles can require certain **Fields** to be reviewed before changes go live, and reviewers **accept/reject** proposed changes. "Verification" is the product framing; the v1 implementation is the accept/reject approval trail. Gating is **Field-level** in v1 (Surface-wide gating deferred).

## Depends on

- **Phase 00** — DAL write path + manifest (`approve` / `submit` actions).
- **Phase 04** — audit linkage on accept (`approval_id`).

## In / out of scope

| In scope | Out of scope (this phase) |
|----------|---------------------------|
| `latch_pending_changes` persisted store | Partial / per-Field accept (later) |
| State machine: submit → accept / reject / withdraw | Multiple reviewers, parallel approvals, SLAs |
| Reviewer gating via `approve` on affected Fields | External reviewers (customer sign-off) |
| Apply-on-accept (ordered) + audit; true DB atomicity deferred (memory store) | Auto-approval rules |
| Metadata flags: `requires_verification` per **Field** (not Surface-wide in v1) | Notifications |
| Bulk: per-row pending linked by `batch_id` | — |

## Sub-goals — what this phase proves

1. A change to a verification-gated **Field** does **not** touch the live row until accepted (other Fields in the same PATCH may still apply live).
2. Only roles with `approve` on the affected Fields can decide (default deny otherwise).
3. On accept: live write + audit (`action = approve`, linked `approval_id`) applied as an ordered unit with defined failure semantics. **True DB atomicity is deferred** while the jobs pilot uses `MemoryJobStore` + a separate audit writer (see [`tasks/08-accept-reject-withdraw.md`](./tasks/08-accept-reject-withdraw.md)); achievable once the business store is Postgres-backed.
4. Pending rows are immutable after a decision (T7).
5. Bulk operations on gated Fields create per-row pending records (requires a role with `submit` on the gated Field at list scope — see [`tasks/09-bulk-pending.md`](./tasks/09-bulk-pending.md)).

## Definition of done

- [x] `latch_pending_changes` migration + DAL-backed store (replaces in-memory)
- [x] Verification flags expressible in Surface YAML
- [x] Reviewer accept/reject API + role gating + audit linkage
- [x] Tests: gated write → pending; accept applies + audits; reject leaves live data untouched (T10)

## Task chain

Decisions locked in [`tasks/00-decisions.md`](./tasks/00-decisions.md). **Execute now:** [`STATUS.md`](./STATUS.md).

| Start | Index |
|-------|--------|
| First code task | [`tasks/04-db-schema.md`](./tasks/04-db-schema.md) |
| Full order | [`tasks/01-task-index.md`](./tasks/01-task-index.md) |

## References

- [`../../reference/approval-trails.md`](../../../approval/docs/approval-trails.md) · [`../../reference/bulk-operations.md`](../../../dal/docs/bulk-operations.md)
- [`../../foundations/threat-model.md`](../../foundations/threat-model.md) (T7, T10)
- [`decisions.md`](./decisions.md)

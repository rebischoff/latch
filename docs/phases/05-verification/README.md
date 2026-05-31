# Phase 05 — Verification (`@latch/approval`)

> **Home package:** `@latch/approval` · **Status:** partial · **Phase STATUS:** [`STATUS.md`](./STATUS.md)

## Goal

A **verification process** where roles can require certain **Fields or Surfaces** to be reviewed before changes go live, and reviewers **accept/reject** proposed changes. "Verification" is the product framing; the v1 implementation is the accept/reject approval trail.

## Depends on

- **Phase 00** — DAL write path + manifest (`approve` / `submit` actions).
- **Phase 04** — audit linkage on accept (`approval_id`).

## In / out of scope

| In scope | Out of scope (this phase) |
|----------|---------------------------|
| `latch_pending_changes` persisted store | Partial / per-Field accept (later) |
| State machine: submit → accept / reject / withdraw | Multiple reviewers, parallel approvals, SLAs |
| Reviewer gating via `approve` on affected Fields | External reviewers (customer sign-off) |
| Apply-on-accept in a transaction + audit | Auto-approval rules |
| Metadata flags: `requires_verification` per Field/Surface | Notifications |
| Bulk: per-row pending linked by `batch_id` | — |

## Sub-goals — what this phase proves

1. A change to a verification-gated Field/Surface does **not** touch the live row until accepted.
2. Only roles with `approve` on the affected Fields can decide (default deny otherwise).
3. On accept: live write + audit (`action = approve`, linked `approval_id`) in one transaction.
4. Pending rows are immutable after a decision (T7).
5. Bulk operations on gated Fields create per-row pending records.

## Definition of done

- [ ] `latch_pending_changes` migration + DAL-backed store (replaces in-memory)
- [ ] Verification flags expressible in Surface YAML
- [ ] Reviewer accept/reject API + role gating + audit linkage
- [ ] Tests: gated write → pending; accept applies + audits; reject leaves live data untouched (T10)

## References

- [`../../reference/approval-trails.md`](../../reference/approval-trails.md) · [`../../reference/bulk-operations.md`](../../reference/bulk-operations.md)
- [`../../foundations/threat-model.md`](../../foundations/threat-model.md) (T7, T10)

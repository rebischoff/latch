# Phase 04 — Audit & lifecycle (`@latch/audit`)

> **Home package:** `@latch/audit` · **Status:** partial · **Phase STATUS:** [`STATUS.md`](./STATUS.md)

## Goal

Make the **audit trail the system of record** for deletes and **recovery sourced from audit** (no `deleted_at` tombstones). Hard delete is **locked for v1** ([`../../foundations/scope.md`](../../foundations/scope.md), 2026-05-30). This phase hardens audit immutability, cascade rules, and the **restore-from-audit** operator path.

## Depends on

- **Phase 00** — DAL write path + `writeAudit`.
- **Phase 01** — bulk paths (bulk delete must also be audited).

## In / out of scope

| In scope | Out of scope (this phase) |
|----------|---------------------------|
| Audit every mutation: `insert`, `update`, `delete`, `approve`, `reject`, `bulk_summary` | GDPR erasure / pseudonymization (later) |
| Append-only enforcement at the DB role level (T6) | Legal hold workflow (later) |
| Configurable retention / partition / archive target | Real-time audit streaming |
| Per-Surface **cascade** rules on delete (documented + tested) | — |
| **Restore-from-audit** tool (privileged replay) | Restore *UI* polish (basic admin tool only) |

## Sub-goals — what this phase proves

1. Every successful mutation (incl. delete) writes exactly one audit row (T16: no gap).
2. App role cannot UPDATE/DELETE audit rows (T6).
3. A hard-deleted record (and its cascaded children) can be **reconstructed from audit**.
4. Retention/partition/storage limits are driven by configurable global options.
5. Bulk delete produces per-row audit + optional batch summary.

## Definition of done

- [ ] Audit action set complete (`delete`, `reject`, `bulk_summary` as needed)
- [ ] DB-level immutability (no UPDATE/DELETE) verified for the app role
- [ ] Hard delete path with documented cascade per Surface
- [ ] Restore-from-audit script/tool (privileged) with a test
- [ ] Retention/partition options honored (or seam in place with note)
- [x] Pilot schema: no `deleted_at` on new tables (2026-05-30)

## References

- [`../../reference/audit-and-lifecycle.md`](../../reference/audit-and-lifecycle.md) · [`../../foundations/global-options.md`](../../foundations/global-options.md)
- [`../../foundations/threat-model.md`](../../foundations/threat-model.md) (T6, T16)

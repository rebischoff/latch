# 06 — Delete audit snapshots (embed CASCADE children)

> **Status:** Complete (2026-06-02). Next: [`07-restore-tool.md`](./07-restore-tool.md).

## Goal

Extend delete `before` snapshots so restore can replay anchor + cascaded children from a single audit row. Close the pilot gap where `jobRowAuditSnapshot` omits `assignments`.

## Prerequisites

- [05-cascade-docs.md](./05-cascade-docs.md) complete.

## Files

| File | Action |
|------|--------|
| `apps/crm/src/lib/jobs/apply-patch.ts` | `jobRowAuditSnapshot` or dedicated delete snapshot helper |
| `apps/crm/src/lib/jobs/descriptors.ts` | Wire snapshot for `job_detail` / `job_list` delete |
| `apps/crm/src/lib/customers/descriptors.ts` | `customerRowAuditSnapshot` + `sites` embed (for future delete) |
| `packages/dal/src/delete-row.ts` | Pass related data into snapshot if descriptor API extended |
| `packages/dal/src/surface-descriptor.ts` | Optional `deleteAuditSnapshot(row, related)` on descriptor |
| `packages/dal/src/create-surface-dal.test.ts` | Assert delete `before` includes embedded children |

## Steps

1. Read [`00-decisions.md`](./00-decisions.md) §2 — snapshot contract table.
2. **Jobs:** `before` includes anchor columns + `assignments: [{ job_id, user_id }, …]` from store at delete time.
3. **Customers:** embed `sites: [{ id, customer_id, label }, …]` in snapshot helper (even if customer delete not exposed in UI yet).
4. Prefer extending descriptor with `deleteAuditSnapshot` if `auditSnapshot` is used for patch diffs and should stay row-only.
5. **Bulk delete:** same shape per row; no change to `bulk_summary` semantics.
6. Unit tests: delete job with assignments → memory audit writer `before.assignments` length matches store.

## Verify (stop gate)

- [x] `npm run test` — dal + jobs tests green; delete audit shape asserted
- [x] `npm run build` passes
- [x] Delete on seeded job produces restorable `before` (manual or test fixture)
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `07-restore-tool.md`

## Out of scope

- Restore replay implementation (task **07**)
- Postgres DAL path if still memory-primary (mirror when store supports it)
- Per-child separate audit rows

# 18 — Minimal approval (`financial_terms`)

## Goal

Office admin **approve** path: pending change → apply `contract_amount` → audit with `approval_id`.

## Prerequisites

[17-audit-triggers.md](./17-audit-triggers.md) complete.

## Files

| File | Action |
|------|--------|
| `packages/approval/src/pending-store.ts` | submit / resolve / getPendingForEntity |
| `packages/dal/src/jobs/repository.ts` | `acceptPending`; patch routes financial to pending for submitter |

## Steps

1. Read [`../../architecture/approval-trails.md`](../../../reference/approval-trails.md).
2. Tech raises `contract_amount` → pending row, live row unchanged (S3).
3. PM/admin `acceptPending` → apply patch + audit `action: approve`.
4. All-or-nothing v1 only.

## Verify (stop gate)

- [x] Pending created on financial patch when user lacks direct write but can submit
- [x] Accept updates `jobs.contract_amount` and writes audit with `approval_id`
- [x] `STATUS.md` → **19-react-gates.md**

## Out of scope

Partial field accept, external reviewers.

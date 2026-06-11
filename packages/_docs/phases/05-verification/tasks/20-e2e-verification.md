# 20 — E2E verification flow

> **Status:** Complete (2026-06-03). Next: [21-phase-dod.md](./21-phase-dod.md).

## Goal

End-to-end test: **field_tech** submits gated financial change → pending in store → **office_admin** accepts → live row + `approve` audit; second scenario **reject** leaves live data untouched + `reject` audit. Optional: bulk pending smoke.

## Prerequisites

- [11-crm-job-detail-ui.md](./11-crm-job-detail-ui.md) complete (or DAL-level e2e if UI lags).
- [09-bulk-pending.md](./09-bulk-pending.md) complete for bulk assertion.

## Files

| File | Action |
|------|--------|
| `tests/verification.e2e.test.ts` (new) | Harness similar to `restore.e2e.test.ts` |
| `apps/crm/test-utils/index.ts` | Helpers for pending + roles |

## Steps

1. Seed job; tech patches `financial_terms`; assert live unchanged.
2. Admin `acceptPending`; assert DTO + audit.
3. Reject flow on second job.
4. Bulk: two ids, one `batch_id`, two pendings.

## Verify (stop gate)

- [x] `npm run test` includes e2e file green
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `21-phase-dod.md`

## Out of scope

UI playwright (unit/e2e via DAL harness is sufficient for v1).

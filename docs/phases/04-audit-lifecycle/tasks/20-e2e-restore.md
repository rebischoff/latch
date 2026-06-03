# 20 — E2E restore (delete → audit → replay)

> **Status:** Complete (2026-06-02). Next: [21-threat-t6-t16-phase-dod.md](./21-threat-t6-t16-phase-dod.md).

## Goal

Integration test: hard-delete a job (with assignments), restore from the delete audit row, assert live data matches pre-delete state.

## Prerequisites

- [12-delete-audit-tests.md](./12-delete-audit-tests.md) complete.
- [07-restore-tool.md](./07-restore-tool.md) complete.

## Files

| File | Action |
|------|--------|
| `tests/restore.e2e.test.ts` | **Create** |
| `apps/crm/test-utils/index.ts` | Helpers: admin principal with `restore`, seeded job |

## Steps

1. Seed job with assignments (reuse pilot seed ids from test-utils).
2. Resolve manifest for `office_admin` — confirm `delete` + `restore` on `job_detail`.
3. DAL delete job → row absent from list/get; audit contains `delete` with embedded `assignments`.
4. Call restore API with audit row id + admin principal → job and assignments back.
5. Assert audit contains second row with `action: 'restore'`.
6. Assert field_tech row-scope still works on restored job if applicable.
7. No browser/Playwright required — DAL + audit + restore API only.

## Verify (stop gate)

- [x] `npm run test` — `restore.e2e.test.ts` green
- [x] Test does not require Auth.js HTTP
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `21-threat-t6-t16-phase-dod.md`

## Out of scope

- Postgres-only e2e (optional stretch behind `DATABASE_URL`)
- CRM UI for restore
- Customer delete + restore (deferred until customer delete exists)

# 20 — E2E test (`customer_detail`)

> **Status:** Complete (2026-06-02). Next: [21-threat-snapshots.md](./21-threat-snapshots.md).

## Goal

Stack-level test covering policy → DAL → detail DTO (admin vs no-grant tech) and strict patch. Mirror [`tests/job-list.e2e.test.ts`](../../../../tests/job-list.e2e.test.ts) — DAL-direct, no browser required.

## Prerequisites

[18-nav-minimal.md](./18-nav-minimal.md) complete (or API-only path: task **13** complete with nav deferred).

## Files

| File | Action |
|------|--------|
| `tests/customer-detail.e2e.test.ts` | **Create** |
| `apps/crm/test-utils/index.ts` | Export `createCustomersDal`, customer seed constants if needed |

## Steps

1. Seed store; resolve manifests for admin vs tech with `surface: 'customer_detail'`.
2. **Admin `get`:** DTO includes `profile`, `billing`, `sites`, `job_history` when granted.
3. **Tech `get`:** throws `NotFoundError` (404 hide).
4. **T2 / omission:** if manifest denies `billing`, DTO lacks `billing` key (`not.toHaveProperty`).
5. **Strict patch:** unknown key → `ValidationError`.
6. **Admin patch** on `profile` — persists; `get` reflects change.
7. **`customer_ref` on job_detail:** admin job DTO includes ref; tech omits.

## Verify (stop gate)

- [x] `npm run test` — `customer-detail.e2e.test.ts` green
- [x] [`../STATUS.md`](../STATUS.md) → **21-threat-snapshots.md**

## Out of scope

Playwright browser test, threat file changes (task **21**).

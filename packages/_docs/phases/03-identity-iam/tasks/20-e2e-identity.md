# 20 — E2E identity (DB roles → manifest)

> **Status:** Complete (2026-06-02). Next: [21-threat-t8-phase-dod.md](./21-threat-t8-phase-dod.md).

## Goal

Integration test proving `Principal.roles` from `latch_user_roles` drives manifests end-to-end (jobs + customer), mirroring [`tests/customer-detail.e2e.test.ts`](../../../../../tests/customer-detail.e2e.test.ts).

## Prerequisites

[15-crm-session-migration.md](./15-crm-session-migration.md) complete.

## Files

| File | Action |
|------|--------|
| `tests/identity.e2e.test.ts` | **Create** |
| `apps/crm/test-utils/index.ts` | Helpers: principal with DB-backed roles |

## Steps

1. Seed store with tech vs admin role assignments (no cookie roles).
2. Resolve `job_detail` manifest for each — assert `financial_terms` / `customer_detail` differences match Phase 02 expectations.
3. Add user with **both** `field_tech` and `office_admin` in `latch_user_roles` → union manifest (financial read + customer access).
4. Change roles in store without changing user id → next resolve reflects new grants (simulated T3).

## Verify (stop gate)

- [x] `npm run test` — `identity.e2e.test.ts` green
- [x] Tests do not require Auth.js HTTP (use `getPrincipal` / policy resolve directly)
- [x] [`../STATUS.md`](../STATUS.md) → **21-threat-t8-phase-dod.md**

## Out of scope

Playwright browser tests
Full T3 HTTP mid-session test (optional in **21**)

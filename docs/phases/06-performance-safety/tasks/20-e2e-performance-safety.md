# 20 — E2E performance & safety

> **Status:** Complete (2026-06-03). Next: [`21-phase-dod.md`](./21-phase-dod.md).

## Goal

End-to-end proof: manifest cache on read path; **role revoke** or **policyVersion** bump → subsequent **write** denied (T3).

## Prerequisites

- [08-cache-correctness-t3.md](./08-cache-correctness-t3.md) complete.
- [11-threat-t12-session.md](./11-threat-t12-session.md) complete.

## Files

| File | Action |
|------|--------|
| `tests/performance-safety.e2e.test.ts` (or extend `verification.e2e.test.ts`) | New scenarios |
| `apps/crm/test-utils/` | Helpers: bump version, revoke role |

## Steps

1. **Cache path:** load job detail twice in one request context — assert policy resolve count or timing hook (align with task **09**).
2. **Revoke path:** field_tech cached read → revoke `field_tech` role → PATCH → 403.
3. Keep default `npm run test` green without DB where possible (memory IAM + policy version mock).

## Verify (stop gate)

- [x] E2E file runs in CI (conditional DB sections gated)
- [x] `npm run test` green
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `21-phase-dod.md`

## Out of scope

Load testing. RLS bypass e2e (Phase 07). Multi-company e2e (Phase 07).

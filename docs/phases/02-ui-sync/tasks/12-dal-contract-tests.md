# 12 — DAL contract tests (`customer_detail`)

> **Status:** Complete (2026-06-02). Next: [13-api-routes.md](./13-api-routes.md).

## Goal

Automated tests for get projection, 404-hide, strict patch, and `job_history` read-only behavior.

## Prerequisites

[10-dal-patch.md](./10-dal-patch.md) complete.

## Files

| File | Action |
|------|--------|
| `apps/crm/src/lib/customers/repository.test.ts` | **Create** — get/patch contract tests |
| `apps/crm/src/lib/policy/policy.test.ts` | Extend — `customer_detail` resolve + `customer_ref` on `job_detail` |

## Steps

1. Use `MemoryJobStore` + `seedPilotJobs` (same seed as jobs).
2. Resolve manifest with `surface: 'customer_detail'` for admin; tech uses principal with no binding.
3. **Get / T2:** admin DTO includes granted Fields; tech `get` throws `NotFoundError`.
4. **Strict patch:** `{ profile: { name: "x" }, evil: true }` → `ValidationError`.
5. **`job_history`:** admin DTO includes jobs linked via `customer_id`; patch cannot mutate history Field.
6. **`customer_ref`:** admin `job_detail` get includes `customer_ref` when granted; tech omits it (`not.toHaveProperty`).
7. Re-run full `npm run test`.

## Verify (stop gate)

- [x] `npm run test` — customer + policy contract tests green
- [x] [`../STATUS.md`](../STATUS.md) → **13-api-routes.md**

## Out of scope

HTTP E2E (task **20**), threat file (task **21**), CRM UI (task **16**).

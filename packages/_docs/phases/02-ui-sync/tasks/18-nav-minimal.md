# 18 — Nav: Customers entry (admin only)

> **Status:** Complete (2026-06-02). Next: [20-e2e-customer-detail.md](./20-e2e-customer-detail.md).

## Goal

Enable the Customers route in CRM nav when the principal has `read` on `customer_detail`. Tech nav remains jobs-only.

## Prerequisites

[17-cross-surface-link.md](./17-cross-surface-link.md) complete.

## Files

| File | Action |
|------|--------|
| `apps/crm/src/lib/nav.ts` | Uncomment / wire `customer_detail` catalog entry |
| `apps/crm/src/lib/policy/registry.ts` | Ensure nav `PolicyService` uses same registry as `latch.ts` |

## Steps

1. Read [`../decisions.md`](../decisions.md#decision-no-customer_list-crm-customers-page-shape-2026-06-01) — nav uses **`mode: "detail"`**, not `"list"`.
2. Add catalog entry: `{ href: "/customers", label: "Customers", surfaceId: "customer_detail" }`.
3. Update `surfaceAllowsNav` to resolve with `mode: "detail"` for `customer_detail` (jobs may keep `mode: "list"` until Surface merge).
4. Inject app policy registry into nav's `PolicyService` (today nav uses empty registry — **fix** so jobs + customers nav both resolve correctly).
5. Satisfies CRM [`TASKS.md`](../../../../../apps/crm/docs/TASKS.md) Step A verify: admin nav differs from tech.

## Verify (stop gate)

- [x] Admin login — nav shows Jobs + Customers
- [x] Tech login — nav shows Jobs only
- [x] No Surface ids leak in nav HTML beyond permitted routes
- [x] [`../STATUS.md`](../STATUS.md) → **20-e2e-customer-detail.md**

## Out of scope

`customer_list`, threat T14 (task **21**).

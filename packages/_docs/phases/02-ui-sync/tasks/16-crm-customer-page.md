# 16 — CRM `/customers` page (split shell)

> **Status:** Complete (2026-06-02). Next: [17-cross-surface-link.md](./17-cross-surface-link.md).

## Goal

Minimal customer detail UI at `/customers?id=`: manifest-driven Field cards, read-only vs RHF write, Ant Design only. Left pane empty state until cross-link or manual `?id=` (no `customer_list`).

## Prerequisites

[13-api-routes.md](./13-api-routes.md) complete (DAL + API merged; CRM may call DAL directly in RSC like jobs).

## Files

| File | Action |
|------|--------|
| `apps/crm/src/app/(app)/customers/page.tsx` | **Create** — split view shell |
| `apps/crm/src/components/customers/CustomerDetailPane.tsx` | **Create** — mirror [`JobDetailPane.tsx`](../../../../../apps/crm/src/components/jobs/JobDetailPane.tsx) |
| `apps/crm/src/app/actions/customer-detail.ts` | **Create** — Server Action → `dal.customers.patch` |

## Steps

1. Read [`../../../../apps/crm/docs/LAYOUT.md`](../../../../../apps/crm/docs/LAYOUT.md) and [`../../../../apps/crm/docs/TASKS.md`](../../../../../apps/crm/docs/TASKS.md) Step C timing.
2. Server: `resolveContext({ surfaceId: 'customer_detail', entityId })` when `?id=` present; `dal.customers.get`.
3. Tech / no grant → show Next.js `notFound()` (404 hide).
4. Wrap detail in `CapabilitiesProvider`; one `Card` per Field (`profile`, `billing`, `sites`, `job_history`).
5. **`job_history`:** read-only list/table — no edit controls.
6. Left pane: `Empty` — "Open a customer from a job" (per [`../decisions.md`](../decisions.md)).
7. Save via Server Action with manifest-narrowed Zod parse (prefer DAL in action, not raw fetch to own API).
8. Manual QA ids from task **04**: `seed-customer-acme`, `seed-customer-oak`.

## Verify (stop gate)

- [x] Admin opens `/customers?id=seed-customer-acme` — all granted Fields render
- [x] Tech opens same URL — **404** page (not empty shell with hidden Fields)
- [x] Admin save on `profile` persists after reload
- [x] `job_history` section has no write UI
- [x] [`../STATUS.md`](../STATUS.md) → **17-cross-surface-link.md**

## Out of scope

Customers nav entry (task **18**), job → customer link (task **17**), list Surface, Playwright.

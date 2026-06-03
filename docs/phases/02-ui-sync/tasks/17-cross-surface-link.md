# 17 — Cross-Surface link (job → customer)

> **Status:** Complete (2026-06-02). Next: [18-nav-minimal.md](./18-nav-minimal.md).

## Goal

Job detail pane shows a manifest-gated link to `/customers?id=` when `customer_ref` is in the job DTO and the principal may `read` `customer_detail`.

## Prerequisites

[16-crm-customer-page.md](./16-crm-customer-page.md) complete.

## Files

| File | Action |
|------|--------|
| `apps/crm/src/components/jobs/JobDetailPane.tsx` | **Extend** — `customer_ref` section + link |
| `apps/crm/src/lib/jobs/project.ts` | Confirm `customer_ref` projected when granted (if not already in descriptor) |

## Steps

1. Read [`../decisions.md`](../decisions.md#decision-cross-surface-link-job--customer-2026-06-01).
2. Render link **only when** `customer_ref` key exists on job DTO **and** manifest grants `read` on `customer_detail` (use `<Can>` or equivalent — never a raw `href` from unvalidated data).
3. Link target: `/customers?id={customer_ref.id}`; label from `customer_ref.name`.
4. Tech job detail: no link section in DOM (Field omitted + no Surface grant).
5. Admin: link visible for seeded jobs with `customer_id`.

## Verify (stop gate)

- [x] Admin job detail shows customer name as link; navigation opens customer detail
- [x] Tech job detail — no customer link markup at all
- [x] Forged `/customers?id=` as tech still 404s (task **16** behavior)
- [x] [`../STATUS.md`](../STATUS.md) → **18-nav-minimal.md**

## Out of scope

Nav catalog (task **18**), E2E file (task **20**), threat snapshots (task **21**).

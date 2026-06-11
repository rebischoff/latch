# 13 — REST API routes (`customer_detail`)

> **Status:** Complete (2026-06-02). Next: [16-crm-customer-page.md](./16-crm-customer-page.md).

## Goal

`GET` / `PATCH` `/api/customers/[id]` — orchestration only, DAL-only data path. Prove the second Surface over HTTP with 404-hide for no-grant principals.

## Prerequisites

[12-dal-contract-tests.md](./12-dal-contract-tests.md) complete.

## Files

| File | Action |
|------|--------|
| `apps/crm/src/app/api/customers/[id]/route.ts` | **Create** — `GET`, `PATCH` |
| `apps/crm/src/lib/latch.ts` | `resolveContext({ surfaceId: 'customer_detail', entityId })` |
| `apps/crm/src/lib/api/customer-handler.ts` | Optional — error mapper mirroring jobs pattern if one exists |

## Steps

1. Read [`../../../reference/api-style.md`](../../../reference/api-style.md).
2. **GET** — `resolveContext({ surfaceId: 'customer_detail', entityId: id })`; `dal.customers.get(ctx)`; return `{ data, manifest }`.
3. **PATCH** — re-resolve manifest; parse body with strict writable schema; `dal.customers.patch(ctx, id, body)`; return `{ data, manifest }`.
4. Map `NotFoundError` → **404** (existence hide for tech / unknown id).
5. Map `ValidationError` → **400**; `ForbiddenError` → **403** where applicable.
6. **No** `db.*` imports in route handlers (invariant).
7. Jobs in CRM today use RSC + Server Actions without REST — this task adds the **customer** HTTP surface for stack-level proof and future external clients. Do not backfill jobs REST unless explicitly scheduled.

## Verify (stop gate)

- [x] `curl` GET as admin — JSON includes `profile`, `billing`, `sites`, `job_history` when granted
- [x] `curl` GET as tech — **404** (not 403)
- [x] `curl` PATCH as admin with valid body — persists; reload matches
- [x] PATCH with unknown key — **400**, no store change
- [x] [`../STATUS.md`](../STATUS.md) → **16-crm-customer-page.md**

## Out of scope

CRM split-view page (task **16**), cross-link UI (task **17**), Playwright.

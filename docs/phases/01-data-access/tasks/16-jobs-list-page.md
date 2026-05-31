# 16 — `/jobs` list page (minimal)

## Goal

Minimal list UI at `/jobs`: manifest-driven columns, row link to `/jobs/[id]`, optional bulk selection hook for admin (can be API-only + E2E if UI deferred).

## Prerequisites

[13-api-routes.md](./13-api-routes.md) complete.

## Files

| File | Action |
|------|--------|
| `apps/web/src/app/jobs/page.tsx` | **Create** — Server Component list |
| `apps/web/src/app/page.tsx` | Link to `/jobs` if not present |
| `apps/web/src/app/jobs/jobs-list-table.tsx` | Optional client table for bulk selection |

## Steps

1. Server: `resolveContext({ surfaceId: 'job_list' })`; fetch via DAL or internal GET (prefer DAL directly in RSC — no raw DB).
2. Render columns from manifest Fields with `read` (hide forbidden columns — UI mirror only).
3. Each row links to `/jobs/[id]` (detail uses `job_detail` scope).
4. **Minimal v1:** read-only table acceptable; bulk can be proven in task **20** via DAL/API without polished bulk UI.
5. If bulk UI included: admin multi-select + PATCH to `/api/jobs:bulk` with `mode: partial` (REST, not required to use Server Action).

## Verify (stop gate)

- [ ] Tech opens `/jobs` — sees assigned jobs only; no financial column
- [ ] Admin opens `/jobs` — sees financial column when granted
- [ ] Row link navigates to detail page
- [ ] [`../STATUS.md`](../STATUS.md) → **20-e2e-job-list.md**

## Out of scope

Polished CRM UX (Phase 02), `customer_detail`, Playwright browser tests.

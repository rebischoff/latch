# 10 — Pending HTTP API

> **Status:** Complete (2026-06-03). Next: [11-crm-job-detail-ui.md](./11-crm-job-detail-ui.md).

## Goal

Expose reviewer/submitter operations via REST (re-resolve manifest per request):

- `GET /api/pending` — requires `surface` + `entity_id` in v1 (per-entity, not cross-entity); filter `status`
- `POST /api/pending/:id/accept`
- `POST /api/pending/:id/reject` — body optional `{ comment }`
- `POST /api/pending/:id/withdraw` — submitter only

> See **Context-resolution gap** below — pending id must be looked up to a surface + entity before a manifest can be resolved.

## Prerequisites

- [08-accept-reject-withdraw.md](./08-accept-reject-withdraw.md) complete.

## Context-resolution gap (read first)

`resolveContext` in [`latch.ts`](../../../../../apps/crm/src/lib/latch.ts) is a **closed union keyed by surface + entity**, and `acceptPending` lives **only on `jobsDal`** — there is no generic surface→DAL registry. A `/api/pending/:id/*` route only has the pending id, so it cannot resolve a manifest directly. Resolve this one of two ways (pick in this task):

- **A (recommended v1):** **Scope the pending API to `job_detail`** — hardcode the surface like the existing `customers` / `iam` routes. Flow per request: (1) `getJobsDal()` lookup pending by id → `{ surface_id, entity_id }`; (2) assert `surface_id === "job_detail"` else 404; (3) `resolveContext({ surfaceId: "job_detail", entityId })`; (4) dispatch to `jobsDal.acceptPending` / `rejectPending` / `withdrawPending`.
- **B (generic):** add a `resolvePendingContext(pendingId)` helper + a `surface_id → { dal, resolveContext }` map. More work; only if a second gated Surface lands this phase (none planned).

**`GET /api/pending`** does not fit a *detail* context (which needs `entityId`). For v1, list **per entity** (`?surface=job_detail&entity_id=…&status=submitted`) and resolve `job_detail` context for that entity; cross-entity inbox is deferred.

## Files

| File | Action |
|------|--------|
| `apps/crm/src/app/api/pending/` | Route handlers; DAL only (no raw SQL) |
| `apps/crm/src/lib/latch.ts` | Expose pending lookup (`getPendingById`) + optional `resolvePendingContext` helper |
| `apps/crm/src/lib/jobs/repository.ts` | Surface a pending read accessor if the store isn't otherwise reachable from routes |
| [`apps/crm/docs/`](../../../../../apps/crm/docs) | API sketch update if present |

> The pending store is currently created in `latch.ts` and handed to `createJobsDal` but **not exposed**. The lookup-before-resolve flow needs a read accessor (`getById` / `getPendingForEntity`) reachable from the route — add one.

## Steps

1. Implement option **A** (or **B**) from the gap section; reuse Phase 03 route pattern (`withIamApiHandler`-style wrapper, `requireSession`).
2. Look up pending **before** resolving context; 404 hide for pending not visible to principal (align S4).
3. 409 for terminal / duplicate submit conflicts.

## Verify (stop gate)

- [x] curl/integration test: list submitted; accept/reject/withdraw
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `11-crm-job-detail-ui.md`

## Out of scope

Global inbox page. Other Surfaces beyond jobs pilot.

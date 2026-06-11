# 09 — Bulk update → per-row pending + `batch_id`

> **Status:** Complete (2026-06-03). Next: [10-api-routes.md](./10-api-routes.md).

## Goal

When `bulkUpdate` patch touches verification Fields, create **one pending row per id** with shared **`batch_id`**; live non-gated keys in patch still follow bulk rules per [bulk-operations.md](../../../../dal/docs/bulk-operations.md).

## Prerequisites

- [08-accept-reject-withdraw.md](./08-accept-reject-withdraw.md) complete.

## Blocker — bulk pending is untestable under current policies (resolve first)

Gating routes to pending only when the manifest has **`submit` ∧ ¬`write`** on the Field. On **`job_list`**, `financial_terms` is **read-only for every role** ([`apps/crm/src/lib/policy/job-list.ts`](../../../../../apps/crm/src/lib/policy/job-list.ts) grants only `read`), so **no principal can trigger bulk pending today**. Before the verify gate can pass, choose:

- **A:** Add `submit` on `financial_terms` to a role at **list scope** (`job-list.ts` + regenerate) so bulk pending is exercisable. Smallest change; keep `office_admin` with `write` (direct) and give a non-writing role `submit`.
- **B:** Re-confirm choice **(8)** and **defer bulk pending** out of Phase 05 DoD (move to an early Phase 06 task), since financials are list-read-only in the pilot.

### Decision: bulk pending policy blocker (2026-06-03)

**Choice:** **A** — `field_tech` gets `submit` on `financial_terms` at **`job_list`** scope (`job-list.ts`); `office_admin` keeps list `read` only (direct write stays on `job_detail`).

**Rationale:** Smallest change to make bulk pending exercisable in CI without deferring Phase 05 DoD.

Pick A or B here and record it; if B, also update [`README.md`](../README.md) DoD and [`decisions.md`](../decisions.md).

## Signature change

`bulkUpdate(descriptor, store, ctx, ids, patch, opts)` in [`packages/dal/src/bulk.ts`](../../../../dal/src/bulk.ts) takes **no** `pendingStore` today. Thread it through `bulkUpdate` (and the `createSurfaceDal` bulk wiring) the same way single-record `patch` receives it.

## Files

| File | Action |
|------|--------|
| `packages/dal/src/bulk.ts` | Accept `pendingStore`; pending branch for gated field ids |
| `packages/dal/src/create-surface-dal.ts` | Pass `pendingStore` into bulk |
| `apps/crm/src/lib/policy/job-list.ts` | Option A: add `submit` grant (then regenerate) |
| `apps/crm/src/lib/jobs/repository.test.ts` | Bulk financial → N pending, same `batch_id` |
| `tests/job-list.e2e.test.ts` or threat | Optional bulk pending coverage |

## Steps

1. Resolve the blocker (A or B) above.
2. Thread `pendingStore` into `bulk.ts`.
3. Generate `batch_id` (UUID) per bulk request when any row routes to pending.
4. Per-row: skip live update for gated slice; `submit` pending with `batch_id`.
5. Define the **one-open-`submitted`-per-entity** interaction inside a batch: an id with an existing open pending → report as a per-row skip (`reason: forbidden_row`/`not_found` per [`bulk-operations.md`](../../../../dal/docs/bulk-operations.md) semantics), not a whole-batch 409.
6. Reviewer accepts/rejects per row independently (v1).

## Verify (stop gate)

- [x] Blocker resolved (A applied, or B deferral recorded in README + decisions)
- [x] Bulk patch on `financial_terms` for 2+ jobs → 2+ pending rows, one `batch_id`
- [x] Live row unchanged until per-row accept
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `10-api-routes.md`

## Out of scope

Bulk accept-all (deferred). UI for bulk review.

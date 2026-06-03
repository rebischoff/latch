# 09 — DAL get (`dal.customers.get`)

> **Status:** Complete (2026-06-02). Next: [10-dal-patch.md](./10-dal-patch.md).

## Goal

Single-record read for `customer_detail`: manifest projection, forbidden Field omission, row scope (`all` for admin), 404-hide for principals with no Surface grant.

## Prerequisites

[08-codegen.md](./08-codegen.md) complete.

## Files

| File | Action |
|------|--------|
| `apps/crm/src/lib/customers/descriptors.ts` | `customerDetailDescriptor` — `SurfaceDescriptor` for anchor `customers` |
| `apps/crm/src/lib/customers/project.ts` | `projectCustomerRow` — DTO keyed by Field id |
| `apps/crm/src/lib/customers/repository.ts` | `createCustomersDal` wrapping `createSurfaceDal` |
| `apps/crm/src/lib/latch.ts` | Export `getCustomersDal`; extend `resolveContext` for `customer_detail` |
| `apps/crm/db/memory-store.ts` | Store methods for customer/sites/jobs-by-customer if not already present |
| [`../decisions.md`](../decisions.md) | Lock deferred `job_history` source (see Steps) |

## Steps

1. Require `PermissionContext` with `ctx.surface === 'customer_detail'` and matching manifest.
2. **No grant / forbidden Surface:** map to `NotFoundError` (404 hide) — not `ForbiddenError` — per `forbiddenFieldResponse: 404`.
3. Load customer by id; missing row → `NotFoundError`.
4. **Projection:** include only Fields with `read` in manifest; omit forbidden keys entirely (T2).
5. **`sites`:** nested array of `{ label }` (or generated shape) for child rows where `customer_id` matches.
6. **`job_history`:** DAL join query against store jobs filtered by `customer_id` — **lock here** (not a DB view). Return `{ id, title, status }[]`; Field has no `write` in policy.
7. **`billing`:** high-sensitivity Field — same omission rules as `financial_terms` on jobs.
8. Wire descriptor into `createSurfaceDal`; no `db.*` outside DAL wiring in `apps/crm/src/lib/customers/`.

### Decision: `job_history` data source (lock in this task)

**Choice:** DAL join query in the consumer store (`MemoryJobStore.listJobsByCustomerId` or equivalent), not a Postgres view.

**Rationale:** Memory store is the primary test harness; a view adds DDL without new package signal. Postgres adapter can use the same query shape later.

## Verify (stop gate)

- [x] Admin `get` returns all four Fields when granted
- [x] Tech (no Surface binding) → `NotFoundError` / 404 semantics
- [x] DTO omits Fields without `read` (property absence, not `null`)
- [x] `job_history` returns related jobs for seed customer ids
- [x] Decision block for `job_history` source added to [`../decisions.md`](../decisions.md) Deferred section (checked off)
- [x] [`../STATUS.md`](../STATUS.md) → **10-dal-patch.md**

## Out of scope

`patch`, HTTP routes, CRM UI, customer delete.

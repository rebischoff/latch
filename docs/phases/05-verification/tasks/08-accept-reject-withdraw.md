# 08 — Accept, reject, withdraw + audit

> **Status:** Complete (2026-06-03). Next: [09-bulk-pending.md](./09-bulk-pending.md).

## Goal

Add **`rejectPending`** and **`withdrawPending`** on surface DAL; **always** audit `reject`; document withdraw audit choice; apply accept (resolve pending + row update + `approve` audit) as an **ordered unit with defined failure semantics**.

## Atomicity reality (read first)

The jobs pilot uses `MemoryJobStore` and a **separate** global audit writer (`writeAudit`), so a row update and an audit insert **cannot** share a real DB transaction in v1. Do **not** claim atomicity. Instead:

- Define the order: (1) re-check authz, (2) `resolve(accepted)` pending, (3) apply live patch, (4) `writeAudit(approve)`.
- Define failure behavior: if a later step throws, the earlier ones are **not** rolled back automatically — document the chosen ordering so a failure leaves the most recoverable state (recommend audit **last**, after the live write succeeds).
- True transactional accept is **deferred** to when the business store is Postgres-backed; note this in the task and in [`../../../reference/approval-trails.md`](../../../reference/approval-trails.md). When `createPostgresPendingStore` + a Postgres business store both exist, wrap steps 2–4 in one `BEGIN/COMMIT`.

## Prerequisites

- [06-dal-pending-routing.md](./06-dal-pending-routing.md) complete.
- [07-postgres-pending-store.md](./07-postgres-pending-store.md) complete.

## Files

| File | Action |
|------|--------|
| `packages/dal/src/create-surface-dal.ts` | `rejectPending`, `withdrawPending` |
| `apps/crm/src/lib/jobs/repository.ts` | Expose methods on `JobsDal` |
| `apps/crm/src/lib/jobs/repository.test.ts` | Reject leaves live row; withdraw; reject audit row |
| [`../../../reference/audit-and-lifecycle.md`](../../../reference/audit-and-lifecycle.md) | Withdraw audit behavior |

## Steps

1. **Reject:** `approve` on all `field_ids`; `resolve(rejected)`; `writeAudit({ action: 'reject', approvalId?, fieldIds, patch })`; optional `comment`. No live write.
2. **Withdraw:** only `submitted_by` (or `submit` on Fields); `resolve(withdrawn)`. **Withdraw audit choice:** `AuditAction` has no `withdraw`; v1 — **skip the audit row** (pending row is the trail) **or** emit `reject` with `comment` prefix `withdraw:`. Pick one here and document; adding a `withdraw` action type is out of scope.
3. **Accept:** apply the ordered unit from **Atomicity reality** above; audit **last**.

## Verify (stop gate)

- [x] Reject: live `contract_amount` unchanged; audit `reject` present
- [x] Withdraw: pending terminal; second submit allowed after withdraw (new row)
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `09-bulk-pending.md`

## Out of scope

HTTP routes (task **10**). UI (task **11**).

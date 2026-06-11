# 10 — DAL patch (`dal.customers.patch`)

> **Status:** Complete (2026-06-02). Next: [12-dal-contract-tests.md](./12-dal-contract-tests.md).

## Goal

Strict writable PATCH for `customer_detail`: manifest-narrowed Zod, re-authorize on mutate, audit on success.

## Prerequisites

[09-dal-get.md](./09-dal-get.md) complete.

## Files

| File | Action |
|------|--------|
| `apps/crm/src/lib/customers/apply-patch.ts` | Apply patch to customer row + sites child rows |
| `apps/crm/src/lib/customers/descriptors.ts` | Wire `applyPatch`, `patchSchema`, audit field id |
| `apps/crm/src/lib/customers/repository.ts` | Expose `patch` on `CustomersDal` |
| `apps/crm/src/lib/customers/schemas.ts` | Import/narrow generated `CustomerDetailPatchSchema` |

## Steps

1. Require `PermissionContext` with `customer_detail` manifest including `write` on target Fields.
2. Validate body with manifest-narrowed **strict** Zod (T1). Unknown keys → `ValidationError`.
3. No grant on Surface → `NotFoundError` (404 hide), same as `get`.
4. Writable Fields this phase: `profile`, `billing`, `sites` — not `job_history`.
5. **`sites`:** replace-or-merge child rows per generated patch shape (mirror assignments pattern on jobs where practical).
6. `writeAudit` on successful mutate (`action: update`); include changed Field ids.
7. Return projected DTO (post-patch) using same projection as `get`.

## Verify (stop gate)

- [x] Admin patch on `profile` persists; reload via `get` shows new values
- [x] Patch with unknown key → `ValidationError`; no DB/store change
- [x] Tech patch attempt → `NotFoundError` (no existence leak)
- [x] Patch targeting `job_history` in body → rejected (not writable)
- [x] Audit row written on successful admin patch
- [x] [`../STATUS.md`](../STATUS.md) → **12-dal-contract-tests.md**

## Out of scope

HTTP routes, CRM UI, customer delete, approval/pending (Phase 05).

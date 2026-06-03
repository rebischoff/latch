# 08 — Codegen for `customer_detail` + `customer_ref`

> **Status:** Complete (2026-06-02). Next: [09-dal-get.md](./09-dal-get.md).

## Goal

Regenerate committed TS for both Surfaces; register `customer_detail` in the app policy registry; `npm run codegen:check` green.

## Prerequisites

[07-policies-yaml.md](./07-policies-yaml.md) complete.

## Files

| File | Action |
|------|--------|
| `apps/crm/modules/customer/generated/customer_detail.schema.generated.ts` | **Commit** generated output |
| `apps/crm/modules/job/generated/job_detail.schema.generated.ts` | **Regenerate** (includes `customer_ref`) |
| `apps/crm/src/lib/policy/registry.ts` | Register `customer_detail` policy module |
| `apps/crm/src/lib/policy/customer-detail.ts` | Finalize field ids from generated `CustomerDetailFieldIds` |
| `packages/codegen/src/generate.ts` | Extend only if new column/join shapes need `COLUMN_ZOD` support |

## Steps

1. Run `npm run codegen` — emit:
   - `CustomerDetailFieldIds`, column map, read/patch Zod schemas for `customer_detail`
   - Updated `JobDetailFieldIds` / schemas including `customer_ref`
2. Headers: `DO NOT EDIT — generated from *.surface.yaml`.
3. Register `defineSurfacePolicy(customerDetailPolicies, …)` in `jobPolicyRegistry` (consider renaming to `appPolicyRegistry` only if the diff stays small).
4. Run `npm run codegen:check` (T11).
5. Commit all `generated/` artifacts; no hand-edits under `generated/`.

## Verify (stop gate)

- [x] `npm run codegen:check` passes
- [x] Generated files reference `customer_detail` and updated `job_detail` field ids
- [x] Policy registry resolves `customer_detail` for `office_admin`; `field_tech` gets not-found / no binding per policy tests
- [x] [`../STATUS.md`](../STATUS.md) → **09-dal-get.md**

## Out of scope

DAL implementation, HTTP routes, CRM UI.

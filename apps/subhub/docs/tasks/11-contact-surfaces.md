# 11 — Contact surfaces

> **Status:** Complete (2026-06-13). Next: [12-contact-dal-api.md](./12-contact-dal-api.md).

## Goal

Surface YAML for contacts and subset lists; codegen + registry.

## Prerequisites

[10-party-migration.md](./10-party-migration.md) complete.

## Files

| File | Action |
|------|--------|
| `modules/contact/contact_list.surface.yaml` | **Create** |
| `modules/contact/contact_detail.surface.yaml` | **Create** — include `phones`, `emails` logical fields |
| `modules/contact/customer_list.surface.yaml` | **Create** — same anchor, filtered |
| `modules/contact/vendor_list.surface.yaml` | **Create** |
| `modules/contact/manufacturer_list.surface.yaml` | **Create** |
| `modules/employee/employee_list.surface.yaml` | **Create** |
| `modules/employee/employee_detail.surface.yaml` | **Create** |
| `lib/policy-registry.ts` | Register defs |

## Steps

1. `anchorTable: party` for contact surfaces; `employee` for employee detail.
2. Logical collection fields: `columns: []` with comment pointing to [child-collections.md](../child-collections.md).
3. Run codegen; fix any migration cross-check mismatches.
4. Omit `created_at` / `updated_at` / `created_by` from Surface Fields unless product requires manifest-gated display ([decisions.md](../decisions.md#decision-row-timestamps-vs-audit--ddl-vs-surface-fields-2026-06-13)).
5. Log **L1/L2** in latch-feedback if glue stubs missing.

## Verify (stop gate)

- [x] `npm run codegen:check -w @latch/subhub` passes
- [x] All contact/employee defs in registry
- [x] [`../../STATUS.md`](../../STATUS.md) → [12-contact-dal-api.md](./12-contact-dal-api.md)

## Out of scope

- Hand-written repository (task **12**)
- Child collection patch logic (task **14**)

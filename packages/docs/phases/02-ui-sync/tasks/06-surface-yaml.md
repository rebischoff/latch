# 06 — `customer_detail.surface.yaml` + `customer_ref` on `job_detail`

> **Status:** Complete (2026-06-02). Next: [07-policies-yaml.md](./07-policies-yaml.md).

## Goal

Author Surface metadata for the second Surface and extend the pilot `job_detail` Surface with a cross-link Field. Metadata only — no policies or codegen in this task.

## Prerequisites

- [04-db-schema.md](./04-db-schema.md) complete (verify gate passed).
- Locked Field sketch in [`../decisions.md`](../decisions.md#decision-customer_detail-surface-sketch-2026-06-01).

## Files

| File | Action |
|------|--------|
| `apps/crm/modules/customer/customer_detail.surface.yaml` | **Create** |
| `apps/crm/modules/job/job_detail.surface.yaml` | **Extend** — add `customer_ref` Field |

## Steps

1. Read [`../../../reference/metadata-and-codegen.md`](../../../reference/metadata-and-codegen.md).
2. **Create** `customer_detail` structure:
   - `id: customer_detail`, `displayName: Customer detail`, `anchorTable: customers`
   - `tables`: `customers`, `sites`, `jobs`
   - Fields (locked in task 00):
     - `profile` → `customers.name`, `customers.phone`
     - `billing` → `customers.billing_notes` (`sensitivity: high`)
     - `sites` → `sites.label` (child rows for this customer)
     - `job_history` → `jobs.id`, `jobs.title`, `jobs.status` (read-only related data; DAL filters by `customer_id`)
3. **Extend** `job_detail.surface.yaml`:
   - Add `customer_ref` Field → `customers.id`, `customers.name` (stable id + display label for cross-Surface link)
4. List `tables` on `job_detail` already includes `customers` — confirm after edit.

## Verify (stop gate)

- [x] YAML parses; `customer_detail` `id` is `customer_detail`
- [x] All Field ids are `snake_case` on both Surfaces
- [x] `job_detail` includes `customer_ref` with `customers.id` and `customers.name`
- [x] No hand-written files in `generated/` for `customer_detail` or updated `job_detail` yet
- [x] [`../STATUS.md`](../STATUS.md) → **07-policies-yaml.md**

## Out of scope

Policies, codegen run, DAL, API, CRM UI.

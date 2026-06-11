# 06 — `job_list.surface.yaml`

## Goal

Author Surface metadata for the list: Fields, columns, anchor table, display joins.

## Prerequisites

[01-task-index.md](./01-task-index.md) complete. Locked Field sketch in [00-decisions.md](./00-decisions.md).

## Files

| File | Action |
|------|--------|
| `apps/crm/modules/job/job_list.surface.yaml` | **Create** |

## Steps

1. Read [`../../../reference/metadata-and-codegen.md`](../../../../codegen/docs/reference/metadata-and-codegen.md).
2. Set `id: job_list`, `displayName: Job list`, `anchorTable: jobs`.
3. Define Fields (locked in task 00 / [phase README](../README.md)):
   - `summary` → `jobs.id`, `jobs.title`, `jobs.status`, `jobs.scheduled_at`
   - `customer_site` → join columns for customer name + site label (display-only)
   - `financial_terms` → `jobs.contract_amount` (`sensitivity: high`)
   - `assignments` → `[]` (join table; DAL handles bulk reassign)
4. List `tables`: `jobs`, `customers`, `sites`, `assignments` (same anchor set as `job_detail`).

## Verify (stop gate)

- [x] YAML parses; `id` is `job_list`
- [x] All Field ids are `snake_case`
- [x] No hand-written files in `generated/` for `job_list` yet
- [x] [`../STATUS.md`](../STATUS.md) → **07-policies-yaml.md**

## Out of scope

Policies, codegen run.

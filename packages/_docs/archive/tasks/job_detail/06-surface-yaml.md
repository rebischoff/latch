# 06 — `job_detail.surface.yaml`

## Goal

Author Surface metadata for the pilot: Fields, columns, anchor table.

## Prerequisites

[05-audit-skeleton.md](./05-audit-skeleton.md) complete.

## Files

| File | Action |
|------|--------|
| `apps/web/modules/job/job_detail.surface.yaml` | **Create** |

## Steps

1. Read [`../../architecture/metadata-and-codegen.md`](../../../../codegen/docs/reference/metadata-and-codegen.md).
2. Set `id: job_detail`, `anchorTable: jobs`.
3. Define Fields (minimum for S1):
   - `summary` → `jobs.title`, `jobs.status`, `jobs.scheduled_at`
   - `scope` → `jobs.description`
   - `financial_terms` → `jobs.contract_amount` (`sensitivity: high`)
   - `assignments` → `[]` (join table; DAL handles)
4. List `tables`: jobs, customers, sites, assignments.

## Verify (stop gate)

- [x] YAML parses; `id` is `job_detail`
- [x] All Field ids are `snake_case`
- [x] No hand-written files in `generated/` yet
- [x] `STATUS.md` → **07-policies-yaml.md**

## Out of scope

Policies, codegen run.

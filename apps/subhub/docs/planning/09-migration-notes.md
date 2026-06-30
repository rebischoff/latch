# Migration and DBML notes (D3)

> **Status:** Planning (2026-06-27). **DBML-first** — update [`schema/current.dbml`](../schema/current.dbml) before numbered migrations.
>
> **Task chain:** [29-backbone-dbml-pass](../tasks/29-backbone-dbml-pass.md) ✅ → [30-surfaces-review](../tasks/30-backbone-surfaces-review.md) ✅ → [31-estimate-migrations](../tasks/31-estimate-backbone-migrations.md) ✅ → [32-estimate-4e](../tasks/32-estimate-wave-4e.md) ✅

## Recommended order

1. Planning docs locked (this folder) — **task 29 step 1** ✅
2. Amend `current.dbml` — site, estimate, job, catalog, procurement, billing table groups — **task 29 step 2** ✅
3. `codegen --check` / review Surfaces impact — **task 30** ✅
4. Numbered migrations — **additive** where possible; one breaking migration for site rename if slice 2 geography already shipped — **task 31** (estimate-scoped; seeds discussed per table). **Plan:** [`migrations/estimate-backbone-plan.md`](../migrations/estimate-backbone-plan.md) (step 1 ✅).
5. Estimate DAL/UI on backbone — **task 32** ✅

## Site: section/location → area/asset (S1)

| Old | New |
|-----|-----|
| `site_section` | `site_area` |
| `site_location` | `site_asset` (semantic shift — asset is device, not spot) |

**Caution:** Legacy `site_location` = work **spot**; new `site_asset` = **device**. Spots → `site_area`; devices → `site_asset` or split manually.

Add `site_system` (`site_id`, `system_id`). Backfill optional default system (S2).

New FKs on lines: `site_area_id`, `site_asset_id` replace `site_location_id`.

## New tables (summary)

| Table | Slice |
|-------|-------|
| `site_system` | Site — `site_id`, `system_id`, … |
| `site_area` | Replaces section |
| `site_asset` | Replaces location semantics |
| **`system`** | Catalog — `id`, `name`, `default_phase_template_id` |
| `trade` | Catalog |
| `system_spec_def` | Catalog — UUID PK per spec dimension |
| `system_spec_option` | Catalog — enum values |
| `manufacturer_part_spec` | Catalog — part ↔ spec def + option |
| **`estimate_system`** | Estimate — tab/block per system |
| `estimate_system_spec` | Estimate — defaults per tab |
| `estimate_area_spec` | Estimate — per-area override |
| `estimate_line_spec` | Estimate — per-line override |
| `phase_template`, `phase_template_step` | Catalog |
| `job_scope_group` | Job |
| `scope_phase` | Job |
| `progress_entry`, `progress_entry_line` | Job |
| `job_system_spec`, `job_area_spec`, `job_line_spec` | Job — snapshots on win |
| `vendor_part.lead_time_days` | Procurement |

`job_as_built_change` — **deferred v1.5** (A2).

## Drop / deprecate

| Table | When |
|-------|------|
| `job_work_item` | **Dropped** — J1 locked; never migrate |
| `estimate_section` | Omit from v1 migrations |
| Org `phase` on new lines | Bridge to `phase_template_step` |

## Estimate lines DDL

Flat `estimate_line`; add `estimate_system_id`, `site_area_id`, `site_asset_id`, `material_status`. Remove/defer `estimate_section_id`.

## Job lines DDL

`job_line` add `job_scope_group_id`, `site_area_id`, `site_asset_id`.

## SOV allocation

Add nullable `job_scope_group_id`, `scope_phase_id`.

## Related

- [08-supersedes.md](./08-supersedes.md)
- [07-open-decisions.md](./07-open-decisions.md)

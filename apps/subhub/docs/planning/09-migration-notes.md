# Migration and DBML notes (D3)

> **Status:** Planning (2026-06-27). **DBML-first** — update [`schema/current.dbml`](../schema/current.dbml) before numbered migrations ([`decisions/general.md`](../decisions/general.md) schema-first).

## Recommended order

1. Planning docs locked (this folder)
2. Amend `current.dbml` — site, estimate, job, catalog, procurement, billing table groups
3. `codegen --check` / review Surfaces impact
4. Numbered migrations — **additive** where possible; one breaking migration for site rename if slice 2 geography already shipped

## Site: section/location → area/asset (S1)

| Old | New |
|-----|-----|
| `site_section` | `site_area` |
| `site_location` | `site_asset` (semantic shift — asset is device, not spot) |

**Caution:** Existing `site_location` = work **spot**; new `site_asset` = **device**. Migration cannot be pure rename:

| Legacy `site_location` | Migration strategy |
|------------------------|-------------------|
| Spot labels (Rm 345) | → `site_area` rows |
| Device-like labels | → `site_asset` OR area + asset split (manual data fix) |

Add `site_system` (nullable). Backfill: one default system per site **or** leave `site_system_id` null on areas (S2).

New FKs on lines: `site_area_id`, `site_asset_id` replace `site_location_id`.

## New tables (summary)

| Table | Slice |
|-------|-------|
| `site_system` | Site wave amend |
| `site_area` | Replaces section |
| `site_asset` | Replaces location semantics |
| `system_type`, `trade` | Catalog |
| `system_assumption_def`, `system_assumption_option` | Catalog |
| `estimate_system_assumption` | Estimate |
| `phase_template`, `phase_template_step` | Catalog |
| `job_scope_group` | Job |
| `scope_phase` | Job |
| `progress_entry`, `progress_entry_line` | Job |
| `job_as_built_change` | Job | **Deferred v1.5** (A2) |
| `job_system_assumption` | Job |
| `vendor_part.lead_time_days` | Catalog/procurement |

## Drop / deprecate (after bridge)

| Table | When |
|-------|------|
| `job_work_item` | **Dropped** — J1 locked 2026-06-27; never migrate |
| `estimate_section` | Omit from v1 migrations or leave unused |
| Org `phase` on new lines | Bridge to `phase_template_step` |

## Estimate lines DDL shape

Keep flat `estimate_line`; add:

- `site_area_id`, `site_asset_id`, `site_system_id`
- `material_status`
- Remove or defer `estimate_section_id`

## Job lines DDL shape

`job_line` add:

- `job_scope_group_id`
- `site_area_id`, `site_asset_id` (replace `site_location_id`)

## SOV allocation

Add nullable `job_scope_group_id`, `scope_phase_id`.

## Surfaces / waves

| Wave | Scope |
|------|-------|
| Site amend | `site_detail` — systems, areas, assets |
| Catalog amend | assumptions, tags, phase templates, `vendor_part.lead_time_days` |
| Estimate amend | assumptions header, area grouping, no sections |
| Job amend | scope groups, phases, progress, as-built |
| Procurement amend | ready-to-order pool |
| Billing amend | SOV allocation FKs, billable from phases |

## CI

`npm run codegen --check` after DBML + YAML Surface updates.

## Related

- [08-supersedes.md](./08-supersedes.md)
- [07-open-decisions.md](./07-open-decisions.md)

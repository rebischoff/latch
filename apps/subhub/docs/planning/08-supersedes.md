# Supersedes index (D1)

> **Status:** Planning (2026-06-27). When implementing, add **superseded** notes to the source decision files and dated **Decision** blocks pointing here.

## Catalog / scope (2026-06-30)

| Prior decision | File | Disposition |
|----------------|------|-------------|
| C2 catalog **`system`** + `system_spec_def.system_id` | [catalog.md](../decisions/catalog.md) | **Superseded** — **`category` roots** + `spec_def.root_category_id` ([11-categories-scope-model.md](./11-categories-scope-model.md)) |
| `site_system` / `site_area` | site.md | **Superseded (DDL)** — **`site_scope` / `site_zone`** (migration 033) |
| `estimate_system` + 4c′ `estimate_area` snapshots | estimate.md, [02-estimates.md](./02-estimates.md) | **Superseded** — **`estimate_scope`** + live site checkbox tree |

## Site geography

| Prior decision | File | Disposition |
|----------------|------|-------------|
| address vs site geography — `site_section` / `site_location` | [site.md](../decisions/site.md) | **Amended** — replaced by `site_area` / `site_asset` under optional `site_system` |
| section vs location — granularity | site.md | **Amended** — area tree + asset leaf per system |
| site-owned sections and locations — lifecycle | site.md | **Amended** — same lifecycle on area/asset |
| installed systems — deferred | site.md | **Superseded** — `site_system` in v1 plan |
| estimate / job line grouping — `site_location_id` | [estimate.md](../decisions/estimate.md), site.md | **Amended** — `site_area_id` / `site_asset_id` |

## Estimates

| Prior decision | File | Disposition |
|----------------|------|-------------|
| `estimate_section` commercial grouping | estimate.md, catalog.md | **Deferred v1** — subtotal by area/asset |
| estimate wave 4 — `quote_sections` defer | estimate.md | **Aligned** — remains deferred |

## Jobs / field

| Prior decision | File | Disposition |
|----------------|------|-------------|
| field status — `job_work_item` | [job.md](../decisions/job.md) | **Superseded** 2026-06-27 — scope phase + progress entries |
| job complete publishes `proposed` locations | job.md, site.md | **Amended** — v1 publish on `complete`; staging table v1.5 |

## Billing

| Prior decision | File | Disposition |
|----------------|------|-------------|
| billing — `qty_installed` from `job_work_item` | [billing.md](../decisions/billing.md) | **To amend** when scope phase rollups ship |
| `sov_allocation` → `job_line` + `phase_id` | billing.md | **Extended** — add scope group + `scope_phase_id` |

## Unchanged (still active)

| Decision | File |
|----------|------|
| procurement — requisition → PO chain | procurement.md |
| change orders — unified `job_line` ledger | job.md |
| engagements — `job_kind` | job.md |
| `job_detail` tabbed layout | job.md |
| SOV UI on Billing tab | billing.md |
| no platform approval workflow | general.md |
| catalog — parts, items, UOM on part | catalog.md |

## New decision files / blocks to add when locked

- `site.md` — site as-built system/area/asset (2026-06-27)
- `estimate.md` — per-system assumptions; no section v1
- `job.md` — scope group / scope phase / progress entries
- `catalog.md` — system assumptions, part tags, phase templates
- `procurement.md` — lead_time on vendor_part

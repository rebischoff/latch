# 31 — Estimate backbone migrations (DDL + dev seeds)

> **Status:** Complete (2026-06-29). Next: [32-estimate-wave-4e.md](./32-estimate-wave-4e.md).
>
> **Planning:** [`planning/09-migration-notes.md`](../planning/09-migration-notes.md) step 4 (estimate-scoped) · **Schema:** [`current.dbml`](../schema/current.dbml)

## Goal

Ship **numbered SQL** so task [32](./32-estimate-wave-4e.md) can implement estimates on the backbone model. **Estimate-minimal scope** — job/procurement/billing backbone tables may land in the same batch or follow-on migration; **dev seeds** added per table with discussion (not silent bulk fixtures).

## Prerequisites

- Task [30](./30-backbone-surfaces-review.md) complete.
- Shipped baseline: `019_site.sql` (`site_section` / `site_location`), `021_estimate.sql`, `023_job.sql` — expect **one breaking migration** for site geography rename.

## Estimate-minimal DDL scope

### Must ship (blocks task 32)

| Change | Notes |
|--------|-------|
| **Site geography rename** | `site_section` → `site_area`, `site_location` → `site_asset`; add `site_system` |
| **Catalog minimum** | `system` table + **dev seed** (FA, Access, CCTV, … — discuss rows) |
| **Estimate** | `estimate_system`, `estimate_system_spec`, `estimate_area_spec`, `estimate_line_spec` |
| **`estimate_line`** | Add `estimate_system_id`, `site_area_id`, `site_asset_id`, `material_status`; drop `estimate_section_id` FK |
| **Data migration** | Map legacy `site_location_id` → `site_area_id` where possible; discuss device vs spot split |

### May ship in same batch (additive, no Surface yet)

| Change | Notes |
|--------|-------|
| Catalog specs | `system_spec_def`, `system_spec_option`, `manufacturer_part_spec` + optional seed |
| Phase templates | `phase_template`, `phase_template_step` + org default seed |
| Job backbone | `job_scope_group`, `scope_phase`, … — **DDL only** if bundled; no 5c UI |
| `vendor_part.lead_time_days` | Additive column |

### Explicitly omit

| Item | Reason |
|------|--------|
| `estimate_section` | Not v1 — [E2 locked](../planning/07-open-decisions.md) |
| `job_work_item` | Never migrate — [J1 locked](../planning/07-open-decisions.md) |
| `job_as_built_change` | v1.5 |

## Steps

### Step 1 — Migration plan (numbered files)

> **Status:** Complete (2026-06-29). **Plan:** [`migrations/estimate-backbone-plan.md`](../migrations/estimate-backbone-plan.md).

**What:** Draft migration file list and ordering. Prefer **additive** migrations; isolate **breaking** site rename.

| Batch | File | Content |
|-------|------|---------|
| A | `028_catalog_system.sql` | `system`, `trade`, `phase_template`/`_step`, spec defs, `manufacturer_part_spec`; optional `vendor_part.lead_time_days` |
| B | `029_site_as_built.sql` | `site_system`, `site_area`, `site_asset`; section/location backfill; retarget `estimate_line`/`job_line` FKs; drop legacy tables |
| C | `030_estimate_system.sql` | `estimate_system` + spec tables; `estimate_line` add `estimate_system_id`, `material_status`; drop `estimate_section_id` + `estimate_section` |
| D | `031_catalog_backbone_dev_seed.sql` | Agreed dev rows (below) |
| — | `032_job_backbone.sql` | **Follow-on** — job scope/phase DDL; not step 2 unless bundled |

**Exit:** Plan reviewed; seed contents agreed per table.

#### Seed agreement (batch D)

| Table | Agreed rows | Notes |
|-------|-------------|-------|
| `system` | Fire Alarm (1), Access Control (2), CCTV (3) | **Agreed** — Title Case names; 1-based `sort_order` |
| `phase_template` | Standard Install → Install, Program, Test | **Agreed** — Fire Alarm `default_phase_template_id` only |
| `system_spec_def` / `system_spec_option` | — | **Deferred** |
| `site_system` | None | **Agreed** |
| `trade` | None | **Agreed** |

### Step 2 — Write and apply migrations

> **Status:** Complete (2026-06-29). Shipped `028`–`031`.

**What:** Implement batches A–D.

| File | Shipped |
|------|---------|
| `028_catalog_system.sql` | `phase_template`/`_step`, `system`, `trade`, `system_spec_def`/`_option`, `manufacturer_part_spec`; `vendor_part.lead_time_days` |
| `029_site_as_built.sql` | `site_system`/`site_area`/`site_asset`; section→area / location→asset backfill (status remap + replacement chain); `estimate_line`/`job_line` add `site_area_id`/`site_asset_id`, drop `site_location_id`; drop legacy tables; `note` allowlist rename; audit `RAISE NOTICE` |
| `030_estimate_system.sql` | `estimate_system` + `estimate_system_spec`/`_area_spec`/`_line_spec`; `estimate_line` add `estimate_system_id`/`material_status`, drop `estimate_section_id`; drop `estimate_section` |
| `031_catalog_backbone_dev_seed.sql` | Agreed seeds — `system` (Fire Alarm/Access Control/CCTV), `phase_template` Standard Install + Install/Program/Test, Fire Alarm `default_phase_template_id` |

**Applied:** Existing dev DB at `027` baseline (all legacy/line tables empty → clean backfill). `028`→`031` applied in order via `db-migrate --only=`; `031` re-run is idempotent (0 inserts). Job backbone (`032`) left as follow-on per plan.

**Exit:** Existing dev DB applied cleanly; `current.dbml` matches shipped DDL (job_line `job_scope_group_id`/`material_status` remain DBML-only until `032`).

### Step 3 — Stop gate

> **Status:** Complete (2026-06-29).

**Verify:**

- [x] Site geography rename applied; legacy FKs migrated or nulled with audit note
- [x] `estimate_system` + spec tables exist
- [x] `estimate_line` has backbone columns; no `estimate_section_id`
- [x] `system` catalog seeded (rows documented in migration or companion seed file)
- [x] [`current.dbml`](../schema/current.dbml) matches shipped DDL (job backbone columns deferred to `032`)
- [x] [`../../STATUS.md`](../../STATUS.md) → [32-estimate-wave-4e.md](./32-estimate-wave-4e.md)

---

## Dev seeds — owner review (batch D / 031)

| Table | Starter rows | Status |
|-------|----------------|--------|
| `system` | Fire Alarm, Access Control, CCTV (`sort_order` 1/2/3) | **Agreed** |
| `system_spec_def` / `system_spec_option` | — (deferred) | **Deferred** |
| `phase_template` / `phase_template_step` | Standard Install → Install, Program, Test (`sequence` 1/2/3) | **Agreed** |
| `site_system` | None | **Agreed** |
| `trade` | None | **Agreed** |

Full DDL/backfill detail: [`migrations/estimate-backbone-plan.md`](../migrations/estimate-backbone-plan.md).

**Rule:** No seed file merges without explicit review of row contents.

## Reference

- [deferred/site-migration.md](./deferred/site-migration.md) — prior site DDL pattern
- [22-estimate-wave-4a.md](./22-estimate-wave-4a.md) — `021_estimate.sql` baseline
- [32-estimate-wave-4e.md](./32-estimate-wave-4e.md) — consumer of this DDL

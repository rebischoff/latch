# Estimate backbone — migration plan (task 31 step 1)

> **Status:** Shipped (2026-06-29) — `028`–`031` written + applied to dev DB ([task 31](../tasks/31-estimate-backbone-migrations.md) complete). **Next:** [task 32 estimate 4e](../tasks/32-estimate-wave-4e.md).
>
> **Schema source:** [`current.dbml`](../schema/current.dbml) · **Planning:** [`09-migration-notes.md`](../planning/09-migration-notes.md)

## Baseline

| Migration | Shipped artifacts |
|-----------|-------------------|
| `019_site.sql` | `site_section`, `site_location` |
| `021_estimate.sql` | `estimate`, `estimate_section`, `estimate_line` (`estimate_section_id`, `site_location_id`) |
| `023_job.sql` | `job_line.site_location_id` |
| `024_part.sql` | `manufacturer_part`, `vendor_part` (no `lead_time_days`) |
| `027_part_dev_seed.sql` | FA + plumbing parts (references manufacturers only — no `system` rows yet) |

Latest numbered file: **027**. Backbone batch starts at **028**.

## Ordering principles

1. **Additive before breaking** — catalog `system` (and FK parents) land before `site_system` / `estimate_system`.
2. **One breaking migration** — site geography rename isolated in `029`; batches A and C are additive DDL on top.
3. **Seeds last** — `031` runs only after DDL; idempotent; no hard-coded PKs (match `027` pattern).
4. **Job backbone deferred** — `job_scope_group`, `scope_phase`, `job_line` backbone columns ship in a **follow-on** migration (`032_job_backbone.sql`) after estimate 4e unless bundled explicitly in step 2.

```text
028 catalog (additive)
  ↓
029 site as-built (breaking — rename + backfill + line FK retarget)
  ↓
030 estimate system (additive + estimate_line column swap)
  ↓
031 dev seeds (discussed rows below)
```

---

## Batch A — `028_catalog_system.sql`

**Type:** Additive DDL only. No `INSERT`s.

### Tables

| Table | Notes |
|-------|-------|
| **`system`** | `id`, `name`, `default_phase_template_id` (nullable — FK added after `phase_template` exists, or defer FK to seed migration), `sort_order` |
| **`trade`** | `id`, `name`, `sort_order` — DDL only; **no seed** in v1 batch |
| **`phase_template`** | `id`, `name`, `sort_order` |
| **`phase_template_step`** | `id`, `phase_template_id`, `name`, `sequence`, `progress_weight`, `billing_weight`, `requires_previous_phase`, `sort_order` |
| **`system_spec_def`** | UUID PK; `system_id`, `code`, `display_name`, `value_type`, `sort_order` |
| **`system_spec_option`** | UUID PK; `system_spec_def_id`, `code`, `display_name`, `sort_order` |
| **`manufacturer_part_spec`** | Composite unique on `(manufacturer_part_id, system_spec_def_id, system_spec_option_id)` |

### Constraints

- `system_spec_def.value_type` CHECK: `enum` \| `boolean` \| `text`
- FK `system.default_phase_template_id` → `phase_template` (nullable)
- FK `system_spec_def.system_id` → `system`
- FK `manufacturer_part_spec` → `manufacturer_part`, `system_spec_def`, `system_spec_option`

### Optional in same file (additive, no Surface)

| Change | Notes |
|--------|-------|
| `vendor_part.lead_time_days` | `INTEGER` nullable — [P1 locked](../planning/07-open-decisions.md) |

### Grants

`latch_app` SELECT/INSERT/UPDATE/DELETE on all new tables (same `DO $$` pattern as `019_site.sql`).

---

## Batch B — `029_site_as_built.sql`

**Type:** Breaking — replaces `site_section` / `site_location`. **Must run after 028** (`site_system.system_id` → `system`).

### Create

| Table | Key columns |
|-------|-------------|
| **`site_system`** | `site_id`, `system_id`, `name`, `status`, `sort_order` — status CHECK: `proposed` \| `active` \| `removed` \| `cancelled` |
| **`site_area`** | `site_id`, `site_system_id` (nullable), `parent_area_id` (nullable self-FK), `area_type`, `name`, `code`, `sort_order`, `status` |
| **`site_asset`** | `site_id`, `site_system_id`, `site_area_id`, `asset_type`, `tag_label`, `part_id`, `manufacturer`, `model`, `serial_number`, `sort_order`, `status`, `replaced_by_site_asset_id`, `serviceable`, `installed_by_job_id` |

Indexes: `site_id` on all three; `site_area_id` on `site_asset`.

### Data backfill (legacy → backbone)

| Source | Target | Rule |
|--------|--------|------|
| `site_section` | `site_area` | `name` ← `title`; `site_system_id` NULL (default bucket); `parent_area_id` NULL; `area_type` `''`; same `site_id`, `sort_order`, `status` |
| `site_location` | `site_asset` | `tag_label` ← `label`; `site_area_id` ← mapped section id (via section→area map); `site_system_id` NULL; `asset_type` `''` |
| `site_location.status` | `site_asset.status` | `proposed`→`planned`, `active`→`active`, `relocated`→`replaced`, `removed`/`cancelled`→`removed` |
| `site_location.replaced_by_site_location_id` | `site_asset.replaced_by_site_asset_id` | Remap through location→asset id map |

**Semantic note (S1):** Legacy `site_location` = work **spot**; new `site_asset` = **device**. Automated backfill treats every legacy location as an asset row (spot label → `tag_label`). PMs may later split spot-vs-device manually; no `site_system` rows created during backfill (S2).

### Line FK retarget (in this batch)

| Table | Action |
|-------|--------|
| `estimate_line` | Add `site_area_id`, `site_asset_id`; backfill `site_asset_id` from `site_location_id` map; set `site_area_id` from asset's `site_area_id`; drop `site_location_id` |
| `job_line` | Same pattern |

`estimate_section_id` **unchanged here** — dropped in batch C.

### Drop

1. Drop FK constraints referencing `site_section` / `site_location`
2. `DROP TABLE site_location`
3. `DROP TABLE site_section`

### Audit note

Insert comment block or `RAISE NOTICE` documenting row counts migrated (sections→areas, locations→assets, lines retargeted). No `latch_audit` schema change.

---

## Batch C — `030_estimate_system.sql`

**Type:** Additive tables + `estimate_line` column changes. **Depends on 028 + 029.**

### Create

| Table | Notes |
|-------|-------|
| **`estimate_system`** | `estimate_id`, `system_id`, `site_system_id` (nullable), `sort_order` |
| **`estimate_system_spec`** | Tab defaults — FK `estimate_system`, `system_spec_def`, optional `system_spec_option` |
| **`estimate_area_spec`** | Per-area overrides — FK `estimate_system`, `site_area`, `system_spec_def` |
| **`estimate_line_spec`** | Per-line overrides — FK `estimate_line`, `system_spec_def` |

### Alter `estimate_line`

| Change | Notes |
|--------|-------|
| ADD `estimate_system_id` | Nullable FK → `estimate_system` |
| ADD `material_status` | Nullable TEXT — no CHECK v1 (values: `generic`, `suggested`, `verified`) |
| DROP `estimate_section_id` | Column + FK |
| — | `site_area_id` / `site_asset_id` already added in 029 |

### Drop `estimate_section`

`estimate_section` table has no v1 Surface ([E2 locked](../planning/07-open-decisions.md)). Drop table after dropping line FK. Dev data loss acceptable (wave 4a used flat lines).

### Explicitly omit

- `estimate_section` recreation
- `job_scope_group`, `scope_phase`, `job_line` backbone columns — **032** follow-on

---

## Batch D — `031_catalog_backbone_dev_seed.sql`

**Type:** Optional dev fixtures. **Idempotent** — match by `name` / `code` / `display_name`; Postgres-assigned ids.

### Agreed rows

#### `system` — **agreed** (task 32)

| sort_order | name |
|------------|------|
| 1 | Fire Alarm |
| 2 | Access Control |
| 3 | CCTV |

**Naming:** Title Case (`Fire Alarm`, not sentence case). **Order:** 1-based integers per [catalog table UX](../../decisions/general.md#decision-catalog-table-ux--draft-saverevert-2026-06-22) — UI reorder sets first row to `1` on Save.

#### `phase_template` + `phase_template_step` — **agreed**

| `phase_template.name` | Steps (`sequence`) |
|-----------------------|-------------------|
| Standard Install | Install (1), Program (2), Test (3) |

- **`sequence`:** 1-based (same rule as catalog `sort_order`).
- **Weights:** `progress_weight` and `billing_weight` = `1` per step (equal split v1).
- **Link:** set `system.default_phase_template_id` on **Fire Alarm** only; Access Control and CCTV have no default in 031.

#### `system_spec_def` + `system_spec_option` — **deferred** (not in 031)

Owner chose to ship **empty** spec tables in 031. Task 32 spec panel will have no catalog defs until a later catalog pass.

**Proposed when seeded** (Fire Alarm only):

| def `code` | `display_name` | `value_type` | options (`code` → `display_name`) |
|------------|----------------|--------------|-----------------------------------|
| `slc_protocol` | SLC Protocol | `enum` | `litespeed` → LiteSpeed, `clip` → CLIP |

No `manufacturer_part_spec` links in first spec seed — wire `027` Fire-Lite parts in that same pass.

#### Not seeded

| Table | Reason |
|-------|--------|
| `site_system` | Per-site; created via estimate UI ([task 31](../tasks/31-estimate-backbone-migrations.md)) |
| `trade` | No consumer until job scope groups |
| `estimate_system` | App data |

---

## Follow-on (out of step 2 scope unless explicitly bundled)

| File | Content |
|------|---------|
| `032_job_backbone.sql` | `job_scope_group`, `scope_phase`, `progress_entry`, `progress_entry_line`; `job_line` add `job_scope_group_id`, backbone geography already in 029 |
| `033_job_win_snapshots.sql` | `job_system_spec`, `job_area_spec`, `job_line_spec` — after win flow |

---

## Pre-apply checklist (step 2)

- [x] `028`–`031` present in `migrations/` in lexical order
- [ ] Fresh DB: 001→031 applies clean — **not run here** (no local PG server / Docker; applied incrementally to existing dev DB instead)
- [x] Existing dev DB: 029 backfill verified — dev was at `027` baseline with empty `site_section`/`site_location`/`estimate_line`/`job_line`, so backfill was a clean no-op (`RAISE NOTICE`: 0 area / 0 asset rows)
- [x] `current.dbml` drift-only patch — none needed; shipped DDL matches DBML (job_line `job_scope_group_id`/`material_status` remain DBML-only until `032`)

## Reference

- [31-estimate-backbone-migrations.md](../tasks/31-estimate-backbone-migrations.md)
- [deferred/site-migration.md](../tasks/deferred/site-migration.md) — prior `019` pattern
- [30-backbone-surfaces-review.md](../tasks/30-backbone-surfaces-review.md) — legacy column inventory

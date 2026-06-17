# 17 — Schema design pass (Slices 2–6)

> **Status:** Complete (2026-06-16). Next: [18-site-migration.md](./18-site-migration.md).

## Goal

Finish the **business schema in [`current.dbml`](../schema/current.dbml)** before writing more SQL migrations or Surfaces. Slice 2 (sites/locations) is already drafted; extend through catalog, estimates, jobs, and financial tables with refs and `Note` blocks. Lock any open forks in [`decisions.md`](../decisions.md). **DBML + docs only** — no `migrations/*.sql` in this task.

## Prerequisites

[16-slice2-planning-gate.md](./16-slice2-planning-gate.md) complete.

## Why before migrations

Shipped `016_party.sql` still differs from the design target (`party_person`, polymorphic `note`, `employee` → `party_person`). Sites DDL (task **18**) depends on FK shapes for estimates, jobs, and line snapshots. [`schema/README.md`](../schema/README.md) workflow: **DBML leads until the loop exits** — migrations catch up in batched implementation tasks after design stabilizes.

## Files

| File | Action |
|------|--------|
| [`../schema/current.dbml`](../schema/current.dbml) | **Extend** — Slices 3–6 tables, refs, `TableGroup`s; review Slice 1–2 draft |
| [`../decisions.md`](../decisions.md) | **Update** — schema-first gate; resolve forks from the pass |
| [`../architecture.md`](../architecture.md) | **Update** — data model summary + entity flow labels |
| [`01-task-index.md`](./01-task-index.md) | **Update** — execution order; defer task **18** until this exits |
| [`../../STATUS.md`](../../STATUS.md) | **Update** — point here until verify passes |

**Parked (do not apply until task 18):** [`../../migrations/020_site_contact_relation_dev_seed.sql`](../../migrations/020_site_contact_relation_dev_seed.sql) — depends on `019_site.sql`, which waits for this pass.

## Scope

### In DBML (column-level)

| Slice | Tables |
|-------|--------|
| **1** *(review)* | `party_person`, `party_organization`, `note`; `employee` FK → `party_person`; align `party` with shipped `016` migration path |
| **2** *(review)* | `location`, `site`, `party_location`, `site_contact_relation`, `site_contact` — already drafted |
| **3** | `manufacturer_part`, `vendor_part_price`, `item_category`, `item`, `item_part_link` |
| **4** | `estimate`, `estimate_party`, `estimate_line` |
| **5** | `job_party_relation`, `job`, `job_party`, `job_location`, `job_line`, `job_line_progress`, `change_order`, `change_order_line` |
| **6** | `invoice`, `invoice_line`, `purchase_order`, `po_line`, `schedule_of_value`, `sov_line` |

### Still deferred (Notes only — no columns)

- `attachment` polymorphic files
- Address verification columns on `location`
- `party_user`, `latch_users.user_class` (identity slice)
- Employee HR columns on `employee`
- Slice 7 report views (custom SQL, not tables)

## Steps

### 1. Review Slice 1–2 draft

Confirm party kind extensions, `note` replacing interim `party.notes`, and site/location junctions match locked [decisions](../decisions.md). No `site_location` table.

### 2. Catalog (Slice 3)

- `manufacturer_part` — FK → `party` (manufacturer tag); MPN, description, specs, `cut_sheet_url`
- `vendor_part_price` — vendor `party` + part; current unit price (v1: one row per vendor+part)
- `item` / `item_category` / `item_part_link` — sellable/engineering BOM composition

### 3. Estimates (Slice 4)

- `estimate` — anchor at `site_id`; status lifecycle; optional link to source estimate on revision
- `estimate_party` — per-quote stakeholders via `job_party_relation` catalog (same relations as job slice)
- `estimate_line` — snapshot `description`, `quantity`, `unit_price`; optional `location_id`, `item_id`, `part_id` refs

### 4. Jobs (Slice 5)

- `job_party_relation` — catalog (parallel to `site_contact_relation`); relations per [job anchor decision](../decisions.md#decision-job-anchor-and-stakeholders--deferred-to-job-slice-2026-06-15)
- `job` — `site_id` NOT NULL; optional `estimate_id`; no sole `customer_id` column
- `job_party`, `job_location`, `job_line`, `job_line_progress`, `change_order` + lines

### 5. Financial (Slice 6)

- `invoice` / `invoice_line` — from `job`; snapshot lines; optional `job_line_id` link
- `purchase_order` / `po_line` — vendor + job; snapshot lines; optional `part_id` / `job_line_id`
- `schedule_of_value` / `sov_line` — simplified progress billing milestones on job

### 6. Sync docs

Update `architecture.md` entity flow and data-model table list. Add Decision block for schema-first gate. Sync [dbdiagram](https://dbdiagram.io/d/latch-6a3215ad5c789b8acb9d5278) when the round is stable (manual import — see [`schema/README.md`](../schema/README.md)).

### 7. Migration plan (docs only)

In task **18** or a short note in `decisions.md`: ordered migration batches after design exits — e.g. party refactor → sites → catalog → … — migration numbers `018+` assigned at implementation time.

## Verify (stop gate)

- [x] `current.dbml` includes all tables in **Scope** with `Ref:` lines
- [x] Slice 3–6 `TableGroup`s added; group names/colors unchanged for existing groups
- [x] `job.site_id` NOT NULL; no `customer_id` on `site` or `job`; `estimate` uses `site_id` + `estimate_party`
- [x] Line tables (`estimate_line`, `job_line`, `invoice_line`, `po_line`) document snapshot columns per [line-item decision](../decisions.md#decision-line-item-snapshots-on-estimate--job--invoice-2026-06-12)
- [x] `estimate_line.location_id` / `job_line.location_id` present for in-building scope
- [x] `job_party_relation` catalog documented (not master `party_role` tags for GC/sub)
- [x] No `site_system` table; no `site` ↔ `location` junction
- [x] Decision block: schema-first before migrations (dated)
- [x] [`../../STATUS.md`](../../STATUS.md) → [18-site-migration.md](./18-site-migration.md)

## Out of scope

- Writing `migrations/*.sql` (task **18+**)
- Surface YAML, codegen, DAL, UI
- dbdiagram layout export to `current.dbdiagram` (layout-only canvas)

## Reference

- [schema/README.md](../schema/README.md) — DBML workflow
- [15-entity-flow.md](./15-entity-flow.md) · [16-slice2-planning-gate.md](./16-slice2-planning-gate.md)
- [architecture.md](../architecture.md) · [child-collections.md](../child-collections.md)

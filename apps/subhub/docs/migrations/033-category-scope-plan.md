# 033 — Category-only scope migration plan

> **Status:** Complete (2026-06-30). **Applied on dev:** 2026-06-30 (task [37b](../tasks/37b-category-scope-migration-apply.md)).

## Summary

**Breaking migration `033`** replaces the catalog **`system`** model with **category roots** (`parent_id IS NULL`), renames site geography and estimate scope tables, adds catalog M:N links and commercial type DDL. **Big-bang** — app code against `site_system` / `estimate_system` breaks until tasks **37c–37f**.

## Baseline

| Migration | Relevant artifacts |
|-----------|-------------------|
| `028` | `system`, `system_spec_def`, `system_spec_option`, `manufacturer_part_spec` |
| `029` | `site_system`, `site_area`, `site_asset`; `job_line.site_area_id` |
| `030` | `estimate_system`, `estimate_*_spec`, `estimate_line.estimate_system_id` |
| `032` | `site_area` name-only |

Latest before this batch: **032**. This batch: **033**.

**Note:** `category` and `item` tables are **DBML-only** today — `033` includes `CREATE TABLE IF NOT EXISTS` stubs before dependent steps.

## Ordering

```text
033_category_scope.sql (breaking — single transaction)
  ↓
37b apply on dev + FK smoke
  ↓
37c site DAL/UI (site_scope / site_zone)
  ↓
37d catalog category M:N
  ↓
37e–37f estimate scope + lines
```

## Batch — `033_category_scope.sql`

**Type:** Breaking. **One transaction.**

### Step 0 — Stubs

| Object | Action |
|--------|--------|
| **`category`** | `CREATE TABLE IF NOT EXISTS` with `parent_id`, `default_phase_template_id` |
| **`item`** | `CREATE TABLE IF NOT EXISTS` minimal product row (catalog 3b expands later) |

### Step 1 — Migrate `system` → category roots

| Action | Detail |
|--------|--------|
| `INSERT INTO category` | From `system` rows; **`id` preserved** so FK retargets stay stable |
| `DROP TABLE system` | End of migration |

### Step 2 — Spec namespace rename

| Old | New |
|-----|-----|
| `system_spec_def` | **`spec_def`** |
| `system_spec_def.system_id` | **`spec_def.root_category_id`** → `category.id` |
| `system_spec_option` | **`spec_option`** |
| `*.system_spec_def_id` | **`spec_def_id`** |
| `manufacturer_part_spec.system_spec_def_id` | **`spec_def_id`** |

### Step 3 — Catalog M:N

| Table | PK |
|-------|-----|
| **`category_spec_def`** | `(category_id, spec_def_id)` — which specs participate per category node |
| **`item_category`** | `(item_id, category_id)` |
| **`part_category`** | `(part_id, category_id)` |

Backfill `item_category` from legacy `item.category_id` when set.

### Step 4 — Site geography rename

| Old | New |
|-----|-----|
| `site_system` | **`site_scope`** |
| `site_system.system_id` | **`site_scope.root_category_id`** |
| `site_area` | **`site_zone`** |
| `site_area.site_system_id` | **`site_zone.site_scope_id`** |
| `site_area.parent_area_id` | **`site_zone.parent_zone_id`** |
| `site_asset.site_system_id` | **`site_scope_id`** |
| `site_asset.site_area_id` | **`site_zone_id`** |

### Step 5 — Estimate scope rename

| Old | New |
|-----|-----|
| `estimate_system` | **`estimate_scope`** |
| `estimate_system.system_id` | **`estimate_scope.root_category_id`** |
| `estimate_system.site_system_id` | **`estimate_scope.site_scope_id`** |
| `estimate_system_spec` | **`estimate_scope_spec`** |
| `estimate_area_spec` | **`estimate_zone_spec`** |
| `estimate_zone_spec.site_area_id` | **`site_zone_id`** |
| `estimate_line.estimate_system_id` | **`estimate_scope_id`** |
| `estimate_line.site_area_id` | **`site_zone_id`** |
| `estimate_line_spec.system_spec_def_id` | **`spec_def_id`** |

**Additive on `estimate_line`:** `unit_material`, `unit_labor`, `unit_incidental` (default 0).

**Additive on `estimate_scope`:** `labor_context_type_id`, `markup_type_id` (nullable FKs).

### Step 6 — Job geography

| Change |
|--------|
| `job_line.site_area_id` → **`site_zone_id`** |
| If `job_scope_group` exists: rename `system_id` → `root_category_id`, `site_system_id` → `site_scope_id`, `site_area_id` → `site_zone_id` |

### Step 7 — Commercial type catalog (DDL only)

| Table | Purpose |
|-------|---------|
| **`labor_context_type`** | Retrofit vs new construction, warehouse vs office, … |
| **`labor_rate_type`** | Named **$/hr** (or unit) rate |
| **`incidental_rate_type`** | Named **$ amount** + unit |
| **`markup_type`** | Named **markup_percent** on cost subtotal |

Surfaces and bucket wiring: task **37g**.

### Step 8 — Retired

| Drop / keep |
|-------------|
| **`DROP TABLE system`** |
| **`trade`** — **kept** (job/labor TBD; not on scope path v1) |

### Grants

`latch_app` on new junction + commercial type tables (same `DO $$` pattern as `028`).

---

## Dev apply (37b)

```bash
cd apps/subhub
# against dev DB with 028–032 applied:
psql "$DATABASE_URL" -f migrations/033_category_scope.sql
```

### Post-apply smoke

```sql
-- Roots migrated
SELECT count(*) FROM category WHERE parent_id IS NULL;

-- Site rename
SELECT count(*) FROM site_scope;
SELECT count(*) FROM site_zone;

-- No orphan system table
SELECT to_regclass('public.system');  -- expect NULL

-- Estimate rename
SELECT count(*) FROM estimate_scope;
```

### Expected app breakage until 37c+

| Area | Breaks |
|------|--------|
| Site geography DAL | `site_system`, `site_area` table names |
| Estimate systems DAL | `estimate_system`, `system` catalog picker |
| `useCatalogSystemPicker` | `system` table |
| Job lines read | `site_area_id` column name |

### Applied — smoke results (2026-06-30)

| Check | Result |
|-------|--------|
| Category roots | 3 |
| `site_scope` / `site_zone` | 1 / 1 |
| `estimate_scope` | 0 |
| `system` table | dropped |

Full file-level inventory: [37b § Step 3](../tasks/37b-category-scope-migration-apply.md#step-3--breakage-inventory).

---

## Rollback

**No down migration.** Restore DB snapshot or re-run from seed baseline. Big-bang choice (C16).

---

## Verify (37a stop gate)

- [x] [`11-categories-scope-model.md`](../planning/11-categories-scope-model.md) locked
- [x] Decision blocks in `decisions/catalog.md`, `estimate.md`, `site.md`
- [x] [`current.dbml`](../schema/current.dbml) amended
- [x] [`033_category_scope.sql`](../../migrations/033_category_scope.sql) written
- [x] This plan complete
- [x] Task index + `STATUS.md` repoint to **37b**

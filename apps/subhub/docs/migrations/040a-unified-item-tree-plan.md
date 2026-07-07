# Migration 040a — unified item tree (structural merge/rename)

> **Status:** Plan (2026-07-05). **Prerequisite:** **039** applied ([retire General](./039-retire-general-scope-plan.md)). **Follow-on:** [040b commercial engine](./040-commercial-costing-plan.md) *(split per D8 — re-scope to 040b only)*.
>
> **Decision:** [unified item tree D1–D8](../decisions/catalog.md#decision-unified-item-tree--merge-category--item-node-anchored-estimate-lines-2026-07-05) · **Planning:** [11-categories-scope-model](../planning/11-categories-scope-model.md) (C3/C7/C8/C11 superseded).

## Purpose

Merge **`category`** + legacy **`item`** into one self-referential **`item`** table. Estimate lines continue to use **`estimate_line.item_id`**, but the FK may reference **any tree depth** (branch or leaf). **No costing / commercial DDL** in this migration — that is **040b**.

**Exit (D8 stop gate):** dev DB has a single `item` tree; `category` / `item_category` / legacy `item` table gone; renamed FKs; `line_kind` dropped; app + `codegen:check` green; 37f material snapshot still works on renamed paths; branch nodes selectable in picker.

## Out of scope (040b)

| Deferred | Decision |
|----------|----------|
| `estimate_line.lock`, drop `part_locked` / `material_status` | D6b, D8b |
| Org rate tables, `item_labor_phase`, `resolveRate`, recalc engine | D4, 37g |
| `complexity_factor_id` on `estimate_scope` / `estimate_zone` | D5 |
| Kit / assembly behavior | D7 defer v2 |
| `estimate_line_spec` write UI | D3 |

---

## Target shape (post-040a)

### Table `item` (renamed from `category` + merged legacy item rows)

| Column | Source | Notes |
|--------|--------|--------|
| `id` | `category.id` or legacy `item.id` | **Preserve all ids** — estimate lines keep working |
| `name` | both | |
| `parent_id` | `category.parent_id` or **backfill** for legacy items | `NULL` = scope root (excluded from line picker) |
| `csi_code`, `sort_order` | `category` | |
| `default_phase_template_id` | `category` | Dropped in 040b |
| `description` | legacy `item` | `''` on branch-only nodes |
| `default_part_id`, `default_vendor_part_id` | legacy `item` | nullable |
| `fallback_unit_cost` | legacy `item` | default `0` on branch nodes |
| `labor_class_id` | legacy `item` | nullable; emergent labor in 040b |
| `created_at`, `updated_at` | legacy `item` | default `now()` on branch-only nodes |

**Dropped / not carried forward:** `item.kind`, `item.category_id`, `estimate_line.line_kind`.

### Renamed tables / columns

| Before | After |
|--------|-------|
| `category` | **`item`** |
| `part_category` | **`part_item`** (`category_id` → `item_id`) |
| `category_spec_exclude` | **`item_spec_exclude`** (`category_id` → `item_id`) |
| `spec_def.category_id` | **`spec_def.item_id`** |
| `site_scope.root_category_id` | **`root_item_id`** |
| `estimate_scope.root_category_id` | **`root_item_id`** |
| `job_scope_group.root_category_id` | **`root_item_id`** (if table exists) |
| `estimate.category_id` | **`estimate.item_id`** (optional grouping FK) |

**Unchanged names:** `item_part_link.item_id`, `estimate_line.item_id`, `estimate_line.line_role` / `parent_line_id` (D7 — columns stay; v1 UI ignores kits).

---

## Pre-flight (run before migration)

### 1 — ID collision

Legacy `item.id` must not already exist as a `category.id`:

```sql
SELECT i.id, i.name
FROM item i
INNER JOIN category c ON c.id = i.id;
-- expect 0 rows
```

### 2 — Orphan legacy items (D8a)

Every legacy `item` row needs at least one placement link:

```sql
SELECT i.id, i.name
FROM item i
LEFT JOIN item_category ic ON ic.item_id = i.id
WHERE ic.item_id IS NULL
  AND i.category_id IS NULL;
-- expect 0 rows — fix dev seed or raise in migration
```

### 3 — Multi-link inventory (informational)

```sql
SELECT item_id, COUNT(*) AS link_count
FROM (
  SELECT item_id, category_id FROM item_category
  UNION
  SELECT id AS item_id, category_id FROM item WHERE category_id IS NOT NULL
) links
GROUP BY item_id
HAVING COUNT(*) > 1;
```

Document count — deepest category wins per D8a.

### 4 — Lines pointing at missing items

```sql
SELECT el.id, el.item_id
FROM estimate_line el
LEFT JOIN item i ON i.id = el.item_id
WHERE i.id IS NULL;
-- expect 0
```

---

## `item_category` backfill (D8a)

**Goal:** each legacy `item` row becomes a **child node** in the unified tree (`parent_id` set).

**Link sources (union):**

1. `item_category (item_id, category_id)`
2. Legacy `item.category_id` when set

**Tie-break:** highest **depth** in category tree (deepest = most specific). Tie on depth → lowest `category_id` lexicographic.

```sql
WITH RECURSIVE cat_depth AS (
  SELECT id, parent_id, 0 AS depth
  FROM category
  WHERE parent_id IS NULL
  UNION ALL
  SELECT c.id, c.parent_id, d.depth + 1
  FROM category c
  INNER JOIN cat_depth d ON c.parent_id = d.id
),
all_links AS (
  SELECT ic.item_id, ic.category_id
  FROM item_category ic
  UNION
  SELECT i.id AS item_id, i.category_id
  FROM item i
  WHERE i.category_id IS NOT NULL
),
ranked AS (
  SELECT
    al.item_id,
    al.category_id AS parent_id,
    ROW_NUMBER() OVER (
      PARTITION BY al.item_id
      ORDER BY cd.depth DESC, al.category_id ASC
    ) AS rn
  FROM all_links al
  INNER JOIN cat_depth cd ON cd.id = al.category_id
)
SELECT item_id, parent_id
FROM ranked
WHERE rn = 1;
```

**Failure:** `RAISE EXCEPTION` if any `item` row has no row in `ranked`.

---

## Migration steps (single transaction sketch)

File: **`migrations/040a_unified_item_tree.sql`**

Order matters for FKs. Adjust constraint names to match dev.

### Step 0 — Extend `category` with legacy-item columns

```sql
ALTER TABLE category
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS default_part_id TEXT REFERENCES manufacturer_part (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_vendor_part_id TEXT REFERENCES vendor_part (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fallback_unit_cost NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labor_class_id TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
```

### Step 1 — Insert legacy `item` rows into `category`

Use backfill CTE for `parent_id`. Copy item-owned columns; do **not** copy `kind` or `category_id`.

```sql
INSERT INTO category (
  id, name, parent_id, description,
  default_part_id, default_vendor_part_id, fallback_unit_cost,
  labor_class_id, phase_template_id, created_at, updated_at, sort_order
)
SELECT
  i.id,
  i.name,
  bp.parent_id,
  i.description,
  i.default_part_id,
  i.default_vendor_part_id,
  COALESCE(i.fallback_unit_cost, 0),
  i.labor_class_id,
  i.phase_template_id,
  i.created_at,
  i.updated_at,
  0
FROM item i
INNER JOIN ( /* ranked backfill CTE */ ) bp ON bp.item_id = i.id;
```

*`phase_template_id` only if column exists on `item` — map to `default_phase_template_id` or add nullable `phase_template_id` on category stub; align with live DDL before apply.*

### Step 2 — Drop `item_category`

```sql
DROP TABLE item_category;
```

### Step 3 — Drop legacy `item` table

Drop FKs referencing `item` first (`item_part_link` stays — repoints to unified `item` after rename).

```sql
DROP TABLE item;
```

### Step 4 — Rename `category` → `item`

```sql
ALTER TABLE category RENAME TO item;
-- rename indexes/constraints: category_pkey → item_pkey, category_parent_id_idx → item_parent_id_idx, etc.
ALTER TABLE item RENAME CONSTRAINT category_parent_id_fkey TO item_parent_id_fkey;
```

### Step 5 — Junction + spec rename

```sql
ALTER TABLE part_category RENAME TO part_item;
ALTER TABLE part_item RENAME COLUMN category_id TO item_id;

ALTER TABLE category_spec_exclude RENAME TO item_spec_exclude;
ALTER TABLE item_spec_exclude RENAME COLUMN category_id TO item_id;

ALTER TABLE spec_def RENAME COLUMN category_id TO item_id;
-- rewire FK constraint names to reference item(id)
```

### Step 6 — Scope / estimate root FK renames

```sql
ALTER TABLE site_scope RENAME COLUMN root_category_id TO root_item_id;
ALTER TABLE estimate_scope RENAME COLUMN root_category_id TO root_item_id;
-- job_scope_group if present
ALTER TABLE estimate RENAME COLUMN category_id TO item_id;
```

### Step 7 — `estimate_line` — drop `line_kind` only

```sql
ALTER TABLE estimate_line DROP COLUMN IF EXISTS line_kind;
```

Keep `part_locked`, `material_status`, `phase_id` until **040b**.

### Step 8 — Grants

Grant `latch_app` on renamed tables (`item`, `part_item`, `item_spec_exclude`) — same pattern as [034](./034-category-table-grants.sql).

---

## App / codegen changes (same change set as 040a apply)

Ship migration SQL **with** app/DAL/UI — big-bang on dev (same pattern as 033 / 039).

### Catalog DAL / API

| Area | Today | After 040a |
|------|-------|------------|
| `category-tree.ts`, `category-detail.ts`, `category-write.ts` | `category` table | Rename to **`item-*`**; single tree loader |
| `item-tree.ts` | Mixed category + `item_category` join | **One tree** from `item.parent_id`; **no** `type: "item"` leaf distinction required — all nodes same shape; **branch `selectable: true`** (D8c) |
| `item-part-category.ts` | `loadItemCategories` | **Delete** or stub empty — placement is `parent_id` |
| `category-effective-specs.ts` | `spec_def.category_id` | `spec_def.item_id` |
| Routes `/api/categories/*` | category CRUD | Rename or alias → **`/api/items/*`** (pick one; update nav) |
| Surfaces `category_list` / `category_detail` | yaml + generated | Rename → **`item_list` / `item_detail`** + `npm run codegen` |
| Components `Category*` | — | Rename → **`Item*`** (tree list, detail form, spec field) |

### Estimate DAL / UI

| Area | Change |
|------|--------|
| `estimate-part-resolver.ts` | Anchor = `estimate_line.item_id` **node**; part pool = `part_item` for anchor **∪ subtree(anchor)** (replaces `item_category` + `part_category` union) |
| `estimate-scopes.ts` / write | `root_category_id` → `root_item_id` |
| `EstimateScopeTab`, scope tree helpers | `root_category_id` → `root_item_id` |
| `estimate-lines-write.ts` | Drop `line_kind` validation |
| `EstimateLineTreeTable` / descriptors | Remove `line_kind` field; picker uses unified item tree |
| Site `SiteScopesZonesTree` | `root_category_id` → `root_item_id` |

### DBML + docs

- Update [`current.dbml`](../schema/current.dbml) to unified `item` model.
- Refresh [`surface-specs/category.md`](../surface-specs/category.md) → **`item.md`** (or amend in place).

### Tests to update

| File | Focus |
|------|--------|
| `category-write.test.ts`, `category-detail.test.ts` | item tree CRUD |
| `category-spec-exclude-write.test.ts` | `item_spec_exclude` |
| `spec-def-write.test.ts` | `spec_def.item_id` |
| `estimate-part-resolver` tests (if any) | subtree part pool |
| `item-tree` / estimate line integration tests | branch-selectable anchor |

---

## Smoke queries (post-apply)

```sql
-- structural
SELECT to_regclass('public.category');           -- null
SELECT to_regclass('public.item_category');      -- null
SELECT to_regclass('public.item');               -- item
SELECT to_regclass('public.part_item');          -- part_item

-- legacy items merged
SELECT COUNT(*) FROM item i
WHERE i.parent_id IS NOT NULL
  AND i.description <> '';                       -- ≥ former item row count

-- no orphan legacy items (all had parent assigned)
SELECT COUNT(*) FROM item WHERE parent_id IS NULL;  -- = scope root count only

-- line FKs intact
SELECT COUNT(*) FROM estimate_line el
LEFT JOIN item i ON i.id = el.item_id
WHERE i.id IS NULL;                              -- 0

-- line_kind gone
SELECT column_name FROM information_schema.columns
WHERE table_name = 'estimate_line' AND column_name = 'line_kind';  -- 0 rows

-- renamed roots
SELECT column_name FROM information_schema.columns
WHERE table_name = 'estimate_scope' AND column_name = 'root_item_id';  -- 1 row
```

**Manual smoke:**

1. Catalog — create/edit nested item node; assign spec def owner; link part via `part_item`.
2. Estimate — open scope tab (roots load); add line at **leaf** item (existing behavior).
3. Estimate — add line at **branch** node (new); save; material snapshot populates (`fallback_unit_cost` or part filter).
4. `npm run codegen:check`

---

## Rollback

Dev-only. Prefer restore-from-backup over reverse script once estimate lines reference branch nodes.

Reverse script would need to:

1. Split unified `item` back into `category` + `item` (non-trivial if lines anchor branch ids).
2. Recreate `item_category` from `parent_id` edges where child was a legacy item.

**Not shipped for v1 production.**

---

## Verify (stop gate)

- [ ] `040a_unified_item_tree.sql` written and applies on dev
- [ ] Pre-flight queries documented (collision / orphan counts)
- [ ] App + codegen land in same change set
- [ ] `codegen:check` passes
- [ ] Manual smoke (catalog CRUD, leaf line, **branch line**, scope tab)
- [ ] DBML updated
- [x] **040b** plan trimmed to commercial-only DDL

---

## Follow-on

| Next | Notes |
|------|-------|
| **[040b](./040-commercial-costing-plan.md)** | Commercial engine, `lock` enum, complexity on scope/zone — **only after 040a green** |
| **[37g](../tasks/37g-commercial-costing.md)** | Implementation — **37i** ✅; apply **040b** next |
| **[37i](../tasks/37i-unified-item-tree-apply.md)** | Implementation task — apply 040a + app cut |

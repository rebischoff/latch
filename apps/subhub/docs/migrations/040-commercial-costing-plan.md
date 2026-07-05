# Migration 040 — commercial costing plan

> **Task:** [37g](../tasks/37g-commercial-costing.md) · **Status:** Plan (2026-07-04) · **Prerequisite:** **039** applied.

---

## Summary

Introduce org commercial catalogs (`labor_phase`, `cost_add_on_type`, `complexity_factor`), category commercial junction/FKs, split markup, `unit_freight` on lines, **single `item.category_id`**, and drop retired `phase_template` / `item_category` / legacy `incidental_rate_type`.

---

## Step 1 — New tables

### `labor_phase`

```sql
CREATE TABLE labor_phase (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL UNIQUE,
  sort_order  INTEGER NOT NULL DEFAULT 0
);
```

### `category_labor_phase`

```sql
CREATE TABLE category_labor_phase (
  category_id         TEXT NOT NULL REFERENCES category (id) ON DELETE CASCADE,
  labor_phase_id      TEXT NOT NULL REFERENCES labor_phase (id) ON DELETE RESTRICT,
  labor_rate_type_id  TEXT NOT NULL REFERENCES labor_rate_type (id) ON DELETE RESTRICT,
  hours_per_unit      NUMERIC NOT NULL DEFAULT 0,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (category_id, labor_phase_id)
);
```

### `cost_add_on_type`

Replaces `incidental_rate_type`.

```sql
CREATE TABLE cost_add_on_type (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  kind          TEXT NOT NULL CHECK (kind IN ('freight', 'incidental')),
  name          TEXT NOT NULL,
  percent       NUMERIC NOT NULL DEFAULT 0,
  amount_cents  INTEGER NOT NULL DEFAULT 0,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  UNIQUE (kind, name),
  CHECK (percent > 0 OR amount_cents > 0)
);
```

### `complexity_factor`

```sql
CREATE TABLE complexity_factor (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name            TEXT NOT NULL UNIQUE,
  factor_percent  NUMERIC NOT NULL DEFAULT 100,
  sort_order      INTEGER NOT NULL DEFAULT 0
);
```

---

## Step 2 — Amend existing tables

### `markup_type`

```sql
ALTER TABLE markup_type
  ADD COLUMN material_markup_percent NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN labor_markup_percent NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE markup_type DROP COLUMN markup_percent;
```

### `labor_rate_type`

```sql
ALTER TABLE labor_rate_type DROP COLUMN IF EXISTS labor_class_id;
```

### `category`

```sql
ALTER TABLE category
  ADD COLUMN freight_rate_type_id     TEXT REFERENCES cost_add_on_type (id) ON DELETE SET NULL,
  ADD COLUMN incidental_rate_type_id  TEXT REFERENCES cost_add_on_type (id) ON DELETE SET NULL,
  ADD COLUMN markup_type_id           TEXT REFERENCES markup_type (id) ON DELETE SET NULL,
  ADD COLUMN complexity_factor_id     TEXT REFERENCES complexity_factor (id) ON DELETE SET NULL;

ALTER TABLE category DROP COLUMN IF EXISTS default_phase_template_id;
```

### `item`

Backfill before NOT NULL:

```sql
-- For each item with no category_id: set from sole item_category row, or deepest link, or FAIL
UPDATE item i SET category_id = ( … ) WHERE i.category_id IS NULL;

ALTER TABLE item
  ALTER COLUMN category_id SET NOT NULL,
  DROP COLUMN IF EXISTS phase_template_id;
```

### `estimate_line`

```sql
ALTER TABLE estimate_line
  ADD COLUMN IF NOT EXISTS unit_freight NUMERIC NOT NULL DEFAULT 0;
```

---

## Step 3 — Drop retired objects

Order matters for FKs.

```sql
-- 1. Drop item_category after item.category_id backfill
DROP TABLE item_category;

-- 2. scope_phase → phase_template_step (if job tables exist on dev)
ALTER TABLE scope_phase DROP COLUMN IF EXISTS phase_template_step_id;

-- 3. Drop legacy incidental + templates
DROP TABLE incidental_rate_type;
DROP TABLE phase_template_step;
DROP TABLE phase_template;

-- 4. Optional cleanup (unused for costing since 37f O3)
ALTER TABLE estimate_scope
  DROP COLUMN IF EXISTS markup_type_id,
  DROP COLUMN IF EXISTS labor_context_type_id;
```

---

## Step 4 — Grants

Grant `latch_app` on all new tables (same pattern as **033**).

---

## Backfill rules

| Data | Rule |
|------|------|
| `item.category_id` | One link per item from `item_category`; prefer deepest category in tree; **raise** if zero or ambiguous without tie-break column |
| `cost_add_on_type` | No seed — empty |
| Commercial FKs on category | No seed |

---

## Smoke queries (post-apply)

```sql
-- item_category gone
SELECT to_regclass('public.item_category');  -- null

-- item.category_id populated
SELECT COUNT(*) FROM item WHERE category_id IS NULL;  -- 0

-- phase_template gone
SELECT to_regclass('public.phase_template');  -- null

-- line freight column
SELECT unit_freight FROM estimate_line LIMIT 1;
```

---

## Rollback

Dev-only: restore from backup or reverse migration script (not shipped v1).

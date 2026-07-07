# Migration 040b — commercial costing plan

> **Task:** [37g](../tasks/37g-commercial-costing.md) · **Status:** Plan (2026-07-06) · **Prerequisite:** **040a** applied ([37i](../tasks/37i-unified-item-tree-apply.md) ✅).
>
> **Supersedes** the monolithic **040** plan (2026-07-04). Structural merge (`category` → `item`, drop `item_category`, `root_item_id`, …) is **040a only** — do not repeat here. **Decisions:** [catalog D4–D6](../decisions/catalog.md#decision-unified-item-tree--merge-category--item-node-anchored-estimate-lines-2026-07-05).

---

## Summary

Introduce org commercial catalogs (`labor_phase`, `cost_add_on_type`, `complexity_factor`), **item node** commercial junction/FKs (`item_labor_phase` + freight/incidental/markup on `item`), split markup, **`unit_freight`** + **`lock`** on lines, **complexity** on estimate scope/zone, and drop retired `phase_template` / legacy `incidental_rate_type` / `part_locked` / `material_status`.

**SQL file:** `migrations/040b_commercial_costing.sql`

---

## Out of scope (already in 040a)

| Change | Migration |
|--------|-----------|
| Merge `category` + legacy `item` → unified `item` tree | **040a** |
| Drop `item_category`, `item.kind`, `estimate_line.line_kind` | **040a** |
| `estimate_scope.root_item_id`, `part_item`, `spec_def.item_id`, … | **040a** |
| Branch-selectable item picker | **040a** (D8c) |

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

### `item_labor_phase`

```sql
CREATE TABLE item_labor_phase (
  item_id             TEXT NOT NULL REFERENCES item (id) ON DELETE CASCADE,
  labor_phase_id      TEXT NOT NULL REFERENCES labor_phase (id) ON DELETE RESTRICT,
  labor_rate_type_id  TEXT NOT NULL REFERENCES labor_rate_type (id) ON DELETE RESTRICT,
  hours_per_unit      NUMERIC NOT NULL DEFAULT 0,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, labor_phase_id)
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

Org catalog only — assigned on **`estimate_scope`** / **`estimate_zone`**, not on `item` (D5).

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
ALTER TABLE markup_type DROP COLUMN IF EXISTS markup_percent;
```

### `labor_rate_type`

```sql
ALTER TABLE labor_rate_type DROP COLUMN IF EXISTS labor_class_id;
```

### `item`

Commercial policy FKs on any tree node. **No** `complexity_factor_id` on `item` (D5).

```sql
ALTER TABLE item
  ADD COLUMN freight_rate_type_id     TEXT REFERENCES cost_add_on_type (id) ON DELETE SET NULL,
  ADD COLUMN incidental_rate_type_id  TEXT REFERENCES cost_add_on_type (id) ON DELETE SET NULL,
  ADD COLUMN markup_type_id           TEXT REFERENCES markup_type (id) ON DELETE SET NULL;

ALTER TABLE item DROP COLUMN IF EXISTS default_phase_template_id;
```

### `estimate_scope`

```sql
ALTER TABLE estimate_scope
  ADD COLUMN complexity_factor_id TEXT REFERENCES complexity_factor (id) ON DELETE SET NULL;
```

### `estimate_zone`

```sql
ALTER TABLE estimate_zone
  ADD COLUMN complexity_factor_id TEXT REFERENCES complexity_factor (id) ON DELETE SET NULL;
```

### `estimate_line`

```sql
ALTER TABLE estimate_line
  ADD COLUMN IF NOT EXISTS unit_freight NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE estimate_line
  ADD COLUMN lock TEXT NOT NULL DEFAULT 'none'
  CHECK (lock IN ('none', 'sell', 'line'));

-- Best-effort: legacy PN freeze → full line lock (D6b)
UPDATE estimate_line SET lock = 'line' WHERE part_locked = true;

ALTER TABLE estimate_line DROP COLUMN IF EXISTS part_locked;
ALTER TABLE estimate_line DROP COLUMN IF EXISTS material_status;
```

---

## Step 3 — Drop retired objects

Order matters for FKs.

```sql
-- 1. scope_phase → phase_template_step (if job tables exist on dev)
ALTER TABLE scope_phase DROP COLUMN IF EXISTS phase_template_step_id;

-- 2. Drop legacy incidental + templates
DROP TABLE IF EXISTS incidental_rate_type;
DROP TABLE IF EXISTS phase_template_step;
DROP TABLE IF EXISTS phase_template;

-- 3. Unused estimate_scope costing columns (037f O3 — rate types resolve from item tree)
ALTER TABLE estimate_scope
  DROP COLUMN IF EXISTS markup_type_id,
  DROP COLUMN IF EXISTS labor_context_type_id;
```

---

## Step 4 — Grants

Grant `latch_app` on all new tables (`labor_phase`, `item_labor_phase`, `cost_add_on_type`, `complexity_factor`) — same `DO $$` pattern as **033** / **040a**.

---

## Backfill rules

| Data | Rule |
|------|------|
| `item_labor_phase` | No seed — empty |
| `cost_add_on_type` | No seed — empty |
| Commercial FKs on `item` | No seed — nullable |
| `complexity_factor` | No seed — empty |
| `estimate_line.lock` | `part_locked = true` → `'line'`; else `'none'` |
| `unit_freight` | Default `0` on existing lines |

---

## Smoke queries (post-apply)

```sql
-- 040a still green
SELECT to_regclass('public.item_category');           -- null
SELECT to_regclass('public.category');                -- null

-- new commercial tables
SELECT to_regclass('public.item_labor_phase');        -- not null
SELECT to_regclass('public.cost_add_on_type');        -- not null
SELECT to_regclass('public.complexity_factor');       -- not null

-- item commercial FKs (columns exist)
SELECT freight_rate_type_id FROM item LIMIT 1;

-- scope/zone complexity
SELECT complexity_factor_id FROM estimate_scope LIMIT 1;
SELECT complexity_factor_id FROM estimate_zone LIMIT 1;

-- line columns
SELECT unit_freight, lock FROM estimate_line LIMIT 1;

-- retired
SELECT to_regclass('public.incidental_rate_type');    -- null
SELECT to_regclass('public.phase_template');          -- null
SELECT COUNT(*) FROM information_schema.columns
 WHERE table_name = 'estimate_line' AND column_name IN ('part_locked', 'material_status');  -- 0
```

---

## Apply

```bash
cd apps/subhub
node ../../scripts/db-migrate.mjs --dir=. --only=040b_commercial_costing.sql
```

---

## Rollback

Dev-only: restore from backup or reverse migration script (not shipped v1).

---

## Related

- [040a — unified item tree](./040a-unified-item-tree-plan.md)
- [37g — commercial costing task](../tasks/37g-commercial-costing.md)
- [37i — 040a apply](../tasks/37i-unified-item-tree-apply.md)

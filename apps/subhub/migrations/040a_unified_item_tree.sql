-- SubHub: unified item tree — merge category + legacy item (task 37i / migration 040a).
-- Plan: docs/migrations/040a-unified-item-tree-plan.md
-- Prerequisite: 039 applied.

BEGIN;

-- ─── 0. Pre-flight guards ────────────────────────────────────────────────────

DO $$
DECLARE
  collision_count INTEGER;
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*)::int INTO collision_count
  FROM item i
  INNER JOIN category c ON c.id = i.id;

  IF collision_count > 0 THEN
    RAISE EXCEPTION '040a pre-flight failed: % item/category id collision(s)', collision_count;
  END IF;

  SELECT COUNT(*)::int INTO orphan_count
  FROM item i
  LEFT JOIN item_category ic ON ic.item_id = i.id
  WHERE ic.item_id IS NULL
    AND i.category_id IS NULL;

  IF orphan_count > 0 THEN
    RAISE EXCEPTION '040a pre-flight failed: % legacy item(s) without placement', orphan_count;
  END IF;
END
$$;

-- ─── 1. Extend category with legacy-item columns ───────────────────────────

ALTER TABLE category
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS default_part_id TEXT REFERENCES manufacturer_part (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_vendor_part_id TEXT,
  ADD COLUMN IF NOT EXISTS fallback_unit_cost NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labor_class_id TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ─── 2. Merge legacy item rows into category (D8a deepest-link backfill) ─────

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
),
backfill AS (
  SELECT item_id, parent_id
  FROM ranked
  WHERE rn = 1
)
INSERT INTO category (
  id,
  name,
  parent_id,
  description,
  default_part_id,
  default_vendor_part_id,
  fallback_unit_cost,
  labor_class_id,
  default_phase_template_id,
  created_at,
  updated_at,
  sort_order
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
INNER JOIN backfill bp ON bp.item_id = i.id
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  unplaced_count INTEGER;
BEGIN
  SELECT COUNT(*)::int INTO unplaced_count
  FROM item i
  WHERE NOT EXISTS (SELECT 1 FROM category c WHERE c.id = i.id);

  IF unplaced_count > 0 THEN
    RAISE EXCEPTION '040a backfill failed: % legacy item(s) not merged into category', unplaced_count;
  END IF;
END
$$;

-- ─── 3. Drop legacy placement + item table ───────────────────────────────────

DROP TABLE item_category;
DROP TABLE item;

-- ─── 4. Rename category → unified item tree ──────────────────────────────────

ALTER TABLE category RENAME TO item;

ALTER INDEX IF EXISTS category_pkey RENAME TO item_pkey;
ALTER INDEX IF EXISTS category_parent_id_idx RENAME TO item_parent_id_idx;

ALTER TABLE item RENAME CONSTRAINT category_parent_id_fkey TO item_parent_id_fkey;
ALTER TABLE item RENAME CONSTRAINT category_default_phase_template_id_fkey TO item_default_phase_template_id_fkey;

-- ─── 5. Junction + spec rename ─────────────────────────────────────────────────

ALTER TABLE part_category RENAME TO part_item;
ALTER TABLE part_item RENAME COLUMN category_id TO item_id;
ALTER TABLE part_item RENAME CONSTRAINT part_category_pkey TO part_item_pkey;
ALTER TABLE part_item RENAME CONSTRAINT part_category_category_id_fkey TO part_item_item_id_fkey;
ALTER TABLE part_item RENAME CONSTRAINT part_category_part_id_fkey TO part_item_part_id_fkey;

ALTER TABLE category_spec_exclude RENAME TO item_spec_exclude;
ALTER TABLE item_spec_exclude RENAME COLUMN category_id TO item_id;
ALTER TABLE item_spec_exclude RENAME CONSTRAINT category_spec_exclude_pkey TO item_spec_exclude_pkey;
ALTER TABLE item_spec_exclude RENAME CONSTRAINT category_spec_exclude_category_id_fkey TO item_spec_exclude_item_id_fkey;
ALTER TABLE item_spec_exclude RENAME CONSTRAINT category_spec_exclude_spec_def_id_fkey TO item_spec_exclude_spec_def_id_fkey;

ALTER TABLE spec_def RENAME COLUMN category_id TO item_id;
ALTER TABLE spec_def RENAME CONSTRAINT spec_def_category_id_fkey TO spec_def_item_id_fkey;

-- ─── 6. Scope / estimate root FK renames ─────────────────────────────────────

ALTER TABLE site_scope RENAME COLUMN root_category_id TO root_item_id;
ALTER TABLE site_scope RENAME CONSTRAINT site_scope_root_category_id_fkey TO site_scope_root_item_id_fkey;

ALTER TABLE estimate_scope RENAME COLUMN root_category_id TO root_item_id;
ALTER TABLE estimate_scope RENAME CONSTRAINT estimate_scope_root_category_id_fkey TO estimate_scope_root_item_id_fkey;

ALTER TABLE estimate RENAME COLUMN category_id TO item_id;

-- ─── 7. estimate_line — drop line_kind (D2) ────────────────────────────────

ALTER TABLE estimate_line DROP CONSTRAINT IF EXISTS estimate_line_kind_check;
ALTER TABLE estimate_line DROP COLUMN IF EXISTS line_kind;

-- ─── 8. Grants ───────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      item,
      part_item,
      item_spec_exclude
    TO latch_app;
  END IF;
END
$$;

-- Codegen DDL anchor — physical `item` is `category` from 033 renamed above; IF NOT EXISTS is a no-op at apply time.
CREATE TABLE IF NOT EXISTS item (
  id                          TEXT PRIMARY KEY,
  name                        TEXT NOT NULL,
  parent_id                   TEXT,
  sort_order                  INTEGER NOT NULL DEFAULT 0,
  csi_code                    TEXT,
  default_phase_template_id   TEXT
);

COMMIT;

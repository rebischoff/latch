-- SubHub: unify site_scope + site_zone into one self-referencing tree (task 42a).
-- Prerequisite: 071 applied. Prefer preserving site_scope.id as root site_zone.id.

BEGIN;

-- ─── 1. Add root_item_id on site_zone ───────────────────────────────────────

ALTER TABLE site_zone
  ADD COLUMN IF NOT EXISTS root_item_id TEXT;

-- ─── 2. Map scope ids → root zone ids (preserve id when no collision) ───────

CREATE TEMP TABLE scope_to_root ON COMMIT DROP AS
SELECT
  ss.id AS old_scope_id,
  CASE
    WHEN EXISTS (SELECT 1 FROM site_zone sz WHERE sz.id = ss.id)
      THEN gen_random_uuid()::text
    ELSE ss.id
  END AS new_root_id,
  ss.site_id,
  ss.root_item_id,
  ss.name,
  ss.sort_order,
  ss.status
FROM site_scope ss;

-- ─── 3. Insert root site_zone rows (one per former site_scope) ──────────────

INSERT INTO site_zone (
  id,
  site_id,
  site_scope_id,
  parent_zone_id,
  root_item_id,
  name,
  sort_order,
  status
)
SELECT
  m.new_root_id,
  m.site_id,
  m.old_scope_id,
  NULL,
  m.root_item_id,
  m.name,
  m.sort_order,
  m.status
FROM scope_to_root m;

-- ─── 4. Reparent former top-level zones under their root ────────────────────
-- Deep children already have parent_zone_id; only null-parent non-roots move.

UPDATE site_zone sz
SET parent_zone_id = m.new_root_id
FROM scope_to_root m
WHERE sz.root_item_id IS NULL
  AND sz.parent_zone_id IS NULL
  AND sz.site_scope_id = m.old_scope_id;

-- ─── 5. Collapse site_asset dual FKs → site_zone_id ─────────────────────────

UPDATE site_asset sa
SET site_zone_id = COALESCE(sa.site_zone_id, m.new_root_id)
FROM scope_to_root m
WHERE sa.site_scope_id = m.old_scope_id
  AND sa.site_zone_id IS NULL;

ALTER TABLE site_asset
  DROP CONSTRAINT IF EXISTS site_asset_site_system_id_fkey;

ALTER TABLE site_asset
  DROP COLUMN IF EXISTS site_scope_id;

-- ─── 6. Collapse job_scope_group dual FKs when table exists ──────────────────

DO $$
BEGIN
  IF to_regclass('public.job_scope_group') IS NOT NULL THEN
    UPDATE job_scope_group jsg
    SET site_zone_id = COALESCE(jsg.site_zone_id, m.new_root_id)
    FROM scope_to_root m
    WHERE jsg.site_scope_id = m.old_scope_id
      AND jsg.site_zone_id IS NULL;

    ALTER TABLE job_scope_group
      DROP CONSTRAINT IF EXISTS job_scope_group_site_scope_id_fkey;

    ALTER TABLE job_scope_group
      DROP COLUMN IF EXISTS site_scope_id;
  END IF;
END
$$;

-- ─── 7. Drop site_zone.site_scope_id + site_scope table ─────────────────────

ALTER TABLE site_zone
  DROP CONSTRAINT IF EXISTS site_area_site_system_id_fkey;

ALTER TABLE site_zone
  DROP COLUMN IF EXISTS site_scope_id;

DROP TABLE IF EXISTS site_scope;

-- ─── 8. FK root_item_id → item ──────────────────────────────────────────────

ALTER TABLE site_zone
  DROP CONSTRAINT IF EXISTS site_zone_root_item_id_fkey;

ALTER TABLE site_zone
  ADD CONSTRAINT site_zone_root_item_id_fkey
  FOREIGN KEY (root_item_id) REFERENCES item (id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS site_zone_site_id_idx ON site_zone (site_id);
CREATE INDEX IF NOT EXISTS site_zone_parent_zone_id_idx ON site_zone (parent_zone_id);

COMMIT;

-- SubHub: leaf-quotable item model (task 37l / migration 044).
-- Prerequisite: 040a + 040b applied.
BEGIN;

-- 1. Discriminator column (default 'category'; backfilled below)
ALTER TABLE item
  ADD COLUMN IF NOT EXISTS node_type TEXT NOT NULL DEFAULT 'category'
  CHECK (node_type IN ('scope', 'category', 'item'));

-- 2. Backfill from structure: root -> scope, childless -> item, internal -> category
UPDATE item i
SET node_type = CASE
  WHEN i.parent_id IS NULL THEN 'scope'
  WHEN NOT EXISTS (SELECT 1 FROM item c WHERE c.parent_id = i.id) THEN 'item'
  ELSE 'category'
END;

-- 3. I1 — scope <=> root; item must have a parent
ALTER TABLE item
  ADD CONSTRAINT item_node_type_scope_root_chk
  CHECK ((node_type = 'scope') = (parent_id IS NULL));

-- 4. Dev repair — repoint lines anchored on non-leaf nodes to first descendant leaf.
UPDATE estimate_line el
SET item_id = sub.leaf_id
FROM (
  SELECT el2.id AS line_id,
         (
           WITH RECURSIVE descendants AS (
             SELECT i.id, i.node_type
             FROM item i
             WHERE i.id = el2.item_id
             UNION ALL
             SELECT c.id, c.node_type
             FROM item c
             INNER JOIN descendants d ON c.parent_id = d.id
           )
           SELECT d.id AS leaf_id
           FROM descendants d
           WHERE d.node_type = 'item'
           ORDER BY d.id
           LIMIT 1
         ) AS leaf_id
  FROM estimate_line el2
  INNER JOIN item anchor ON anchor.id = el2.item_id
  WHERE anchor.node_type <> 'item'
) sub
WHERE el.id = sub.line_id
  AND sub.leaf_id IS NOT NULL;

-- 5. Pre-flight — reject if any estimate line anchors a non-quotable node (I5).
--    Dev data is reseedable (043 fire-alarm seed); fail loudly so the operator fixes seeds.
DO $$
DECLARE bad_lines INTEGER;
BEGIN
  SELECT COUNT(*)::int INTO bad_lines
  FROM estimate_line el
  INNER JOIN item i ON i.id = el.item_id
  WHERE i.node_type <> 'item';

  IF bad_lines > 0 THEN
    RAISE EXCEPTION '044 pre-flight failed: % estimate_line(s) anchor a non-item node — reseed or repoint to quotable leaves', bad_lines;
  END IF;
END $$;

-- 6. Optional DB defense-in-depth for I2 (primary enforcement is the DAL — Step 3).
CREATE OR REPLACE FUNCTION item_enforce_leaf() RETURNS trigger AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL
     AND (SELECT node_type FROM item WHERE id = NEW.parent_id) = 'item' THEN
    RAISE EXCEPTION 'cannot add child under quotable item %', NEW.parent_id;
  END IF;
  IF NEW.node_type = 'item'
     AND EXISTS (SELECT 1 FROM item c WHERE c.parent_id = NEW.id) THEN
    RAISE EXCEPTION 'item % has children; cannot be quotable', NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS item_enforce_leaf_biu ON item;
CREATE TRIGGER item_enforce_leaf_biu
  BEFORE INSERT OR UPDATE ON item
  FOR EACH ROW EXECUTE FUNCTION item_enforce_leaf();

-- Codegen DDL anchor — no-op at apply time (column added above).
CREATE TABLE IF NOT EXISTS item (
  id                      TEXT PRIMARY KEY,
  name                    TEXT NOT NULL,
  parent_id               TEXT,
  node_type               TEXT NOT NULL DEFAULT 'category',
  sort_order              INTEGER NOT NULL DEFAULT 0,
  csi_code                TEXT,
  freight_rate_type_id    TEXT,
  incidental_rate_type_id TEXT,
  markup_type_id          TEXT,
  fallback_unit_cost      NUMERIC NOT NULL DEFAULT 0
);

COMMIT;

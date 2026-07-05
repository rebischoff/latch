-- SubHub: spec ownership column — spec_def.category_id; drop category_spec_def (038).
-- Collapses 1:1 assignment table into an owner column; derives namespace from tree.
-- Decision: catalog spec ownership (2026-07-04).

BEGIN;

-- 1. New owner column (nullable during backfill).
ALTER TABLE spec_def ADD COLUMN category_id text;

-- 2. Backfill: explicit assignment wins; else fall back to namespace root
--    (unassigned defs become owned by their scope root and inherit downward).
UPDATE spec_def sd
SET category_id = COALESCE(
  (SELECT csd.category_id
   FROM category_spec_def csd
   WHERE csd.spec_def_id = sd.id
   LIMIT 1),
  sd.root_category_id
);

-- 3. Enforce + wire FK.
ALTER TABLE spec_def ALTER COLUMN category_id SET NOT NULL;
ALTER TABLE spec_def
  ADD CONSTRAINT spec_def_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES category (id) ON DELETE CASCADE;

-- 4. Drop the redundant assignment table + old namespace column.
DROP TABLE category_spec_def;
ALTER TABLE spec_def DROP COLUMN root_category_id;

COMMIT;

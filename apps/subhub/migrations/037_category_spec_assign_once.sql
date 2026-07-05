-- SubHub: category_spec_def assign-once — UNIQUE(spec_def_id) (37d3).
-- Keeps shallowest assignment per spec_def_id; drops deeper duplicates.

BEGIN;

WITH RECURSIVE category_depth AS (
  SELECT id, parent_id, 0 AS depth
  FROM category
  WHERE parent_id IS NULL
  UNION ALL
  SELECT c.id, c.parent_id, cd.depth + 1
  FROM category c
  JOIN category_depth cd ON c.parent_id = cd.id
),
ranked AS (
  SELECT
    csd.category_id,
    csd.spec_def_id,
    ROW_NUMBER() OVER (
      PARTITION BY csd.spec_def_id
      ORDER BY cd.depth ASC, csd.sort_order ASC, csd.category_id ASC
    ) AS rn
  FROM category_spec_def csd
  JOIN category_depth cd ON cd.id = csd.category_id
)
DELETE FROM category_spec_def csd
USING ranked r
WHERE csd.category_id = r.category_id
  AND csd.spec_def_id = r.spec_def_id
  AND r.rn > 1;

CREATE UNIQUE INDEX category_spec_def_spec_def_id_unique
  ON category_spec_def (spec_def_id);

COMMIT;

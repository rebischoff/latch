-- SubHub: snapshot catalog item_id on job_material_request + purchase_order_line (task 59 IT1/IT2/IT7).
-- Prerequisite: 087 applied.

BEGIN;

ALTER TABLE job_material_request
  ADD COLUMN IF NOT EXISTS item_id TEXT REFERENCES item (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS job_material_request_item_id_idx
  ON job_material_request (item_id)
  WHERE item_id IS NOT NULL;

COMMENT ON COLUMN job_material_request.item_id IS
  'Catalog item snapshot from job_line.item_id at Field ☐ Order (task 59 IT1). Null = ad-hoc or job line had no item. Not inferred from PN; not user-editable after create.';

ALTER TABLE purchase_order_line
  ADD COLUMN IF NOT EXISTS item_id TEXT REFERENCES item (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS purchase_order_line_item_id_idx
  ON purchase_order_line (item_id)
  WHERE item_id IS NOT NULL;

COMMENT ON COLUMN purchase_order_line.item_id IS
  'Copied from the source job_material_request.item_id at Create POs / PO9 (task 59 IT2). Null for ad-hoc with no backing item.';

-- Backfill (IT7): job_material_request.item_id from job_line_part -> job_line.item_id.
UPDATE job_material_request jmr
SET item_id = jl.item_id
FROM job_line_part jlp
INNER JOIN job_line jl ON jl.id = jlp.job_line_id
WHERE jmr.job_line_part_id = jlp.id
  AND jl.item_id IS NOT NULL
  AND jmr.item_id IS NULL;

-- Backfill (IT7): purchase_order_line.item_id — prefer its own job_line_part_id join,
-- else fall back to the (now-backfilled) item_id on its originating job_material_request.
UPDATE purchase_order_line pol
SET item_id = jl.item_id
FROM job_line_part jlp
INNER JOIN job_line jl ON jl.id = jlp.job_line_id
WHERE pol.job_line_part_id = jlp.id
  AND jl.item_id IS NOT NULL
  AND pol.item_id IS NULL;

UPDATE purchase_order_line pol
SET item_id = src.item_id
FROM (
  SELECT DISTINCT ON (pols.purchase_order_line_id)
    pols.purchase_order_line_id,
    jmr.item_id
  FROM purchase_order_line_source pols
  INNER JOIN job_material_request jmr ON jmr.id = pols.job_material_request_id
  WHERE jmr.item_id IS NOT NULL
  ORDER BY pols.purchase_order_line_id, jmr.requested_at ASC
) src
WHERE pol.id = src.purchase_order_line_id
  AND pol.item_id IS NULL;

COMMIT;

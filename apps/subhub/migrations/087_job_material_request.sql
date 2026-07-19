-- SubHub: collapse requested_order* into flat job_material_request (task 56).
-- Also: purchase_order_line_source join table (PO7–PO9); drop purchase_order_line.requested_order_line_id.
-- Prerequisite: 086 applied.

BEGIN;

CREATE TABLE IF NOT EXISTS job_material_request (
  id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_id             TEXT NOT NULL REFERENCES job (id) ON DELETE CASCADE,
  site_zone_id       TEXT REFERENCES site_zone (id) ON DELETE RESTRICT,
  job_line_part_id   TEXT REFERENCES job_line_part (id) ON DELETE SET NULL,
  part_id            TEXT REFERENCES manufacturer_part (id) ON DELETE SET NULL,
  description        TEXT NOT NULL DEFAULT '',
  quantity           NUMERIC NOT NULL DEFAULT 1,
  unit               TEXT NOT NULL DEFAULT 'ea',
  status             TEXT NOT NULL DEFAULT 'open',
  requested_by       TEXT REFERENCES employee (party_id) ON DELETE SET NULL,
  requested_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT job_material_request_status_check
    CHECK (status IN ('open', 'on_purchase_order', 'fulfilled')),
  CONSTRAINT job_material_request_quantity_check CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS job_material_request_job_id_idx
  ON job_material_request (job_id);
CREATE INDEX IF NOT EXISTS job_material_request_site_zone_id_idx
  ON job_material_request (site_zone_id)
  WHERE site_zone_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS job_material_request_job_line_part_id_idx
  ON job_material_request (job_line_part_id)
  WHERE job_line_part_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS job_material_request_status_idx
  ON job_material_request (status);

COMMENT ON TABLE job_material_request IS
  'Flat material request — Field ☐ Order or Field ad-hoc (task 56 RQ1–RQ4). Null site_zone_id = General; null job_line_part_id = ad-hoc. Status: open | on_purchase_order | fulfilled (no withdrawn).';

COMMENT ON COLUMN job_material_request.site_zone_id IS
  'Field zone geography — FK → site_zone; null = General.';

-- Backfill: one job_material_request per prior requested_order_line (carry job_id from header).
-- Preserve line ids so purchase_order_line.requested_order_line_id can map 1:1 into source rows.
INSERT INTO job_material_request (
  id, job_id, site_zone_id, job_line_part_id, part_id,
  description, quantity, unit, status, requested_by, requested_at, updated_at
)
SELECT
  rol.id,
  ro.job_id,
  rol.site_zone_id,
  rol.job_line_part_id,
  rol.part_id,
  rol.description,
  rol.quantity,
  rol.unit,
  CASE
    WHEN rol.status IN ('open', 'on_purchase_order', 'fulfilled') THEN rol.status
    ELSE 'open'
  END,
  ro.requested_by,
  ro.requested_at,
  COALESCE(ro.updated_at, now())
FROM requested_order_line rol
INNER JOIN requested_order ro ON ro.id = rol.requested_order_id
WHERE rol.status <> 'withdrawn'
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS purchase_order_line_source (
  id                       TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  purchase_order_line_id   TEXT NOT NULL REFERENCES purchase_order_line (id) ON DELETE CASCADE,
  job_material_request_id  TEXT NOT NULL REFERENCES job_material_request (id) ON DELETE RESTRICT,
  quantity                 NUMERIC NOT NULL,
  CONSTRAINT purchase_order_line_source_quantity_check CHECK (quantity > 0),
  CONSTRAINT purchase_order_line_source_unique
    UNIQUE (purchase_order_line_id, job_material_request_id)
);

CREATE INDEX IF NOT EXISTS purchase_order_line_source_line_id_idx
  ON purchase_order_line_source (purchase_order_line_id);
CREATE INDEX IF NOT EXISTS purchase_order_line_source_request_id_idx
  ON purchase_order_line_source (job_material_request_id);

COMMENT ON TABLE purchase_order_line_source IS
  'PO line → N originating job_material_request rows with qty split (task 56 PO7–PO9). Sum of source qty must equal line qty (app-level).';

-- Backfill: prior 1:1 requested_order_line_id → full-qty single source (only for non-withdrawn lines that survived).
INSERT INTO purchase_order_line_source (
  id, purchase_order_line_id, job_material_request_id, quantity
)
SELECT
  gen_random_uuid()::text,
  pol.id,
  pol.requested_order_line_id,
  pol.quantity
FROM purchase_order_line pol
INNER JOIN job_material_request jmr ON jmr.id = pol.requested_order_line_id
WHERE pol.requested_order_line_id IS NOT NULL
ON CONFLICT (purchase_order_line_id, job_material_request_id) DO NOTHING;

DROP INDEX IF EXISTS purchase_order_line_requested_order_line_id_idx;

ALTER TABLE purchase_order_line
  DROP COLUMN IF EXISTS requested_order_line_id;

COMMENT ON TABLE purchase_order_line IS
  'Purchase order line — total qty/price snapshot; per-portion schedule on purchase_order_line_shipment. Originating requests via purchase_order_line_source; BOM via job_line_part_id (task 56).';

DROP TABLE IF EXISTS requested_order_line;
DROP TABLE IF EXISTS requested_order;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      job_material_request,
      purchase_order_line_source
    TO latch_app;
  END IF;
END
$$;

COMMIT;

-- SubHub: requisition + purchase-order DDL (task 52 — Requisition Surfaces, wave 6a′).
-- Layers: requested_order* (requisition intent) + purchase_order* (vendor commitment, R5 —
-- migrated now for FK readiness; no PO Surfaces / workbench until task 53).
-- No place FKs on requested_order_line v1 (dropped site_area_id/site_asset_id — see
-- docs/decisions/procurement.md R2/pins). `phase_id` is DDL-only / no UI (`phase` table was
-- retired in migration 045 — column kept nullable with no FK enforced).
-- No material_receipt* / job_material_movement — deferred to task 54.
-- Prerequisite: 083 applied.

BEGIN;

CREATE TABLE IF NOT EXISTS requested_order (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_id        TEXT NOT NULL REFERENCES job (id) ON DELETE CASCADE,
  phase_id      TEXT,
  requested_by  TEXT REFERENCES employee (party_id) ON DELETE SET NULL,
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  note          TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS requested_order_job_id_idx ON requested_order (job_id);

COMMENT ON COLUMN requested_order.phase_id IS
  'Reserved batch tag (e.g. prewire) — DDL only, no UI v1. No FK: phase table was retired in migration 045.';

COMMENT ON TABLE requested_order IS
  'Requisition header — PM or site tech asks for parts on a job (engineered BOM or ad-hoc). Many headers per job allowed; remaining need is job-wide (task 52 R4).';

CREATE TABLE IF NOT EXISTS requested_order_line (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  requested_order_id  TEXT NOT NULL REFERENCES requested_order (id) ON DELETE CASCADE,
  line_number         INTEGER NOT NULL,
  job_line_part_id    TEXT REFERENCES job_line_part (id) ON DELETE SET NULL,
  part_id             TEXT REFERENCES manufacturer_part (id) ON DELETE SET NULL,
  description         TEXT NOT NULL DEFAULT '',
  quantity            NUMERIC NOT NULL DEFAULT 1,
  unit                TEXT NOT NULL DEFAULT 'ea',
  status              TEXT NOT NULL DEFAULT 'open',
  withdrawal_note     TEXT NOT NULL DEFAULT '',
  sort_order          INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT requested_order_line_number_unique UNIQUE (requested_order_id, line_number),
  CONSTRAINT requested_order_line_status_check
    CHECK (status IN ('open', 'on_purchase_order', 'fulfilled', 'withdrawn')),
  CONSTRAINT requested_order_line_quantity_check CHECK (quantity > 0),
  CONSTRAINT requested_order_line_withdrawal_note_check
    CHECK (status <> 'withdrawn' OR length(btrim(withdrawal_note)) > 0)
);

CREATE INDEX IF NOT EXISTS requested_order_line_order_id_idx
  ON requested_order_line (requested_order_id);
CREATE INDEX IF NOT EXISTS requested_order_line_job_line_part_id_idx
  ON requested_order_line (job_line_part_id)
  WHERE job_line_part_id IS NOT NULL;

COMMENT ON TABLE requested_order_line IS
  'Requisition line — engineered (job_line_part_id set) or ad-hoc (part_id and/or description). Lifecycle: open -> on_purchase_order -> fulfilled, or open -> withdrawn (withdrawal_note required). No site_area_id/site_asset_id v1 (task 52 pins).';

CREATE TABLE IF NOT EXISTS purchase_order (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_id           TEXT NOT NULL REFERENCES job (id) ON DELETE RESTRICT,
  vendor_party_id  TEXT NOT NULL REFERENCES party (id) ON DELETE RESTRICT,
  po_number        TEXT,
  status           TEXT NOT NULL DEFAULT 'draft',
  delivery_method  TEXT,
  ship_to_note     TEXT NOT NULL DEFAULT '',
  order_date       DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT purchase_order_status_check
    CHECK (status IN ('draft', 'sent', 'received', 'cancelled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS purchase_order_po_number_unique
  ON purchase_order (po_number)
  WHERE po_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS purchase_order_job_id_idx ON purchase_order (job_id);

COMMENT ON TABLE purchase_order IS
  'Vendor commitment from a job — one draft PO per (job, vendor) batch (task 53 R5). Migrated with requested_order* for FK readiness; no PO Surfaces until task 53.';

CREATE TABLE IF NOT EXISTS purchase_order_line (
  id                        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  purchase_order_id         TEXT NOT NULL REFERENCES purchase_order (id) ON DELETE CASCADE,
  line_number               INTEGER NOT NULL,
  description               TEXT NOT NULL DEFAULT '',
  quantity                  NUMERIC NOT NULL DEFAULT 1,
  unit                      TEXT NOT NULL DEFAULT 'ea',
  unit_price                NUMERIC NOT NULL DEFAULT 0,
  part_id                   TEXT REFERENCES manufacturer_part (id) ON DELETE SET NULL,
  vendor_part_id            TEXT REFERENCES vendor_part (id) ON DELETE SET NULL,
  job_line_id               TEXT REFERENCES job_line (id) ON DELETE SET NULL,
  job_line_part_id          TEXT REFERENCES job_line_part (id) ON DELETE SET NULL,
  requested_order_line_id   TEXT REFERENCES requested_order_line (id) ON DELETE SET NULL,
  status                    TEXT NOT NULL DEFAULT 'draft',
  ordered_at                TIMESTAMPTZ,
  rejection_note            TEXT NOT NULL DEFAULT '',
  sort_order                INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT purchase_order_line_number_unique UNIQUE (purchase_order_id, line_number),
  CONSTRAINT purchase_order_line_status_check
    CHECK (status IN ('draft', 'ordered', 'acknowledged', 'partial', 'received', 'cancelled', 'rejected'))
);

CREATE INDEX IF NOT EXISTS purchase_order_line_po_id_idx ON purchase_order_line (purchase_order_id);
CREATE INDEX IF NOT EXISTS purchase_order_line_requested_order_line_id_idx
  ON purchase_order_line (requested_order_line_id)
  WHERE requested_order_line_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS purchase_order_line_job_line_part_id_idx
  ON purchase_order_line (job_line_part_id)
  WHERE job_line_part_id IS NOT NULL;

COMMENT ON TABLE purchase_order_line IS
  'Purchase order line — total qty/price snapshot; per-portion schedule on purchase_order_line_shipment. Links requisition (requested_order_line_id) and/or BOM (job_line_part_id) for traceability (task 53).';

CREATE TABLE IF NOT EXISTS purchase_order_line_shipment (
  id                     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  purchase_order_line_id TEXT NOT NULL REFERENCES purchase_order_line (id) ON DELETE CASCADE,
  shipment_number        INTEGER NOT NULL,
  quantity               NUMERIC NOT NULL DEFAULT 1,
  eta_date               DATE,
  delivered_at           TIMESTAMPTZ,
  received_at            TIMESTAMPTZ,
  status                 TEXT NOT NULL DEFAULT 'scheduled',
  sort_order             INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT purchase_order_line_shipment_number_unique
    UNIQUE (purchase_order_line_id, shipment_number),
  CONSTRAINT purchase_order_line_shipment_status_check
    CHECK (status IN ('scheduled', 'shipped', 'delivered', 'received', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS purchase_order_line_shipment_line_id_idx
  ON purchase_order_line_shipment (purchase_order_line_id);

COMMENT ON TABLE purchase_order_line_shipment IS
  'Split delivery schedule for one purchase_order_line — qty + eta/delivered/received per portion. Single delivery = one shipment row with full line qty (task 53/54).';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      requested_order,
      requested_order_line,
      purchase_order,
      purchase_order_line,
      purchase_order_line_shipment
    TO latch_app;
  END IF;
END
$$;

COMMIT;

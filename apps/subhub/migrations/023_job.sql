-- SubHub business: job slice (task 23 / wave 5a).
-- DDL only — job_line_part, job_work_item, change_order_* deferred to later waves.

BEGIN;

CREATE TABLE job (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  site_id               TEXT NOT NULL REFERENCES site (id) ON DELETE RESTRICT,
  estimate_id           TEXT REFERENCES estimate (id) ON DELETE SET NULL,
  parent_job_id         TEXT REFERENCES job (id) ON DELETE SET NULL,
  job_kind              TEXT NOT NULL DEFAULT 'project',
  billing_model         TEXT NOT NULL DEFAULT 'progress_line',
  billing_basis         TEXT NOT NULL DEFAULT 'qty_installed',
  bill_on_work_status   TEXT NOT NULL DEFAULT 'installed',
  retainage_pct         NUMERIC NOT NULL DEFAULT 0,
  title                 TEXT NOT NULL DEFAULT '',
  status                TEXT NOT NULL DEFAULT 'planned',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT job_kind_check CHECK (job_kind IN ('project', 'service', 'warranty')),
  CONSTRAINT job_billing_model_check CHECK (billing_model IN ('lump_sum', 'progress_line', 'progress_sov', 'tm')),
  CONSTRAINT job_billing_basis_check CHECK (billing_basis IN ('qty_installed', 'qty_received', 'manual')),
  CONSTRAINT job_bill_on_work_status_check CHECK (bill_on_work_status IN ('installed', 'verified')),
  CONSTRAINT job_status_check CHECK (status IN ('planned', 'active', 'complete', 'cancelled'))
);

CREATE INDEX job_site_id_idx ON job (site_id);
CREATE INDEX job_estimate_id_idx ON job (estimate_id);
CREATE INDEX job_parent_job_id_idx ON job (parent_job_id);

CREATE TABLE job_party (
  job_id        TEXT NOT NULL REFERENCES job (id) ON DELETE CASCADE,
  party_id      TEXT NOT NULL REFERENCES party (id) ON DELETE CASCADE,
  relation_id   TEXT NOT NULL REFERENCES job_party_relation (id) ON DELETE RESTRICT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (job_id, party_id, relation_id)
);

CREATE INDEX job_party_job_id_idx ON job_party (job_id);

CREATE TABLE job_line (
  id                          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_id                      TEXT NOT NULL REFERENCES job (id) ON DELETE CASCADE,
  line_number                 INTEGER NOT NULL,
  line_role                   TEXT NOT NULL DEFAULT 'standalone',
  line_kind                   TEXT NOT NULL DEFAULT 'product',
  description                 TEXT NOT NULL DEFAULT '',
  quantity                    NUMERIC NOT NULL DEFAULT 1,
  unit                        TEXT NOT NULL DEFAULT 'ea',
  unit_cost                   NUMERIC NOT NULL DEFAULT 0,
  unit_price                  NUMERIC NOT NULL DEFAULT 0,
  site_location_id            TEXT REFERENCES site_location (id) ON DELETE SET NULL,
  phase_id                    TEXT,
  item_id                     TEXT,
  part_id                     TEXT,
  vendor_part_id              TEXT,
  estimate_line_id            TEXT REFERENCES estimate_line (id) ON DELETE SET NULL,
  change_order_line_id        TEXT,
  parent_line_id              TEXT REFERENCES job_line (id) ON DELETE SET NULL,
  source                      TEXT NOT NULL DEFAULT 'manual',
  status                      TEXT NOT NULL DEFAULT 'active',
  superseded_by_job_line_id   TEXT REFERENCES job_line (id) ON DELETE SET NULL,
  sort_order                  INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT job_line_number_unique UNIQUE (job_id, line_number),
  CONSTRAINT job_line_role_check CHECK (line_role IN ('standalone', 'kit_header', 'kit_component')),
  CONSTRAINT job_line_kind_check CHECK (line_kind IN ('product', 'labor', 'expense')),
  CONSTRAINT job_line_source_check CHECK (source IN ('estimate', 'change_order', 'manual')),
  CONSTRAINT job_line_status_check CHECK (status IN ('active', 'voided', 'superseded'))
);

CREATE INDEX job_line_job_id_idx ON job_line (job_id);
CREATE INDEX job_line_parent_line_id_idx ON job_line (parent_line_id);
CREATE INDEX job_line_estimate_line_id_idx ON job_line (estimate_line_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      job,
      job_party,
      job_line
    TO latch_app;
  END IF;
END
$$;

COMMIT;

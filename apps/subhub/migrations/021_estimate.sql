-- SubHub business: estimate slice (task 22 / wave 4a).
-- DDL only — job_party_relation catalog seed is 022.

BEGIN;

CREATE TABLE job_party_relation (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  display_name  TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT job_party_relation_display_name_unique UNIQUE (display_name)
);

CREATE TABLE estimate (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  site_id             TEXT NOT NULL REFERENCES site (id) ON DELETE RESTRICT,
  title               TEXT NOT NULL DEFAULT '',
  status              TEXT NOT NULL DEFAULT 'draft',
  estimate_date       DATE,
  valid_until         DATE,
  source_estimate_id  TEXT REFERENCES estimate (id) ON DELETE SET NULL,
  category_id         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT estimate_status_check CHECK (status IN ('draft', 'sent', 'won', 'lost', 'expired'))
);

CREATE INDEX estimate_site_id_idx ON estimate (site_id);
CREATE INDEX estimate_source_estimate_id_idx ON estimate (source_estimate_id);

CREATE TABLE estimate_party (
  estimate_id   TEXT NOT NULL REFERENCES estimate (id) ON DELETE CASCADE,
  party_id      TEXT NOT NULL REFERENCES party (id) ON DELETE CASCADE,
  relation_id   TEXT NOT NULL REFERENCES job_party_relation (id) ON DELETE RESTRICT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (estimate_id, party_id, relation_id)
);

CREATE INDEX estimate_party_estimate_id_idx ON estimate_party (estimate_id);

CREATE TABLE estimate_section (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  estimate_id   TEXT NOT NULL REFERENCES estimate (id) ON DELETE CASCADE,
  title         TEXT NOT NULL DEFAULT '',
  category_id   TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX estimate_section_estimate_id_idx ON estimate_section (estimate_id);

CREATE TABLE estimate_line (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  estimate_id           TEXT NOT NULL REFERENCES estimate (id) ON DELETE CASCADE,
  estimate_section_id   TEXT REFERENCES estimate_section (id) ON DELETE SET NULL,
  parent_line_id        TEXT REFERENCES estimate_line (id) ON DELETE SET NULL,
  line_number           INTEGER NOT NULL,
  line_role             TEXT NOT NULL DEFAULT 'standalone',
  line_kind             TEXT NOT NULL DEFAULT 'product',
  description           TEXT NOT NULL DEFAULT '',
  quantity              NUMERIC NOT NULL DEFAULT 1,
  unit                  TEXT NOT NULL DEFAULT 'ea',
  unit_cost             NUMERIC NOT NULL DEFAULT 0,
  unit_price            NUMERIC NOT NULL DEFAULT 0,
  site_location_id      TEXT REFERENCES site_location (id) ON DELETE SET NULL,
  phase_id              TEXT,
  item_id               TEXT,
  part_id               TEXT,
  vendor_part_id        TEXT,
  sort_order            INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT estimate_line_number_unique UNIQUE (estimate_id, line_number),
  CONSTRAINT estimate_line_role_check CHECK (line_role IN ('standalone', 'kit_header', 'kit_component')),
  CONSTRAINT estimate_line_kind_check CHECK (line_kind IN ('product', 'labor', 'expense'))
);

CREATE INDEX estimate_line_estimate_id_idx ON estimate_line (estimate_id);
CREATE INDEX estimate_line_parent_line_id_idx ON estimate_line (parent_line_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      job_party_relation,
      estimate,
      estimate_party,
      estimate_section,
      estimate_line
    TO latch_app;
  END IF;
END
$$;

COMMIT;

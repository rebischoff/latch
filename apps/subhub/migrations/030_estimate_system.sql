-- SubHub business: estimate system backbone (task 31 batch C / estimate backbone).
-- Additive estimate_system + spec tables; swaps estimate_line backbone columns and
-- drops legacy estimate_section. Depends on 028 (system spec defs) + 029 (site_area).

BEGIN;

CREATE TABLE estimate_system (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  estimate_id     TEXT NOT NULL REFERENCES estimate (id) ON DELETE CASCADE,
  system_id       TEXT NOT NULL REFERENCES system (id) ON DELETE RESTRICT,
  site_system_id  TEXT REFERENCES site_system (id) ON DELETE SET NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX estimate_system_estimate_id_idx ON estimate_system (estimate_id);

CREATE TABLE estimate_system_spec (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  estimate_system_id    TEXT NOT NULL REFERENCES estimate_system (id) ON DELETE CASCADE,
  system_spec_def_id    UUID NOT NULL REFERENCES system_spec_def (id) ON DELETE CASCADE,
  system_spec_option_id UUID REFERENCES system_spec_option (id) ON DELETE SET NULL,
  value_text            TEXT,
  value_boolean         BOOLEAN
);

CREATE INDEX estimate_system_spec_estimate_system_id_idx
  ON estimate_system_spec (estimate_system_id);

CREATE TABLE estimate_area_spec (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  estimate_system_id    TEXT NOT NULL REFERENCES estimate_system (id) ON DELETE CASCADE,
  site_area_id          TEXT NOT NULL REFERENCES site_area (id) ON DELETE CASCADE,
  system_spec_def_id    UUID NOT NULL REFERENCES system_spec_def (id) ON DELETE CASCADE,
  system_spec_option_id UUID REFERENCES system_spec_option (id) ON DELETE SET NULL,
  value_text            TEXT,
  value_boolean         BOOLEAN
);

CREATE INDEX estimate_area_spec_estimate_system_id_idx
  ON estimate_area_spec (estimate_system_id);

CREATE TABLE estimate_line_spec (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  estimate_line_id      TEXT NOT NULL REFERENCES estimate_line (id) ON DELETE CASCADE,
  system_spec_def_id    UUID NOT NULL REFERENCES system_spec_def (id) ON DELETE CASCADE,
  system_spec_option_id UUID REFERENCES system_spec_option (id) ON DELETE SET NULL,
  value_text            TEXT,
  value_boolean         BOOLEAN
);

CREATE INDEX estimate_line_spec_estimate_line_id_idx
  ON estimate_line_spec (estimate_line_id);

-- estimate_line backbone column swap (site_area_id / site_asset_id added in 029).
ALTER TABLE estimate_line ADD COLUMN estimate_system_id TEXT REFERENCES estimate_system (id) ON DELETE SET NULL;
ALTER TABLE estimate_line ADD COLUMN material_status TEXT;
ALTER TABLE estimate_line DROP COLUMN estimate_section_id;

CREATE INDEX estimate_line_estimate_system_id_idx ON estimate_line (estimate_system_id);

-- estimate_section has no v1 Surface (E2 locked) — drop after the line FK is gone.
DROP TABLE estimate_section;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      estimate_system,
      estimate_system_spec,
      estimate_area_spec,
      estimate_line_spec
    TO latch_app;
  END IF;
END
$$;

COMMIT;

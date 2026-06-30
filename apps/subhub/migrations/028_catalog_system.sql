-- SubHub business: catalog backbone (task 31 batch A / estimate backbone).
-- Additive DDL only — system / trade / phase templates / system spec defs /
-- manufacturer_part_spec, plus vendor_part.lead_time_days. No business INSERTs;
-- agreed dev seeds are 031.

BEGIN;

-- phase_template first: system.default_phase_template_id references it.
CREATE TABLE phase_template (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE phase_template_step (
  id                        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  phase_template_id         TEXT NOT NULL REFERENCES phase_template (id) ON DELETE CASCADE,
  name                      TEXT NOT NULL,
  sequence                  INTEGER NOT NULL,
  progress_weight           NUMERIC NOT NULL DEFAULT 1,
  billing_weight            NUMERIC NOT NULL DEFAULT 1,
  requires_previous_phase   BOOLEAN NOT NULL DEFAULT false,
  sort_order                INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX phase_template_step_phase_template_id_idx
  ON phase_template_step (phase_template_id);

CREATE TABLE system (
  id                          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name                        TEXT NOT NULL,
  default_phase_template_id   TEXT REFERENCES phase_template (id) ON DELETE SET NULL,
  sort_order                  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE trade (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE system_spec_def (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id     TEXT NOT NULL REFERENCES system (id) ON DELETE CASCADE,
  code          TEXT,
  display_name  TEXT NOT NULL,
  value_type    TEXT NOT NULL DEFAULT 'enum',
  filter_mode   TEXT NOT NULL DEFAULT 'required',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT system_spec_def_value_type_check CHECK (value_type IN ('enum', 'boolean', 'text')),
  CONSTRAINT system_spec_def_filter_mode_check CHECK (filter_mode IN ('required', 'prefer'))
);

CREATE INDEX system_spec_def_system_id_idx ON system_spec_def (system_id);

CREATE TABLE system_spec_option (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_spec_def_id  UUID NOT NULL REFERENCES system_spec_def (id) ON DELETE CASCADE,
  code                TEXT,
  display_name        TEXT NOT NULL,
  sort_order          INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX system_spec_option_system_spec_def_id_idx
  ON system_spec_option (system_spec_def_id);

CREATE TABLE manufacturer_part_spec (
  manufacturer_part_id  TEXT NOT NULL REFERENCES manufacturer_part (id) ON DELETE CASCADE,
  system_spec_def_id    UUID NOT NULL REFERENCES system_spec_def (id) ON DELETE CASCADE,
  system_spec_option_id UUID REFERENCES system_spec_option (id) ON DELETE CASCADE,
  value_text            TEXT,
  value_boolean         BOOLEAN,
  CONSTRAINT manufacturer_part_spec_unique
    UNIQUE (manufacturer_part_id, system_spec_def_id, system_spec_option_id)
);

CREATE INDEX manufacturer_part_spec_def_id_idx
  ON manufacturer_part_spec (system_spec_def_id);

-- Additive procurement column (P1 locked).
ALTER TABLE vendor_part ADD COLUMN lead_time_days INTEGER;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      phase_template,
      phase_template_step,
      system,
      trade,
      system_spec_def,
      system_spec_option,
      manufacturer_part_spec
    TO latch_app;
  END IF;
END
$$;

COMMIT;

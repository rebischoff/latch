-- SubHub: spec threshold presets + bucket range activation (task 37ae).
-- Prerequisite: 059 applied. Decision: docs/decisions/catalog.md A1–T10.

BEGIN;

-- ─── 1. Preset tables ────────────────────────────────────────────────────────

CREATE TABLE spec_threshold_preset (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_def_id      UUID NOT NULL REFERENCES spec_def (id) ON DELETE CASCADE,
  label            TEXT NOT NULL,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  value_number     NUMERIC,
  value_number_max NUMERIC
);

CREATE INDEX spec_threshold_preset_spec_def_id_idx
  ON spec_threshold_preset (spec_def_id);

CREATE TABLE spec_threshold_preset_option (
  preset_id      UUID NOT NULL REFERENCES spec_threshold_preset (id) ON DELETE CASCADE,
  spec_option_id UUID NOT NULL REFERENCES spec_option (id) ON DELETE RESTRICT,
  PRIMARY KEY (preset_id, spec_option_id)
);

CREATE INDEX spec_threshold_preset_option_spec_option_id_idx
  ON spec_threshold_preset_option (spec_option_id);

-- ─── 2. Bucket preset FK ───────────────────────────────────────────────────

ALTER TABLE estimate_condition_spec
  ADD COLUMN IF NOT EXISTS spec_threshold_preset_id UUID
    REFERENCES spec_threshold_preset (id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS estimate_condition_spec_preset_id_idx
  ON estimate_condition_spec (spec_threshold_preset_id)
  WHERE spec_threshold_preset_id IS NOT NULL;

ALTER TABLE estimate_line_spec
  ADD COLUMN IF NOT EXISTS spec_threshold_preset_id UUID
    REFERENCES spec_threshold_preset (id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS estimate_line_spec_preset_id_idx
  ON estimate_line_spec (spec_threshold_preset_id)
  WHERE spec_threshold_preset_id IS NOT NULL;

-- ─── 3. Grants ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      spec_threshold_preset,
      spec_threshold_preset_option
    TO latch_app;
  END IF;
END
$$;

COMMIT;

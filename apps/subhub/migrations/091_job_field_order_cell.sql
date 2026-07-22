-- SubHub: Field zone × phase Order cells (task 62 / JML6–JML9).
-- Mirrors job_field_progress_cell shape; independent axis from Done.
-- Prerequisite: 090 applied.

BEGIN;

CREATE TABLE IF NOT EXISTS job_field_order_cell (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  scope_phase_id TEXT NOT NULL REFERENCES scope_phase (id) ON DELETE CASCADE,
  site_zone_id TEXT REFERENCES site_zone (id) ON DELETE RESTRICT,
  requested BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS job_field_order_cell_phase_zone_unique
  ON job_field_order_cell (scope_phase_id, site_zone_id)
  WHERE site_zone_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS job_field_order_cell_phase_general_unique
  ON job_field_order_cell (scope_phase_id)
  WHERE site_zone_id IS NULL;

COMMENT ON TABLE job_field_order_cell IS
  'Field Order column (task 62 JML6–JML9) — boolean requested-for-ordering per (scope_phase, site_zone | General). Same shape as job_field_progress_cell; independent of Done. Persistent state for live requisitions pool (task 63).';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE job_field_order_cell TO latch_app;
  END IF;
END
$$;

COMMIT;

-- SubHub: job Field progress — zone×phase boolean cells (task 51 / F1–F9).
-- Prerequisite: 078 applied.

BEGIN;

ALTER TABLE job
  ADD COLUMN IF NOT EXISTS field_progress_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN job.field_progress_updated_at IS
  'Last successful field_progress write; stale overlay when in_progress and older than 30 days (task 51).';

COMMENT ON COLUMN job.status IS
  'planned | active | complete | cancelled. cancelled is the only stored lifecycle; not_started / in_progress / completed / stale are derived from field_progress (task 51).';

CREATE TABLE IF NOT EXISTS job_field_progress_cell (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  scope_phase_id TEXT NOT NULL REFERENCES scope_phase (id) ON DELETE CASCADE,
  site_zone_id TEXT REFERENCES site_zone (id) ON DELETE RESTRICT,
  complete BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS job_field_progress_cell_phase_zone_unique
  ON job_field_progress_cell (scope_phase_id, site_zone_id)
  WHERE site_zone_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS job_field_progress_cell_phase_general_unique
  ON job_field_progress_cell (scope_phase_id)
  WHERE site_zone_id IS NULL;

COMMENT ON TABLE job_field_progress_cell IS
  'v1 Field tab snapshot — boolean complete per (scope_phase, site_zone | General). Surface Field field_progress. Do not write progress_entry* from this path (task 51).';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE job_field_progress_cell TO latch_app;
  END IF;
END
$$;

-- Optional geography column for deferred visit ledger; v1 Field does not write progress_entry*.
DO $$
BEGIN
  IF to_regclass('public.progress_entry_line') IS NOT NULL THEN
    ALTER TABLE progress_entry_line
      ADD COLUMN IF NOT EXISTS site_zone_id TEXT;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'progress_entry_line_site_zone_id_fkey'
    ) THEN
      ALTER TABLE progress_entry_line
        ADD CONSTRAINT progress_entry_line_site_zone_id_fkey
        FOREIGN KEY (site_zone_id) REFERENCES site_zone (id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

COMMIT;

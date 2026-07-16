-- SubHub: grant latch_app access to job_field_progress_cell (omitted from 079).
-- Symptom: GET /api/jobs → permission denied for table job_field_progress_cell.

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE job_field_progress_cell TO latch_app;
  END IF;
END
$$;

COMMIT;

-- SubHub: grant latch_app access to spec_unit (omitted from 049).
-- Symptom: item detail Specs tab JOIN spec_unit → permission denied for table spec_unit.

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE spec_unit TO latch_app;
  END IF;
END
$$;

COMMIT;

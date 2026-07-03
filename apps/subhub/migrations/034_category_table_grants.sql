-- SubHub: grant latch_app access to category + item (omitted from 033 §9).
-- Symptom: site detail loadSiteScopes JOIN category → permission denied for table category.

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      category,
      item
    TO latch_app;
  END IF;
END
$$;

COMMIT;

-- SubHub: estimate_zone junction + General estimate_scope row (task 37e).
-- Prerequisite: 033 + 034_category_table_grants applied.
-- Plan: docs/migrations/035-estimate-zone-plan.md

BEGIN;

CREATE TABLE estimate_zone (
  estimate_scope_id  TEXT NOT NULL REFERENCES estimate_scope (id) ON DELETE CASCADE,
  site_zone_id       TEXT NOT NULL REFERENCES site_zone (id) ON DELETE CASCADE,
  sort_order         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (estimate_scope_id, site_zone_id)
);

CREATE INDEX estimate_zone_site_zone_id_idx ON estimate_zone (site_zone_id);

ALTER TABLE estimate_scope
  ALTER COLUMN root_category_id DROP NOT NULL;

ALTER TABLE estimate_scope
  DROP CONSTRAINT IF EXISTS estimate_scope_scoped_or_general_chk;

ALTER TABLE estimate_scope
  ADD CONSTRAINT estimate_scope_scoped_or_general_chk
  CHECK (
    (site_scope_id IS NOT NULL AND root_category_id IS NOT NULL)
    OR (site_scope_id IS NULL AND root_category_id IS NULL)
  );

CREATE UNIQUE INDEX estimate_scope_general_per_estimate_idx
  ON estimate_scope (estimate_id)
  WHERE site_scope_id IS NULL AND root_category_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE estimate_zone TO latch_app;
  END IF;
END
$$;

COMMIT;

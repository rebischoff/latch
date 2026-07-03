-- SubHub: category_spec_exclude — opt-out of inherited spec participation (37d2).
-- category_spec_def rows reinterpret as includes only; excludes start empty.

BEGIN;

CREATE TABLE category_spec_exclude (
  category_id   TEXT NOT NULL REFERENCES category (id) ON DELETE CASCADE,
  spec_def_id   UUID NOT NULL REFERENCES spec_def (id) ON DELETE CASCADE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (category_id, spec_def_id)
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE category_spec_exclude TO latch_app;
  END IF;
END
$$;

COMMIT;

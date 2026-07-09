-- SubHub: labor phase inclusion on estimate scope/zone + scope_phase bridge (task 37n).
-- Prerequisite: 040b, 044 applied.

BEGIN;

CREATE TABLE estimate_scope_labor_phase (
  estimate_scope_id  TEXT NOT NULL REFERENCES estimate_scope (id) ON DELETE CASCADE,
  labor_phase_id     TEXT NOT NULL REFERENCES labor_phase (id) ON DELETE RESTRICT,
  sort_order         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (estimate_scope_id, labor_phase_id)
);

CREATE TABLE estimate_zone_labor_phase (
  estimate_scope_id  TEXT NOT NULL,
  site_zone_id       TEXT NOT NULL,
  labor_phase_id     TEXT NOT NULL REFERENCES labor_phase (id) ON DELETE RESTRICT,
  sort_order         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (estimate_scope_id, site_zone_id, labor_phase_id),
  FOREIGN KEY (estimate_scope_id, site_zone_id)
    REFERENCES estimate_zone (estimate_scope_id, site_zone_id) ON DELETE CASCADE
);

DO $$
BEGIN
  IF to_regclass('public.scope_phase') IS NOT NULL THEN
    ALTER TABLE scope_phase
      ADD COLUMN IF NOT EXISTS labor_phase_id TEXT REFERENCES labor_phase (id) ON DELETE RESTRICT;

    ALTER TABLE scope_phase DROP COLUMN IF EXISTS phase_template_step_id;
  END IF;
END
$$;

ALTER TABLE estimate_line DROP COLUMN IF EXISTS phase_id;
ALTER TABLE job_line DROP COLUMN IF EXISTS phase_id;

DROP TABLE IF EXISTS phase CASCADE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      estimate_scope_labor_phase,
      estimate_zone_labor_phase
    TO latch_app;
  END IF;
END
$$;

COMMIT;

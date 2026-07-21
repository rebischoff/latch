-- SubHub: job_issue — zone issues log (task 57 / ISS1–ISS7).
-- Prerequisite: 088 applied.

BEGIN;

CREATE TABLE IF NOT EXISTS job_issue (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_id           TEXT NOT NULL REFERENCES job (id) ON DELETE CASCADE,
  site_zone_id     TEXT REFERENCES site_zone (id) ON DELETE RESTRICT,
  description      TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'open',
  reported_by      TEXT REFERENCES employee (party_id) ON DELETE SET NULL,
  reported_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_by      TEXT REFERENCES employee (party_id) ON DELETE SET NULL,
  resolved_at      TIMESTAMPTZ,
  resolution_note  TEXT NOT NULL DEFAULT '',
  CONSTRAINT job_issue_status_check
    CHECK (status IN ('open', 'resolved', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS job_issue_job_id_idx
  ON job_issue (job_id);
CREATE INDEX IF NOT EXISTS job_issue_status_idx
  ON job_issue (status);
CREATE INDEX IF NOT EXISTS job_issue_job_status_idx
  ON job_issue (job_id, status);
CREATE INDEX IF NOT EXISTS job_issue_site_zone_id_idx
  ON job_issue (site_zone_id)
  WHERE site_zone_id IS NOT NULL;

COMMENT ON TABLE job_issue IS
  'Flat per-zone issue log (task 57 ISS1–ISS7). Null site_zone_id = General. No uniqueness on (job_id, site_zone_id) — multiple open issues per zone allowed. Status open → resolved|cancelled (both terminal; no reopen).';

COMMENT ON COLUMN job_issue.site_zone_id IS
  'Field zone geography — FK → site_zone; null = General.';

COMMENT ON COLUMN job_issue.status IS
  'open | resolved | cancelled — resolved and cancelled are terminal (ISS2).';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE job_issue TO latch_app;
  END IF;
END
$$;

COMMIT;

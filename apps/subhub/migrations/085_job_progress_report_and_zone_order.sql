-- SubHub: Field progress reports + zone Order on requisition lines (task 55).
-- - job_progress_report* — append-only full-board snapshots on Save when progress changed
-- - requested_order_line.site_zone_id — null = General (amends task 52 no-geography pin)
-- Prerequisite: 084 applied.

BEGIN;

CREATE TABLE IF NOT EXISTS job_progress_report (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_id       TEXT NOT NULL REFERENCES job (id) ON DELETE CASCADE,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by  TEXT REFERENCES employee (party_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS job_progress_report_job_id_idx
  ON job_progress_report (job_id);

CREATE INDEX IF NOT EXISTS job_progress_report_job_recorded_idx
  ON job_progress_report (job_id, recorded_at DESC);

COMMENT ON TABLE job_progress_report IS
  'Append-only Field progress report header — full board copy on Job Save when progress changed (task 55 L26). Not progress_entry*.';

CREATE TABLE IF NOT EXISTS job_progress_report_cell (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  report_id       TEXT NOT NULL REFERENCES job_progress_report (id) ON DELETE CASCADE,
  scope_phase_id  TEXT NOT NULL REFERENCES scope_phase (id) ON DELETE RESTRICT,
  site_zone_id    TEXT REFERENCES site_zone (id) ON DELETE RESTRICT,
  complete        BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS job_progress_report_cell_report_id_idx
  ON job_progress_report_cell (report_id);

CREATE UNIQUE INDEX IF NOT EXISTS job_progress_report_cell_phase_zone_unique
  ON job_progress_report_cell (report_id, scope_phase_id, site_zone_id)
  WHERE site_zone_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS job_progress_report_cell_phase_general_unique
  ON job_progress_report_cell (report_id, scope_phase_id)
  WHERE site_zone_id IS NULL;

COMMENT ON TABLE job_progress_report_cell IS
  'Full board cell copy for a progress report — (scope_phase, site_zone | General) complete flags (task 55). Living board remains job_field_progress_cell.';

ALTER TABLE requested_order_line
  ADD COLUMN IF NOT EXISTS site_zone_id TEXT REFERENCES site_zone (id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS requested_order_line_site_zone_id_idx
  ON requested_order_line (site_zone_id)
  WHERE site_zone_id IS NOT NULL;

COMMENT ON COLUMN requested_order_line.site_zone_id IS
  'Field zone Order geography — FK → site_zone; null = General. Amends task 52 no-geography pin (task 55 L28).';

COMMENT ON TABLE requested_order_line IS
  'Requisition line — engineered (job_line_part_id set) or ad-hoc (part_id and/or description). Lifecycle: open -> on_purchase_order -> fulfilled, or open -> withdrawn (withdrawal_note required). site_zone_id tags Field zone Order (null = General; task 55).';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      job_progress_report,
      job_progress_report_cell
    TO latch_app;
  END IF;
END
$$;

COMMIT;

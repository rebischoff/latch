-- SubHub: freeze the hours-weight basis on progress report cells (planning/21 PR1).
-- Living board % (F8) still computes on read from current scope_phase hours. A stored
-- report is a historical record — if a later change order revises scope_phase hours,
-- re-deriving an old report's % from *current* hours would silently rewrite history.
-- Freezing weight_hours at snapshot time keeps a graphed report point stable.
-- Prerequisite: 085 applied.

BEGIN;

ALTER TABLE job_progress_report_cell
  ADD COLUMN IF NOT EXISTS weight_hours NUMERIC NOT NULL DEFAULT 0;

COMMENT ON COLUMN job_progress_report_cell.weight_hours IS
  'Hours weight resolved at snapshot time (planning/21 PR1) — frozen so later scope_phase hour changes (re-budget / CO revise) do not retroactively alter a historical report''s %.';

COMMIT;

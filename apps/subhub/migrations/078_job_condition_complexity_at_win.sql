-- SubHub: job_condition complexity_factor_id_at_win snapshot (task 48 / JC5).
-- Prerequisite: 077 applied.

BEGIN;

ALTER TABLE job_condition
  ADD COLUMN IF NOT EXISTS complexity_factor_id_at_win TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_condition_complexity_factor_id_at_win_fkey'
  ) THEN
    ALTER TABLE job_condition
      ADD CONSTRAINT job_condition_complexity_factor_id_at_win_fkey
      FOREIGN KEY (complexity_factor_id_at_win) REFERENCES complexity_factor (id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN job_condition.complexity_factor_id_at_win IS
  'Win-time complexity snapshot (JC5); null = no baseline (manual jobs / post-win adds). Server-owned — not client-writable.';

COMMIT;

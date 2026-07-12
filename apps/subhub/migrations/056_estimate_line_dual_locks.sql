-- SubHub: estimate line dual locks (task 37aa).
-- Replaces estimate_line.lock enum with sales_locked + material_locked.
-- Prerequisite: 055 applied. Decision: docs/decisions/estimate.md P1–P7.

BEGIN;

-- ─── 1. Add dual lock columns ────────────────────────────────────────────────

ALTER TABLE estimate_line
  ADD COLUMN IF NOT EXISTS sales_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS material_locked BOOLEAN NOT NULL DEFAULT false;

-- ─── 2. Backfill from lock enum (P7) ─────────────────────────────────────────

UPDATE estimate_line
SET sales_locked = true
WHERE lock IN ('sell', 'line');

UPDATE estimate_line
SET material_locked = true
WHERE lock = 'line';

-- ─── 3. Drop lock column + CHECK ─────────────────────────────────────────────

ALTER TABLE estimate_line DROP CONSTRAINT IF EXISTS estimate_line_lock_check;

DO $$
DECLARE
  constr_name text;
BEGIN
  FOR constr_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'estimate_line'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%lock%'
      AND pg_get_constraintdef(con.oid) NOT ILIKE '%sales_locked%'
      AND pg_get_constraintdef(con.oid) NOT ILIKE '%material_locked%'
  LOOP
    EXECUTE format('ALTER TABLE estimate_line DROP CONSTRAINT IF EXISTS %I', constr_name);
  END LOOP;
END $$;

ALTER TABLE estimate_line DROP COLUMN IF EXISTS lock;

COMMIT;

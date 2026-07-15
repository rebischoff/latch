-- SubHub: condition labor_only + Y4 include_discontinued_explicit (task 43).
-- Prerequisite: 073 applied.

BEGIN;

ALTER TABLE estimate_condition
  ADD COLUMN IF NOT EXISTS labor_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS labor_only_explicit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS include_discontinued_explicit boolean NOT NULL DEFAULT false;

-- Preserve 41ak per-node discontinued values as explicit owns (L12 backfill).
UPDATE estimate_condition SET include_discontinued_explicit = true;

-- Roots always own labor_only (L11).
UPDATE estimate_condition
SET labor_only_explicit = true
WHERE parent_condition_id IS NULL;

COMMENT ON COLUMN estimate_condition.labor_only IS
  'When effective: force M/F/I = 0; clear part/vendor/material_locked; skip material resolve (43 L3–L4).';

COMMENT ON COLUMN estimate_condition.labor_only_explicit IS
  'Y4 sentinel: true = own labor_only; false = inherit from ancestry (43 L11).';

COMMENT ON COLUMN estimate_condition.include_discontinued_explicit IS
  'Y4 sentinel: true = own include_discontinued; false = inherit from ancestry (43 L12).';

COMMIT;

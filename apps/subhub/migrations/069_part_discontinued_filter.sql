-- 069 — manufacturer_part.discontinued + estimate_condition.include_discontinued
-- Part picker / resolver filter knob (no seed data).

ALTER TABLE manufacturer_part
  ADD COLUMN IF NOT EXISTS discontinued boolean NOT NULL DEFAULT false;

ALTER TABLE estimate_condition
  ADD COLUMN IF NOT EXISTS include_discontinued boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN manufacturer_part.discontinued IS
  'When true, part is excluded from estimate part picker / material resolver unless condition.include_discontinued is true.';

COMMENT ON COLUMN estimate_condition.include_discontinued IS
  'When true, estimate part filter includes discontinued manufacturer_part rows for lines under this condition.';

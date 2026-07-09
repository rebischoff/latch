-- SubHub: drop spec_def value_type 'range' — band is part-authored on number defs (task 37s).
-- Prerequisite: 051 applied.

BEGIN;

UPDATE spec_def
SET value_type = 'number'
WHERE value_type = 'range';

ALTER TABLE spec_def DROP CONSTRAINT IF EXISTS spec_def_value_type_check;
ALTER TABLE spec_def DROP CONSTRAINT IF EXISTS system_spec_def_value_type_check;
ALTER TABLE spec_def ADD CONSTRAINT spec_def_value_type_check
  CHECK (value_type IN ('enum', 'boolean', 'number'));

COMMIT;

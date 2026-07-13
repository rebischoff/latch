-- SubHub: normalize legacy point-only bucket rows before interval-overlap matcher (task 37ag).
-- Prerequisite: 060 applied. Decision: docs/decisions/catalog.md T3.

BEGIN;

UPDATE estimate_condition_spec
SET value_number_max = value_number
WHERE value_number IS NOT NULL
  AND value_number_max IS NULL
  AND spec_threshold_preset_id IS NULL;

UPDATE estimate_line_spec
SET value_number_max = value_number
WHERE value_number IS NOT NULL
  AND value_number_max IS NULL
  AND spec_threshold_preset_id IS NULL;

COMMIT;

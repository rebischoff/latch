-- SubHub: drop threshold presets (task 41ao).
-- Prerequisite: 070 applied. Keep value_number / value_number_max interval overlap.

BEGIN;

-- Clear any remaining preset-backed bucket filters (Candela presets already wiped in 070).
UPDATE estimate_condition_spec
SET spec_option_id = NULL,
    value_boolean = NULL,
    value_number = NULL,
    value_number_max = NULL,
    spec_threshold_preset_id = NULL
WHERE spec_threshold_preset_id IS NOT NULL;

UPDATE estimate_line_spec
SET spec_option_id = NULL,
    value_boolean = NULL,
    value_number = NULL,
    value_number_max = NULL,
    spec_threshold_preset_id = NULL
WHERE spec_threshold_preset_id IS NOT NULL;

DROP INDEX IF EXISTS estimate_condition_spec_preset_id_idx;
DROP INDEX IF EXISTS estimate_line_spec_preset_id_idx;

ALTER TABLE estimate_condition_spec
  DROP COLUMN IF EXISTS spec_threshold_preset_id;

ALTER TABLE estimate_line_spec
  DROP COLUMN IF EXISTS spec_threshold_preset_id;

DROP TABLE IF EXISTS spec_threshold_preset_option;
DROP TABLE IF EXISTS spec_threshold_preset;

COMMIT;

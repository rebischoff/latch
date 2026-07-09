-- SubHub: drop unused spec_def.filter_mode (never enforced in v1).

ALTER TABLE spec_def DROP CONSTRAINT IF EXISTS system_spec_def_filter_mode_check;
ALTER TABLE spec_def DROP COLUMN IF EXISTS filter_mode;

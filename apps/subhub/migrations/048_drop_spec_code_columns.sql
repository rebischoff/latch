-- SubHub: drop unused spec_def.code and spec_option.code (FK matching only at runtime).

ALTER TABLE spec_def DROP COLUMN IF EXISTS code;
ALTER TABLE spec_option DROP COLUMN IF EXISTS code;

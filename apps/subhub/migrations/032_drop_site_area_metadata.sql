-- Drop unused site_area metadata columns (task 35).
-- site geography v1 edits name only; area categorization deferred.

BEGIN;

ALTER TABLE site_area DROP COLUMN IF EXISTS area_type;
ALTER TABLE site_area DROP COLUMN IF EXISTS code;

COMMIT;

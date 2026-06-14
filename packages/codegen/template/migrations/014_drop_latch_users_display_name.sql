-- Platform: display name lives on party (1:1 via employee.latch_user_id, task 10+).

BEGIN;

ALTER TABLE latch_users DROP COLUMN IF EXISTS display_name;

COMMIT;

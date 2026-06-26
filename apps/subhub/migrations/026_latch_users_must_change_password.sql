-- Task 28 step 11: admin-set temp passwords require change on first login.
BEGIN;

ALTER TABLE latch_users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

COMMIT;

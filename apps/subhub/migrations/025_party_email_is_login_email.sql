-- party_email login designation for person identity sync (task 28).

BEGIN;

ALTER TABLE party_email
  ADD COLUMN is_login_email BOOLEAN NOT NULL DEFAULT false;

COMMIT;

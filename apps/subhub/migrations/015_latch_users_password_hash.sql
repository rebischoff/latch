-- Durable login credentials for latch_users (Better Auth memory adapter is ephemeral).
BEGIN;

ALTER TABLE latch_users
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

COMMIT;

-- Platform template (task 01 prototype): identity table.
-- Disposable fixture in apps/spike_policy — graduates to business-app template.

BEGIN;

CREATE TABLE IF NOT EXISTS latch_users (
  id           TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  login_email  TEXT UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;

-- Platform template: user ↔ role assignments (catalog FK added in 004).

BEGIN;

CREATE TABLE IF NOT EXISTS latch_user_roles (
  user_id TEXT NOT NULL REFERENCES latch_users (id) ON DELETE CASCADE,
  role_id TEXT NOT NULL,
  PRIMARY KEY (user_id, role_id)
);

COMMIT;

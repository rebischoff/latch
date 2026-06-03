-- Phase 03 task 04: latch_user_roles (user ↔ role assignments)
--
-- Apply after 001_init.sql (and 002/003 if used):
--   psql "$DATABASE_URL" -f apps/crm/migrations/004_latch_user_roles.sql
--
-- Inserts pilot users + role rows (same ids as apps/crm/db/seed.ts) for manual QA.
-- Does not assign data_master to pilot users (dedicated QA login only).

BEGIN;

CREATE TABLE latch_user_roles (
  user_id TEXT NOT NULL REFERENCES latch_users (id) ON DELETE CASCADE,
  role_id TEXT NOT NULL,
  PRIMARY KEY (user_id, role_id)
);

INSERT INTO latch_users (id, display_name) VALUES
  ('seed-field-tech', 'Field Tech (seed)'),
  ('seed-office-admin', 'Office Admin (seed)'),
  ('seed-iam-admin', 'IAM Admin (seed)')
ON CONFLICT (id) DO NOTHING;

INSERT INTO latch_user_roles (user_id, role_id) VALUES
  ('seed-field-tech', 'field_tech'),
  ('seed-office-admin', 'office_admin'),
  ('seed-iam-admin', 'iam_master')
ON CONFLICT (user_id, role_id) DO NOTHING;

COMMIT;

-- test1 Latch platform skeleton (task 05)
--
-- Apply on Neon (separate branch from CRM):
--   npm run db:migrate:test1
--   # or: psql "$DATABASE_URL" -f apps/test1/migrations/001_init.sql
--
-- DATABASE_URL: Neon direct connection from apps/test1/.env.local

BEGIN;

CREATE TABLE latch_users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  login_email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE latch_user_roles (
  user_id TEXT NOT NULL REFERENCES latch_users (id) ON DELETE CASCADE,
  role_id TEXT NOT NULL,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE latch_audit (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  module_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  field_ids TEXT[],
  before JSONB,
  after JSONB,
  patch JSONB,
  request_id TEXT,
  approval_id TEXT
);

-- Append-only audit: deny UPDATE/DELETE (invariant §6).
CREATE OR REPLACE FUNCTION latch_audit_deny_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'latch_audit rows are immutable';
END;
$$;

DROP TRIGGER IF EXISTS latch_audit_no_update ON latch_audit;
DROP TRIGGER IF EXISTS latch_audit_no_delete ON latch_audit;

CREATE TRIGGER latch_audit_no_mutation
  BEFORE UPDATE OR DELETE ON latch_audit
  FOR EACH ROW
  EXECUTE FUNCTION latch_audit_deny_mutation();

CREATE TABLE latch_policy_version (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  version BIGINT NOT NULL DEFAULT 1
);

INSERT INTO latch_policy_version (id, version)
VALUES (1, 1)
ON CONFLICT (id) DO NOTHING;

-- Seed users per apps/test1/docs/AUTH.md (Better Auth aligns by login_email).
INSERT INTO latch_users (id, display_name, login_email) VALUES
  ('seed-admin', 'Admin (seed)', 'admin@test1.local'),
  ('seed-user', 'User (seed)', 'user@test1.local'),
  ('seed-readonly', 'Readonly (seed)', 'readonly@test1.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO latch_user_roles (user_id, role_id) VALUES
  ('seed-admin', 'iam_master'),
  ('seed-admin', 'data_master')
ON CONFLICT (user_id, role_id) DO NOTHING;

COMMIT;

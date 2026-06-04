-- Phase 06 task 04: latch_policy_version (manifest cache invalidation)
--
-- Apply after 001–006 (as migration owner):
--   psql "$DATABASE_URL" -f apps/crm/migrations/007_latch_policy_version.sql
--
-- Single-row counter bumped on IAM role assign/revoke (task 04).
-- Manual bump when repo YAML policies change (see apps/crm/docs/DATABASE.md).

BEGIN;

CREATE TABLE IF NOT EXISTS latch_policy_version (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  version BIGINT NOT NULL DEFAULT 1
);

INSERT INTO latch_policy_version (id, version)
VALUES (1, 1)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, UPDATE ON TABLE latch_policy_version TO latch_app;
  END IF;
END
$$;

COMMIT;

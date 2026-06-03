-- Phase 04 task 04: application role — INSERT-only on latch_audit (T6 defense in depth)
--
-- Apply after 001–004 (as superuser / migration owner):
--   psql "$DATABASE_URL" -f apps/crm/migrations/005_latch_app_role.sql
--
-- App runtime (production/preview): DATABASE_URL as latch_app — not the Neon owner role.
-- Rotate the password after first apply; pilot default below is for local Docker / CI only.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    CREATE ROLE latch_app WITH LOGIN PASSWORD 'latch_app' NOINHERIT;
  END IF;
END
$$;

DO $do$
DECLARE
  dbname text := current_database();
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO latch_app', dbname);
END
$do$;

GRANT USAGE ON SCHEMA public TO latch_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  latch_users,
  jobs,
  assignments,
  customers,
  sites,
  latch_user_roles
TO latch_app;

GRANT INSERT ON TABLE latch_audit TO latch_app;
GRANT USAGE, SELECT ON SEQUENCE latch_audit_id_seq TO latch_app;

REVOKE ALL ON TABLE latch_audit FROM latch_app;
GRANT INSERT ON TABLE latch_audit TO latch_app;

COMMIT;

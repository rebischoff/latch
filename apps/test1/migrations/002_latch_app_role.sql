-- test1 application role — INSERT-only on latch_audit (T6 defense in depth)
--
-- Apply after 001_init.sql (as superuser / migration owner):
--   npm run db:migrate:test1
--
-- App runtime (production/preview): DATABASE_URL as latch_app — not the Neon owner role.
-- Password: psql variable latch_app_password (from LATCH_APP_ROLE_PASSWORD in .env.local).
-- Default latch_app is for local Docker / CI only; Neon requires a strong password in env.

BEGIN;

-- psql :'var' substitution only works outside dollar-quoted blocks; stash for DO below.
SELECT set_config('migration.latch_app_password', :'latch_app_password', true);

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    EXECUTE format(
      'CREATE ROLE latch_app WITH LOGIN PASSWORD %L NOINHERIT',
      current_setting('migration.latch_app_password')
    );
  END IF;
END
$do$;

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
  latch_user_roles
TO latch_app;

GRANT INSERT ON TABLE latch_audit TO latch_app;
GRANT USAGE, SELECT ON SEQUENCE latch_audit_id_seq TO latch_app;

REVOKE ALL ON TABLE latch_audit FROM latch_app;
GRANT INSERT ON TABLE latch_audit TO latch_app;

GRANT SELECT, UPDATE ON TABLE latch_policy_version TO latch_app;

COMMIT;

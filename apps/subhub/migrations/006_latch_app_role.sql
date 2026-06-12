-- Platform template: least-privilege app DB role (T5 / connection safety).
-- Password: psql variable latch_app_password (from LATCH_APP_ROLE_PASSWORD in .env.local).

BEGIN;

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

GRANT SELECT ON TABLE
  latch_roles,
  latch_role_surfaces,
  latch_role_grants,
  latch_policy_version
TO latch_app;

GRANT UPDATE ON TABLE latch_policy_version TO latch_app;

COMMIT;

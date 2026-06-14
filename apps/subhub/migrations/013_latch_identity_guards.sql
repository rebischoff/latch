-- Platform: identity columns, setup flag, catalog/assignment DB guards (P4b/P11).
-- Fresh apps: zero users after migrate; first admin via /setup (task 09).
-- Removes legacy bootstrap-admin from 007 when upgrading existing DBs.

BEGIN;

ALTER TABLE latch_users
  ADD COLUMN IF NOT EXISTS login_name TEXT UNIQUE;

ALTER TABLE latch_app_config
  ADD COLUMN IF NOT EXISTS setup_complete BOOLEAN NOT NULL DEFAULT false;

DELETE FROM latch_user_roles WHERE user_id = 'bootstrap-admin';
DELETE FROM latch_users WHERE id = 'bootstrap-admin';

CREATE OR REPLACE FUNCTION latch_roles_deny_role_class_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role_class IS DISTINCT FROM OLD.role_class THEN
    RAISE EXCEPTION 'latch_roles.role_class is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS latch_roles_role_class_immutable ON latch_roles;

CREATE TRIGGER latch_roles_role_class_immutable
  BEFORE UPDATE ON latch_roles
  FOR EACH ROW
  EXECUTE FUNCTION latch_roles_deny_role_class_change();

CREATE OR REPLACE FUNCTION latch_roles_deny_system_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.role_class IN ('system_data', 'system_iam') THEN
    RAISE EXCEPTION 'system catalog rows cannot be deleted';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS latch_roles_deny_system_delete ON latch_roles;

CREATE TRIGGER latch_roles_deny_system_delete
  BEFORE DELETE ON latch_roles
  FOR EACH ROW
  EXECUTE FUNCTION latch_roles_deny_system_delete();

CREATE OR REPLACE FUNCTION latch_user_roles_guard_last_system_holder()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_role_class TEXT;
  v_holder_count INT;
BEGIN
  SELECT role_class INTO v_role_class FROM latch_roles WHERE id = OLD.role_id;

  IF v_role_class IS NULL OR v_role_class NOT IN ('system_data', 'system_iam') THEN
    RETURN OLD;
  END IF;

  SELECT COUNT(*)::int INTO v_holder_count
  FROM latch_user_roles ur
  JOIN latch_roles r ON r.id = ur.role_id
  WHERE r.role_class = v_role_class;

  IF v_holder_count <= 1 THEN
    RAISE EXCEPTION 'cannot remove last holder of %', v_role_class;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS latch_user_roles_guard_last_system_holder ON latch_user_roles;

CREATE TRIGGER latch_user_roles_guard_last_system_holder
  BEFORE DELETE ON latch_user_roles
  FOR EACH ROW
  EXECUTE FUNCTION latch_user_roles_guard_last_system_holder();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT UPDATE (setup_complete) ON latch_app_config TO latch_app;
  END IF;
END
$$;

COMMIT;

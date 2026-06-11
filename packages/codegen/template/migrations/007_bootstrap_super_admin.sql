-- Platform template: initial super admin (P4b) — both system roles assigned.
-- System rows are looked up by `role_class` (DB-generated ids; P11 2026-06-08),
-- not by fixed UUID. Break-glass: LATCH_BOOTSTRAP_ADMIN_EMAIL (see README).

BEGIN;

INSERT INTO latch_users (id, display_name) VALUES
  ('bootstrap-admin', 'Bootstrap admin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO latch_user_roles (user_id, role_id)
SELECT 'bootstrap-admin', id
FROM latch_roles
WHERE role_class IN ('system_data', 'system_iam')
ON CONFLICT (user_id, role_id) DO NOTHING;

COMMIT;

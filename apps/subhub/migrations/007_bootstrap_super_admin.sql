-- Platform template: initial super admin (P4b) — both system roles assigned.
-- System rows are looked up by `role_class` (DB-generated ids; P11 2026-06-08),
-- not by fixed UUID. Break-glass: LATCH_BOOTSTRAP_ADMIN_EMAIL (see README).

BEGIN;

INSERT INTO latch_users (id, display_name) VALUES
  ('bootstrap-admin', 'Bootstrap admin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO latch_user_roles (user_id, role_id)
SELECT 'bootstrap-admin', r.id
FROM latch_roles r
WHERE r.role_class IN ('system_data', 'system_iam')
  AND NOT EXISTS (
    SELECT 1
    FROM latch_user_roles ur
    WHERE ur.user_id = 'bootstrap-admin'
      AND ur.role_id = r.id
  );

COMMIT;

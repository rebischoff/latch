-- Optional dev seed: pilot app roles + grants (runtime DB data; not YAML).
-- Requires job_list / job_detail surfaces in the app registry.
-- Stable UUIDs for field_tech / office_admin; seed users for LATCH_STUB_USER.

BEGIN;

INSERT INTO latch_roles (id, role_class, display_name) VALUES
  ('f0000001-0000-4000-8000-000000000001', 'app', 'Field tech'),
  ('f0000001-0000-4000-8000-000000000002', 'app', 'Office admin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO latch_role_surfaces (role_id, surface_id, row_scope) VALUES
  ('f0000001-0000-4000-8000-000000000001', 'job_list', 'own'),
  ('f0000001-0000-4000-8000-000000000001', 'job_detail', 'own'),
  ('f0000001-0000-4000-8000-000000000002', 'job_list', 'all'),
  ('f0000001-0000-4000-8000-000000000002', 'job_detail', 'all')
ON CONFLICT (role_id, surface_id) DO NOTHING;

-- job_list — field_tech
INSERT INTO latch_role_grants (role_id, surface_id, field_id, action) VALUES
  ('f0000001-0000-4000-8000-000000000001', 'job_list', NULL, 'read'),
  ('f0000001-0000-4000-8000-000000000001', 'job_list', 'summary', 'read'),
  ('f0000001-0000-4000-8000-000000000001', 'job_list', 'customer_site', 'read'),
  ('f0000001-0000-4000-8000-000000000001', 'job_list', 'assignments', 'read')
ON CONFLICT DO NOTHING;

-- job_list — office_admin
INSERT INTO latch_role_grants (role_id, surface_id, field_id, action) VALUES
  ('f0000001-0000-4000-8000-000000000002', 'job_list', NULL, 'read'),
  ('f0000001-0000-4000-8000-000000000002', 'job_list', NULL, 'write'),
  ('f0000001-0000-4000-8000-000000000002', 'job_list', NULL, 'delete'),
  ('f0000001-0000-4000-8000-000000000002', 'job_list', 'summary', 'read'),
  ('f0000001-0000-4000-8000-000000000002', 'job_list', 'customer_site', 'read'),
  ('f0000001-0000-4000-8000-000000000002', 'job_list', 'financial_terms', 'read'),
  ('f0000001-0000-4000-8000-000000000002', 'job_list', 'assignments', 'read'),
  ('f0000001-0000-4000-8000-000000000002', 'job_list', 'assignments', 'write')
ON CONFLICT DO NOTHING;

-- job_detail — field_tech
INSERT INTO latch_role_grants (role_id, surface_id, field_id, action) VALUES
  ('f0000001-0000-4000-8000-000000000001', 'job_detail', NULL, 'read'),
  ('f0000001-0000-4000-8000-000000000001', 'job_detail', 'summary', 'read'),
  ('f0000001-0000-4000-8000-000000000001', 'job_detail', 'summary', 'write'),
  ('f0000001-0000-4000-8000-000000000001', 'job_detail', 'scope', 'read'),
  ('f0000001-0000-4000-8000-000000000001', 'job_detail', 'scope', 'write'),
  ('f0000001-0000-4000-8000-000000000001', 'job_detail', 'assignments', 'read'),
  ('f0000001-0000-4000-8000-000000000001', 'job_detail', 'financial_terms', 'submit')
ON CONFLICT DO NOTHING;

-- job_detail — office_admin
INSERT INTO latch_role_grants (role_id, surface_id, field_id, action) VALUES
  ('f0000001-0000-4000-8000-000000000002', 'job_detail', NULL, 'read'),
  ('f0000001-0000-4000-8000-000000000002', 'job_detail', NULL, 'write'),
  ('f0000001-0000-4000-8000-000000000002', 'job_detail', NULL, 'delete'),
  ('f0000001-0000-4000-8000-000000000002', 'job_detail', NULL, 'restore'),
  ('f0000001-0000-4000-8000-000000000002', 'job_detail', 'summary', 'read'),
  ('f0000001-0000-4000-8000-000000000002', 'job_detail', 'summary', 'write'),
  ('f0000001-0000-4000-8000-000000000002', 'job_detail', 'scope', 'read'),
  ('f0000001-0000-4000-8000-000000000002', 'job_detail', 'scope', 'write'),
  ('f0000001-0000-4000-8000-000000000002', 'job_detail', 'assignments', 'read'),
  ('f0000001-0000-4000-8000-000000000002', 'job_detail', 'assignments', 'write'),
  ('f0000001-0000-4000-8000-000000000002', 'job_detail', 'financial_terms', 'read'),
  ('f0000001-0000-4000-8000-000000000002', 'job_detail', 'financial_terms', 'write'),
  ('f0000001-0000-4000-8000-000000000002', 'job_detail', 'financial_terms', 'approve'),
  ('f0000001-0000-4000-8000-000000000002', 'job_detail', 'customer_ref', 'read')
ON CONFLICT DO NOTHING;

INSERT INTO latch_users (id, display_name) VALUES
  ('seed-field-tech', 'Field tech (seed)'),
  ('seed-office-admin', 'Office admin (seed)')
ON CONFLICT (id) DO NOTHING;

INSERT INTO latch_user_roles (user_id, role_id)
SELECT 'seed-field-tech', 'f0000001-0000-4000-8000-000000000001'::uuid
WHERE NOT EXISTS (
  SELECT 1 FROM latch_user_roles
  WHERE user_id = 'seed-field-tech'
    AND role_id = 'f0000001-0000-4000-8000-000000000001'::uuid
);

INSERT INTO latch_user_roles (user_id, role_id)
SELECT 'seed-office-admin', 'f0000001-0000-4000-8000-000000000002'::uuid
WHERE NOT EXISTS (
  SELECT 1 FROM latch_user_roles
  WHERE user_id = 'seed-office-admin'
    AND role_id = 'f0000001-0000-4000-8000-000000000002'::uuid
);

COMMIT;

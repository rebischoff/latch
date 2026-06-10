-- SPIKE FIXTURE ONLY — not part of platform template provisioning (P3 2026-06-08).
-- Pilot personas + grants against synthetic fixture surfaces (apps/spike_codegen vocabulary).
--
-- Fixture catalog UUIDs (spike harness only):
--   field_tech:    b1000001-0000-4000-8000-000000000001
--   office_admin:  b1000001-0000-4000-8000-000000000002
--   union_demo_a:  b1000001-0000-4000-8000-000000000003
--   union_demo_b:  b1000001-0000-4000-8000-000000000004

BEGIN;

-- Pilot users for assignment UI (spike fixture only)
INSERT INTO latch_users (id, display_name) VALUES
  ('field-tech', 'Field Tech'),
  ('office-admin', 'Office Admin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO latch_user_roles (user_id, role_id) VALUES
  ('field-tech', 'b1000001-0000-4000-8000-000000000001'),
  ('office-admin', 'b1000001-0000-4000-8000-000000000002')
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO latch_roles (id, role_class, display_name) VALUES
  ('b1000001-0000-4000-8000-000000000001', 'app', 'Field technician'),
  ('b1000001-0000-4000-8000-000000000002', 'app', 'Office admin'),
  ('b1000001-0000-4000-8000-000000000003', 'app', 'Union demo A'),
  ('b1000001-0000-4000-8000-000000000004', 'app', 'Union demo B')
ON CONFLICT (id) DO NOTHING;

-- field_tech — sparse grants on alpha_list, gamma_form, zeta_inventory (own)
INSERT INTO latch_role_surfaces (role_id, surface_id, row_scope) VALUES
  ('b1000001-0000-4000-8000-000000000001', 'alpha_list',     'own'),
  ('b1000001-0000-4000-8000-000000000001', 'gamma_form',     'own'),
  ('b1000001-0000-4000-8000-000000000001', 'zeta_inventory', 'own')
ON CONFLICT (role_id, surface_id) DO NOTHING;

INSERT INTO latch_role_grants (role_id, surface_id, field_id, action) VALUES
  ('b1000001-0000-4000-8000-000000000001', 'alpha_list',     'title',    'read'),
  ('b1000001-0000-4000-8000-000000000001', 'alpha_list',     'status',   'read'),
  ('b1000001-0000-4000-8000-000000000001', 'gamma_form',     'request_type', 'read'),
  ('b1000001-0000-4000-8000-000000000001', 'zeta_inventory', 'sku',      'read'),
  ('b1000001-0000-4000-8000-000000000001', 'zeta_inventory', 'quantity', 'read')
ON CONFLICT ON CONSTRAINT latch_role_grants_tuple_unique DO NOTHING;

-- office_admin — broader grants on alpha_list, beta_detail, delta_report (all)
INSERT INTO latch_role_surfaces (role_id, surface_id, row_scope) VALUES
  ('b1000001-0000-4000-8000-000000000002', 'alpha_list',    'all'),
  ('b1000001-0000-4000-8000-000000000002', 'beta_detail',   'all'),
  ('b1000001-0000-4000-8000-000000000002', 'delta_report',  'all')
ON CONFLICT (role_id, surface_id) DO NOTHING;

INSERT INTO latch_role_grants (role_id, surface_id, field_id, action) VALUES
  ('b1000001-0000-4000-8000-000000000002', 'alpha_list',    'title',        'read'),
  ('b1000001-0000-4000-8000-000000000002', 'alpha_list',    'title',        'write'),
  ('b1000001-0000-4000-8000-000000000002', 'alpha_list',    'status',       'read'),
  ('b1000001-0000-4000-8000-000000000002', 'alpha_list',    'status',       'write'),
  ('b1000001-0000-4000-8000-000000000002', 'beta_detail',   'headline',     'read'),
  ('b1000001-0000-4000-8000-000000000002', 'beta_detail',   'headline',     'write'),
  ('b1000001-0000-4000-8000-000000000002', 'beta_detail',   'priority',     'read'),
  ('b1000001-0000-4000-8000-000000000002', 'delta_report',  'region',       'read'),
  ('b1000001-0000-4000-8000-000000000002', 'delta_report',  'summary_text', 'read'),
  ('b1000001-0000-4000-8000-000000000002', 'delta_report',  'summary_text', 'write')
ON CONFLICT ON CONSTRAINT latch_role_grants_tuple_unique DO NOTHING;

-- union_demo_a + union_demo_b — overlapping grants on alpha_list.status for multi-role union testing
INSERT INTO latch_role_surfaces (role_id, surface_id, row_scope) VALUES
  ('b1000001-0000-4000-8000-000000000003', 'alpha_list', 'own'),
  ('b1000001-0000-4000-8000-000000000004', 'alpha_list', 'all')
ON CONFLICT (role_id, surface_id) DO NOTHING;

INSERT INTO latch_role_grants (role_id, surface_id, field_id, action) VALUES
  ('b1000001-0000-4000-8000-000000000003', 'alpha_list', 'status', 'read'),
  ('b1000001-0000-4000-8000-000000000004', 'alpha_list', 'status', 'write')
ON CONFLICT ON CONSTRAINT latch_role_grants_tuple_unique DO NOTHING;

COMMIT;

-- SPIKE FIXTURE ONLY — refresh pilot grants after vocabulary fixture (task 02).
-- Replaces retired widget_list / widget_join bindings with synthetic fixture surfaces.

BEGIN;

DELETE FROM latch_role_grants
WHERE surface_id IN ('widget_list', 'widget_join');

DELETE FROM latch_role_surfaces
WHERE surface_id IN ('widget_list', 'widget_join');

INSERT INTO latch_roles (id, role_class, display_name) VALUES
  ('b1000001-0000-4000-8000-000000000003', 'app', 'Union demo A'),
  ('b1000001-0000-4000-8000-000000000004', 'app', 'Union demo B')
ON CONFLICT (id) DO NOTHING;

-- field_tech — alpha_list, gamma_form, zeta_inventory (own)
INSERT INTO latch_role_surfaces (role_id, surface_id, row_scope) VALUES
  ('b1000001-0000-4000-8000-000000000001', 'alpha_list',     'own'),
  ('b1000001-0000-4000-8000-000000000001', 'gamma_form',     'own'),
  ('b1000001-0000-4000-8000-000000000001', 'zeta_inventory', 'own')
ON CONFLICT (role_id, surface_id) DO UPDATE SET row_scope = EXCLUDED.row_scope;

INSERT INTO latch_role_grants (role_id, surface_id, field_id, action) VALUES
  ('b1000001-0000-4000-8000-000000000001', 'alpha_list',     'title',        'read'),
  ('b1000001-0000-4000-8000-000000000001', 'alpha_list',     'status',       'read'),
  ('b1000001-0000-4000-8000-000000000001', 'gamma_form',     'request_type', 'read'),
  ('b1000001-0000-4000-8000-000000000001', 'zeta_inventory', 'sku',          'read'),
  ('b1000001-0000-4000-8000-000000000001', 'zeta_inventory', 'quantity',     'read')
ON CONFLICT ON CONSTRAINT latch_role_grants_tuple_unique DO NOTHING;

-- office_admin — alpha_list, beta_detail, delta_report (all)
INSERT INTO latch_role_surfaces (role_id, surface_id, row_scope) VALUES
  ('b1000001-0000-4000-8000-000000000002', 'alpha_list',    'all'),
  ('b1000001-0000-4000-8000-000000000002', 'beta_detail',   'all'),
  ('b1000001-0000-4000-8000-000000000002', 'delta_report',  'all')
ON CONFLICT (role_id, surface_id) DO UPDATE SET row_scope = EXCLUDED.row_scope;

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

-- union_demo_a + union_demo_b — overlapping alpha_list.status grants
INSERT INTO latch_role_surfaces (role_id, surface_id, row_scope) VALUES
  ('b1000001-0000-4000-8000-000000000003', 'alpha_list', 'own'),
  ('b1000001-0000-4000-8000-000000000004', 'alpha_list', 'all')
ON CONFLICT (role_id, surface_id) DO UPDATE SET row_scope = EXCLUDED.row_scope;

INSERT INTO latch_role_grants (role_id, surface_id, field_id, action) VALUES
  ('b1000001-0000-4000-8000-000000000003', 'alpha_list', 'status', 'read'),
  ('b1000001-0000-4000-8000-000000000004', 'alpha_list', 'status', 'write')
ON CONFLICT ON CONSTRAINT latch_role_grants_tuple_unique DO NOTHING;

COMMIT;

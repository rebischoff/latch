-- SPIKE FIXTURE ONLY — scoped business row proof (Phase 08 task 04).

BEGIN;

INSERT INTO latch_scopes (id, kind, display_name) VALUES
  ('c1000001-0000-4000-8000-000000000001', 'branch', 'Branch A'),
  ('c1000001-0000-4000-8000-000000000002', 'branch', 'Branch B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO latch_roles (id, role_class, display_name) VALUES
  ('d1000001-0000-4000-8000-000000000001', 'app', 'Branch sales'),
  ('d1000001-0000-4000-8000-000000000002', 'app', 'Company sales'),
  ('d1000001-0000-4000-8000-000000000003', 'app', 'Widget owner')
ON CONFLICT (id) DO NOTHING;

INSERT INTO latch_role_surfaces (role_id, surface_id, row_scope) VALUES
  ('d1000001-0000-4000-8000-000000000001', 'widget_list',   'scope'),
  ('d1000001-0000-4000-8000-000000000001', 'widget_detail', 'scope'),
  ('d1000001-0000-4000-8000-000000000002', 'widget_list',   'all'),
  ('d1000001-0000-4000-8000-000000000002', 'widget_detail', 'all'),
  ('d1000001-0000-4000-8000-000000000003', 'widget_list',   'own'),
  ('d1000001-0000-4000-8000-000000000003', 'widget_detail', 'own')
ON CONFLICT (role_id, surface_id) DO UPDATE SET row_scope = EXCLUDED.row_scope;

INSERT INTO latch_role_grants (role_id, surface_id, field_id, action) VALUES
  ('d1000001-0000-4000-8000-000000000001', 'widget_list',   NULL,          'read'),
  ('d1000001-0000-4000-8000-000000000001', 'widget_list',   'label',       'read'),
  ('d1000001-0000-4000-8000-000000000001', 'widget_list',   'status',      'read'),
  ('d1000001-0000-4000-8000-000000000001', 'widget_detail', NULL,          'read'),
  ('d1000001-0000-4000-8000-000000000001', 'widget_detail', 'label',       'read'),
  ('d1000001-0000-4000-8000-000000000001', 'widget_detail', 'status',      'read'),
  ('d1000001-0000-4000-8000-000000000001', 'widget_detail', 'branch_scope','read'),
  ('d1000001-0000-4000-8000-000000000002', 'widget_list',   NULL,          'read'),
  ('d1000001-0000-4000-8000-000000000002', 'widget_list',   'label',       'read'),
  ('d1000001-0000-4000-8000-000000000002', 'widget_list',   'status',      'read'),
  ('d1000001-0000-4000-8000-000000000002', 'widget_detail', NULL,          'read'),
  ('d1000001-0000-4000-8000-000000000002', 'widget_detail', 'label',       'read'),
  ('d1000001-0000-4000-8000-000000000002', 'widget_detail', 'status',      'read'),
  ('d1000001-0000-4000-8000-000000000002', 'widget_detail', 'branch_scope','read'),
  ('d1000001-0000-4000-8000-000000000003', 'widget_list',   NULL,          'read'),
  ('d1000001-0000-4000-8000-000000000003', 'widget_list',   'label',       'read'),
  ('d1000001-0000-4000-8000-000000000003', 'widget_detail', NULL,          'read'),
  ('d1000001-0000-4000-8000-000000000003', 'widget_detail', 'label',       'read')
ON CONFLICT ON CONSTRAINT latch_role_grants_tuple_unique DO NOTHING;

INSERT INTO latch_users (id, display_name) VALUES
  ('branch-a-sales', 'Branch A sales'),
  ('company-sales', 'Company-wide sales'),
  ('widget-owner-a', 'Widget A owner')
ON CONFLICT (id) DO NOTHING;

INSERT INTO latch_user_roles (user_id, role_id, scope_id) VALUES
  ('branch-a-sales', 'd1000001-0000-4000-8000-000000000001', 'c1000001-0000-4000-8000-000000000001'),
  ('company-sales', 'd1000001-0000-4000-8000-000000000002', NULL),
  ('widget-owner-a', 'd1000001-0000-4000-8000-000000000003', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO widgets (id, label, status, scope_id) VALUES
  ('e1000001-0000-4000-8000-000000000001', 'Branch A widget', 'open', 'c1000001-0000-4000-8000-000000000001'),
  ('e1000001-0000-4000-8000-000000000002', 'Branch B widget', 'open', 'c1000001-0000-4000-8000-000000000002')
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- SPIKE FIXTURE ONLY — scoped delegation proof (task 08).
-- Branch A/B scopes, branch_admin delegator, Maria @ Branch B.

BEGIN;

INSERT INTO latch_scopes (id, kind, display_name) VALUES
  ('c1000001-0000-4000-8000-000000000001', 'branch', 'Branch A'),
  ('c1000001-0000-4000-8000-000000000002', 'branch', 'Branch B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO latch_roles (id, role_class, display_name) VALUES
  ('b1000001-0000-4000-8000-000000000005', 'app', 'Branch admin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO latch_role_surfaces (role_id, surface_id, row_scope) VALUES
  ('b1000001-0000-4000-8000-000000000005', 'user_roles_detail', 'scope')
ON CONFLICT (role_id, surface_id) DO UPDATE SET row_scope = EXCLUDED.row_scope;

INSERT INTO latch_role_grants (role_id, surface_id, field_id, action) VALUES
  ('b1000001-0000-4000-8000-000000000005', 'user_roles_detail', NULL,           'read'),
  ('b1000001-0000-4000-8000-000000000005', 'user_roles_detail', NULL,           'write'),
  ('b1000001-0000-4000-8000-000000000005', 'user_roles_detail', 'profile',      'read'),
  ('b1000001-0000-4000-8000-000000000005', 'user_roles_detail', 'profile',      'write'),
  ('b1000001-0000-4000-8000-000000000005', 'user_roles_detail', 'role_assignments', 'read'),
  ('b1000001-0000-4000-8000-000000000005', 'user_roles_detail', 'role_assignments', 'write')
ON CONFLICT ON CONSTRAINT latch_role_grants_tuple_unique DO NOTHING;

INSERT INTO latch_role_delegations (role_id, assignable_role_id) VALUES
  ('b1000001-0000-4000-8000-000000000005', 'b1000001-0000-4000-8000-000000000001'),
  ('b1000001-0000-4000-8000-000000000005', 'b1000001-0000-4000-8000-000000000002')
ON CONFLICT DO NOTHING;

INSERT INTO latch_users (id, display_name) VALUES
  ('maria', 'Maria (Branch B admin)'),
  ('branch-a-user', 'Branch A control user')
ON CONFLICT (id) DO NOTHING;

INSERT INTO latch_user_roles (user_id, role_id, scope_id) VALUES
  ('maria', 'b1000001-0000-4000-8000-000000000005', 'c1000001-0000-4000-8000-000000000002'),
  ('branch-a-user', 'b1000001-0000-4000-8000-000000000001', 'c1000001-0000-4000-8000-000000000001')
ON CONFLICT DO NOTHING;

COMMIT;

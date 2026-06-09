-- SPIKE FIXTURE ONLY — not part of platform template provisioning (P3 2026-06-08).
-- Pilot personas + grants against widget_list (apps/spike_codegen vocabulary).
--
-- Fixture catalog UUIDs (spike harness only):
--   field_tech:   b1000001-0000-4000-8000-000000000001
--   office_admin: b1000001-0000-4000-8000-000000000002

BEGIN;

INSERT INTO latch_roles (id, role_class, display_name) VALUES
  ('b1000001-0000-4000-8000-000000000001', 'app', 'Field technician'),
  ('b1000001-0000-4000-8000-000000000002', 'app', 'Office admin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO latch_role_surfaces (role_id, surface_id, row_scope) VALUES
  ('b1000001-0000-4000-8000-000000000001', 'widget_list', 'own'),
  ('b1000001-0000-4000-8000-000000000002', 'widget_list', 'all')
ON CONFLICT (role_id, surface_id) DO NOTHING;

INSERT INTO latch_role_grants (role_id, surface_id, field_id, action) VALUES
  ('b1000001-0000-4000-8000-000000000001', 'widget_list', 'summary', 'read'),
  ('b1000001-0000-4000-8000-000000000001', 'widget_list', 'status',  'read'),
  ('b1000001-0000-4000-8000-000000000002', 'widget_list', 'summary', 'read'),
  ('b1000001-0000-4000-8000-000000000002', 'widget_list', 'summary', 'write'),
  ('b1000001-0000-4000-8000-000000000002', 'widget_list', 'status',  'read'),
  ('b1000001-0000-4000-8000-000000000002', 'widget_list', 'status',  'write')
ON CONFLICT ON CONSTRAINT latch_role_grants_tuple_unique DO NOTHING;

COMMIT;

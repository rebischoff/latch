-- Policy spike: proposed runtime-roles tables (task 01 DDL hypothesis).
-- See packages/policy/docs/tasks/00-decisions-needed.md (P1–P4) for the open forks.
-- Disposable fixture — NOT the template migration.

CREATE TABLE IF NOT EXISTS latch_roles (
  id           TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  kind         TEXT NOT NULL DEFAULT 'app',      -- 'app' | 'builtin'
  is_builtin   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS latch_role_grants (
  role_id    TEXT NOT NULL REFERENCES latch_roles(id) ON DELETE CASCADE,
  surface_id TEXT NOT NULL,
  field_id   TEXT NOT NULL,
  action     TEXT NOT NULL,                      -- validated vs codegen vocabulary at write time
  row_scope  TEXT,                               -- 'own' | 'all' (P1: per-row, nullable)
  effect     TEXT NOT NULL DEFAULT 'allow',      -- 'allow' | 'deny'
  mode       TEXT,                               -- P6 deferred: NULL = all modes
  PRIMARY KEY (role_id, surface_id, field_id, action)
);

-- Built-in catalog rows (P4: grants synthesized in code, NOT seeded as rows).
INSERT INTO latch_roles (id, display_name, kind, is_builtin) VALUES
  ('data_master', 'Data master', 'builtin', TRUE),
  ('iam_master',  'IAM master',  'builtin', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Pilot app roles (P3: seeded as deletable app rows so the spike is reproducible
-- without the role editor; grants below are normal rows).
INSERT INTO latch_roles (id, display_name, kind, is_builtin) VALUES
  ('field_tech',   'Field technician', 'app', FALSE),
  ('office_admin', 'Office admin',     'app', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Example grants for the spike surface (widget_list vocabulary from codegen).
INSERT INTO latch_role_grants (role_id, surface_id, field_id, action, row_scope) VALUES
  ('field_tech',   'widget_list', 'summary', 'read',  'own'),
  ('field_tech',   'widget_list', 'status',  'read',  'own'),
  ('office_admin', 'widget_list', 'summary', 'read',  'all'),
  ('office_admin', 'widget_list', 'summary', 'write', 'all'),
  ('office_admin', 'widget_list', 'status',  'read',  'all'),
  ('office_admin', 'widget_list', 'status',  'write', 'all')
ON CONFLICT (role_id, surface_id, field_id, action) DO NOTHING;

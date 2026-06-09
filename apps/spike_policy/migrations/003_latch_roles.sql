-- Platform template: runtime role catalog + bindings + sparse grants (P1 + P11 shape).
-- Seeds system catalog rows only (P3); grants synthesized in PolicyService (P4).
--
-- Ids are DB-generated UUIDs (gen_random_uuid). System rows are identified by
-- `role_class` (one each, enforced by the partial unique index), never by a
-- fixed id value — synthesis keys off role_class (P11, amended 2026-06-08).

BEGIN;

CREATE TABLE IF NOT EXISTS latch_roles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_class   TEXT NOT NULL,
  display_name TEXT NOT NULL,
  CONSTRAINT latch_roles_role_class_check
    CHECK (role_class IN ('system_data', 'system_iam', 'app'))
);

CREATE UNIQUE INDEX IF NOT EXISTS latch_roles_system_singleton
  ON latch_roles (role_class)
  WHERE role_class IN ('system_data', 'system_iam');

CREATE TABLE IF NOT EXISTS latch_role_surfaces (
  role_id    UUID NOT NULL REFERENCES latch_roles (id) ON DELETE CASCADE,
  surface_id TEXT NOT NULL,
  row_scope  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, surface_id)
);

CREATE TABLE IF NOT EXISTS latch_role_grants (
  role_id    UUID NOT NULL REFERENCES latch_roles (id) ON DELETE CASCADE,
  surface_id TEXT NOT NULL,
  field_id   TEXT,
  action     TEXT NOT NULL,
  mode       TEXT,
  CONSTRAINT latch_role_grants_tuple_unique
    UNIQUE NULLS NOT DISTINCT (role_id, surface_id, field_id, action)
);

INSERT INTO latch_roles (role_class, display_name) VALUES
  ('system_data', 'Data master'),
  ('system_iam',  'IAM master')
ON CONFLICT DO NOTHING;

COMMIT;

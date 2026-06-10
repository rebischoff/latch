-- Platform template: bounded scope primitive + scoped assignment/delegation seam (task 05 Phase A).
-- `NULL` scope_id on latch_user_roles = company-wide; system classes stay unscoped.

BEGIN;

CREATE TABLE IF NOT EXISTS latch_scopes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind         TEXT NOT NULL,
  parent_id    UUID REFERENCES latch_scopes (id),
  display_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS latch_role_delegations (
  role_id            UUID NOT NULL REFERENCES latch_roles (id) ON DELETE CASCADE,
  assignable_role_id UUID NOT NULL REFERENCES latch_roles (id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, assignable_role_id)
);

ALTER TABLE latch_user_roles
  ADD COLUMN IF NOT EXISTS scope_id UUID REFERENCES latch_scopes (id);

ALTER TABLE latch_user_roles
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

UPDATE latch_user_roles SET id = gen_random_uuid() WHERE id IS NULL;

ALTER TABLE latch_user_roles ALTER COLUMN id SET NOT NULL;

ALTER TABLE latch_user_roles DROP CONSTRAINT IF EXISTS latch_user_roles_pkey;

ALTER TABLE latch_user_roles
  ADD CONSTRAINT latch_user_roles_pkey PRIMARY KEY (id);

CREATE UNIQUE INDEX IF NOT EXISTS latch_user_roles_assignment_unique
  ON latch_user_roles (user_id, role_id, scope_id) NULLS NOT DISTINCT;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  latch_scopes,
  latch_role_delegations
TO latch_app;

COMMIT;

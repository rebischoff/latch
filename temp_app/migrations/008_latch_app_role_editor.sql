-- Role-editor write path (task 03): latch_app mutates catalog + grants; reads unchanged.
-- Grant rows still validated at write time against the codegen vocabulary catalog.

BEGIN;

GRANT INSERT, UPDATE, DELETE ON TABLE
  latch_roles,
  latch_role_surfaces,
  latch_role_grants
TO latch_app;

COMMIT;

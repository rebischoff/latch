-- Platform template: assignments reference the role catalog (P2 RESTRICT on delete; P11 UUID FK).

BEGIN;

ALTER TABLE latch_user_roles
  ALTER COLUMN role_id TYPE UUID USING role_id::uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'latch_user_roles_role_id_fkey'
  ) THEN
    ALTER TABLE latch_user_roles
      ADD CONSTRAINT latch_user_roles_role_id_fkey
      FOREIGN KEY (role_id) REFERENCES latch_roles (id) ON DELETE RESTRICT;
  END IF;
END
$$;

COMMIT;

-- SubHub: spec_unit.id + FKs → uuid (37p amendment — matches spec_def and app-wide uuid PK convention).
-- Prerequisite: 049 applied with text slug ids. No-op when 049 already used uuid (amended install).

BEGIN;

CREATE OR REPLACE FUNCTION migrate_050_spec_unit_uuid()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'spec_unit'
      AND column_name = 'id'
      AND data_type = 'text'
  ) THEN
    RAISE NOTICE '050: spec_unit.id is already uuid — skipping';
    RETURN;
  END IF;

  CREATE TEMP TABLE spec_unit_id_map (
    old_id text PRIMARY KEY,
    new_id uuid NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO spec_unit_id_map (old_id, new_id)
  VALUES
    ('ampere', 'a1000001-0001-4001-8001-000000000001'),
    ('milliampere', 'a1000001-0001-4001-8001-000000000002'),
    ('volt', 'a1000001-0001-4001-8001-000000000011'),
    ('millivolt', 'a1000001-0001-4001-8001-000000000012'),
    ('ton', 'a1000001-0001-4001-8001-000000000021'),
    ('psi', 'a1000001-0001-4001-8001-000000000031'),
    ('meter', 'a1000001-0001-4001-8001-000000000041'),
    ('millimeter', 'a1000001-0001-4001-8001-000000000042'),
    ('count', 'a1000001-0001-4001-8001-000000000051'),
    ('phase', 'a1000001-0001-4001-8001-000000000052');

  ALTER TABLE spec_def DROP CONSTRAINT IF EXISTS spec_def_unit_id_fkey;
  ALTER TABLE spec_unit DROP CONSTRAINT IF EXISTS spec_unit_canonical_unit_id_fkey;

  ALTER TABLE spec_unit ADD COLUMN new_id uuid;
  ALTER TABLE spec_unit ADD COLUMN new_canonical_unit_id uuid;

  UPDATE spec_unit su
  SET new_id = m.new_id
  FROM spec_unit_id_map m
  WHERE su.id = m.old_id;

  UPDATE spec_unit
  SET new_id = gen_random_uuid()
  WHERE new_id IS NULL;

  UPDATE spec_unit su
  SET new_canonical_unit_id = m.new_id
  FROM spec_unit_id_map m
  WHERE su.canonical_unit_id = m.old_id;

  ALTER TABLE spec_def ADD COLUMN new_unit_id uuid;

  UPDATE spec_def sd
  SET new_unit_id = m.new_id
  FROM spec_unit_id_map m
  WHERE sd.unit_id = m.old_id;

  ALTER TABLE spec_unit DROP CONSTRAINT spec_unit_pkey;
  ALTER TABLE spec_unit DROP COLUMN id;
  ALTER TABLE spec_unit DROP COLUMN canonical_unit_id;

  ALTER TABLE spec_unit RENAME COLUMN new_id TO id;
  ALTER TABLE spec_unit RENAME COLUMN new_canonical_unit_id TO canonical_unit_id;

  ALTER TABLE spec_unit ADD PRIMARY KEY (id);
  ALTER TABLE spec_unit ALTER COLUMN id SET DEFAULT gen_random_uuid();

  ALTER TABLE spec_def DROP COLUMN unit_id;
  ALTER TABLE spec_def RENAME COLUMN new_unit_id TO unit_id;

  ALTER TABLE spec_unit
    ADD CONSTRAINT spec_unit_canonical_unit_id_fkey
    FOREIGN KEY (canonical_unit_id) REFERENCES spec_unit (id) ON DELETE RESTRICT;

  ALTER TABLE spec_def
    ADD CONSTRAINT spec_def_unit_id_fkey
    FOREIGN KEY (unit_id) REFERENCES spec_unit (id) ON DELETE RESTRICT;
END;
$$;

SELECT migrate_050_spec_unit_uuid();
DROP FUNCTION migrate_050_spec_unit_uuid();

COMMIT;

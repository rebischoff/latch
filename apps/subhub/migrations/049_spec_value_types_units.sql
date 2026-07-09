-- SubHub: spec_unit table, number/range value types, value_number columns (task 37p).
-- Prerequisite: 048 applied.

BEGIN;

-- 0. Fail fast if text defs exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM spec_def WHERE value_type = 'text') THEN
    RAISE EXCEPTION '049: drop or retype all spec_def rows with value_type=text before applying';
  END IF;
END $$;

-- 1. spec_unit + seed (canonical rows first, then aliases with conversion factors)
CREATE TABLE spec_unit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  name text NOT NULL,
  dimension text NOT NULL,
  canonical_unit_id uuid REFERENCES spec_unit (id) ON DELETE RESTRICT,
  to_canonical_factor numeric NOT NULL DEFAULT 1,
  sort_order int NOT NULL DEFAULT 0
);

INSERT INTO spec_unit (id, symbol, name, dimension, canonical_unit_id, to_canonical_factor, sort_order)
VALUES
  ('a1000001-0001-4001-8001-000000000001', 'A', 'Ampere', 'current', NULL, 1, 1),
  ('a1000001-0001-4001-8001-000000000002', 'mA', 'Milliampere', 'current', 'a1000001-0001-4001-8001-000000000001', 0.001, 2),
  ('a1000001-0001-4001-8001-000000000011', 'V', 'Volt', 'voltage', NULL, 1, 1),
  ('a1000001-0001-4001-8001-000000000012', 'mV', 'Millivolt', 'voltage', 'a1000001-0001-4001-8001-000000000011', 0.001, 2),
  ('a1000001-0001-4001-8001-000000000021', 'ton', 'Ton (refrigeration)', 'refrigeration', NULL, 1, 1),
  ('a1000001-0001-4001-8001-000000000031', 'psi', 'PSI', 'pressure', NULL, 1, 1),
  ('a1000001-0001-4001-8001-000000000041', 'm', 'Meter', 'length', NULL, 1, 1),
  ('a1000001-0001-4001-8001-000000000042', 'mm', 'Millimeter', 'length', 'a1000001-0001-4001-8001-000000000041', 0.001, 2),
  ('a1000001-0001-4001-8001-000000000051', 'ea', 'Each', 'count', NULL, 1, 1),
  ('a1000001-0001-4001-8001-000000000052', 'ph', 'Phase', 'count', 'a1000001-0001-4001-8001-000000000051', 1, 2);

-- 2. spec_def columns + CHECK
ALTER TABLE spec_def
  ADD COLUMN unit_id uuid REFERENCES spec_unit (id) ON DELETE RESTRICT,
  ADD COLUMN decimal_places int;

ALTER TABLE spec_def DROP CONSTRAINT IF EXISTS spec_def_value_type_check;
ALTER TABLE spec_def DROP CONSTRAINT IF EXISTS system_spec_def_value_type_check;
ALTER TABLE spec_def ADD CONSTRAINT spec_def_value_type_check
  CHECK (value_type IN ('enum', 'boolean', 'number', 'range'));

-- 3. value_number columns on part + estimate bucket tables
ALTER TABLE manufacturer_part_spec
  ADD COLUMN value_number numeric,
  ADD COLUMN value_number_max numeric;

ALTER TABLE estimate_scope_spec
  ADD COLUMN value_number numeric,
  ADD COLUMN value_number_max numeric;

ALTER TABLE estimate_zone_spec
  ADD COLUMN value_number numeric,
  ADD COLUMN value_number_max numeric;

ALTER TABLE estimate_line_spec
  ADD COLUMN value_number numeric,
  ADD COLUMN value_number_max numeric;

-- 4. Drop value_text when no rows carry data
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM manufacturer_part_spec
    WHERE value_text IS NOT NULL AND btrim(value_text) <> ''
  ) THEN
    RAISE EXCEPTION '049: manufacturer_part_spec.value_text has data — migrate before dropping';
  END IF;

  IF EXISTS (
    SELECT 1 FROM estimate_scope_spec WHERE value_text IS NOT NULL AND btrim(value_text) <> ''
    UNION ALL
    SELECT 1 FROM estimate_zone_spec WHERE value_text IS NOT NULL AND btrim(value_text) <> ''
    UNION ALL
    SELECT 1 FROM estimate_line_spec WHERE value_text IS NOT NULL AND btrim(value_text) <> ''
  ) THEN
    RAISE EXCEPTION '049: estimate_*_spec.value_text has data — migrate before dropping';
  END IF;
END $$;

ALTER TABLE manufacturer_part_spec DROP COLUMN IF EXISTS value_text;
ALTER TABLE estimate_scope_spec DROP COLUMN IF EXISTS value_text;
ALTER TABLE estimate_zone_spec DROP COLUMN IF EXISTS value_text;
ALTER TABLE estimate_line_spec DROP COLUMN IF EXISTS value_text;

COMMIT;

-- Forward rewrite: Candela enum → Low | High only (41an).
-- Prerequisite: 062–068 applied (old cd options + presets may exist).
-- Idempotent on re-run: deletes Candela buckets/presets/part rows/options first, then re-seeds.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM item fa
    INNER JOIN spec_def sd ON sd.scope_root_item_id = fa.id
    WHERE fa.name = 'Fire Alarm'
      AND fa.parent_id IS NULL
      AND sd.display_name = 'Candela'
  ) THEN
    RAISE EXCEPTION '070_candela_low_high: Candela spec def missing (run 062 first)';
  END IF;
END
$$;

-- ─── 1. Clear Candela estimate buckets ───────────────────────────────────────

WITH fa_root AS (
  SELECT id FROM item WHERE name = 'Fire Alarm' AND parent_id IS NULL LIMIT 1
),
candela_def AS (
  SELECT sd.id
  FROM spec_def sd
  INNER JOIN fa_root r ON r.id = sd.scope_root_item_id
  WHERE sd.display_name = 'Candela'
  LIMIT 1
)
DELETE FROM estimate_condition_spec ecs
USING candela_def cd
WHERE ecs.spec_def_id = cd.id;

WITH fa_root AS (
  SELECT id FROM item WHERE name = 'Fire Alarm' AND parent_id IS NULL LIMIT 1
),
candela_def AS (
  SELECT sd.id
  FROM spec_def sd
  INNER JOIN fa_root r ON r.id = sd.scope_root_item_id
  WHERE sd.display_name = 'Candela'
  LIMIT 1
)
DELETE FROM estimate_line_spec els
USING candela_def cd
WHERE els.spec_def_id = cd.id;

-- ─── 2. Remove Candela threshold presets ─────────────────────────────────────

WITH fa_root AS (
  SELECT id FROM item WHERE name = 'Fire Alarm' AND parent_id IS NULL LIMIT 1
),
candela_def AS (
  SELECT sd.id
  FROM spec_def sd
  INNER JOIN fa_root r ON r.id = sd.scope_root_item_id
  WHERE sd.display_name = 'Candela'
  LIMIT 1
),
candela_presets AS (
  SELECT p.id
  FROM spec_threshold_preset p
  INNER JOIN candela_def cd ON cd.id = p.spec_def_id
)
DELETE FROM spec_threshold_preset_option stpo
USING candela_presets cp
WHERE stpo.preset_id = cp.id;

WITH fa_root AS (
  SELECT id FROM item WHERE name = 'Fire Alarm' AND parent_id IS NULL LIMIT 1
),
candela_def AS (
  SELECT sd.id
  FROM spec_def sd
  INNER JOIN fa_root r ON r.id = sd.scope_root_item_id
  WHERE sd.display_name = 'Candela'
  LIMIT 1
)
DELETE FROM spec_threshold_preset p
USING candela_def cd
WHERE p.spec_def_id = cd.id;

-- ─── 3. Clear Candela part rows ──────────────────────────────────────────────

WITH fa_root AS (
  SELECT id FROM item WHERE name = 'Fire Alarm' AND parent_id IS NULL LIMIT 1
),
candela_def AS (
  SELECT sd.id
  FROM spec_def sd
  INNER JOIN fa_root r ON r.id = sd.scope_root_item_id
  WHERE sd.display_name = 'Candela'
  LIMIT 1
)
DELETE FROM manufacturer_part_spec mps
USING candela_def cd
WHERE mps.spec_def_id = cd.id;

-- ─── 4. Replace Candela options — Low | High only ────────────────────────────

WITH fa_root AS (
  SELECT id FROM item WHERE name = 'Fire Alarm' AND parent_id IS NULL LIMIT 1
),
candela_def AS (
  SELECT sd.id
  FROM spec_def sd
  INNER JOIN fa_root r ON r.id = sd.scope_root_item_id
  WHERE sd.display_name = 'Candela'
  LIMIT 1
)
DELETE FROM spec_option so
USING candela_def cd
WHERE so.spec_def_id = cd.id;

WITH fa_root AS (
  SELECT id FROM item WHERE name = 'Fire Alarm' AND parent_id IS NULL LIMIT 1
),
candela_def AS (
  SELECT sd.id
  FROM spec_def sd
  INNER JOIN fa_root r ON r.id = sd.scope_root_item_id
  WHERE sd.display_name = 'Candela'
  LIMIT 1
),
option_seed AS (
  SELECT *
  FROM (
    VALUES
      ('Low', 1),
      ('High', 2)
  ) AS v (display_name, sort_order)
)
INSERT INTO spec_option (spec_def_id, display_name, sort_order)
SELECT cd.id, os.display_name, os.sort_order
FROM candela_def cd
CROSS JOIN option_seed os;

-- ─── 5. Seed Candela = Low on strobe-bearing parts (all mounts) ────────────────

WITH fa_root AS (
  SELECT id FROM item WHERE name = 'Fire Alarm' AND parent_id IS NULL LIMIT 1
),
candela_def AS (
  SELECT sd.id
  FROM spec_def sd
  INNER JOIN fa_root r ON r.id = sd.scope_root_item_id
  WHERE sd.display_name = 'Candela'
  LIMIT 1
),
low_option AS (
  SELECT so.id
  FROM spec_option so
  INNER JOIN candela_def cd ON cd.id = so.spec_def_id
  WHERE so.display_name = 'Low'
  LIMIT 1
),
strobe_parts AS (
  SELECT DISTINCT pi.part_id
  FROM part_item pi
  INNER JOIN item leaf ON leaf.id = pi.item_id
  WHERE leaf.name IN ('Horn/Strobe', 'Speaker/Strobe', 'Strobe')
)
INSERT INTO manufacturer_part_spec (
  manufacturer_part_id,
  spec_def_id,
  spec_option_id
)
SELECT
  sp.part_id,
  cd.id,
  lo.id
FROM strobe_parts sp
CROSS JOIN candela_def cd
CROSS JOIN low_option lo
WHERE NOT EXISTS (
  SELECT 1
  FROM manufacturer_part_spec existing
  WHERE existing.manufacturer_part_id = sp.part_id
    AND existing.spec_def_id = cd.id
    AND existing.spec_option_id = lo.id
);

COMMIT;

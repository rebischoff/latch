-- Dev fixtures: Candela enum (Low | High) on Fire Alarm.
-- Prerequisite: 043 (Fire Alarm specs), 048 (code columns dropped).
-- Idempotent: match by scope root + spec_def.display_name + spec_option.display_name.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM item fa
    INNER JOIN spec_def sd ON sd.scope_root_item_id = fa.id
    WHERE fa.name = 'Fire Alarm'
      AND fa.parent_id IS NULL
      AND sd.display_name IN ('Color', 'Notification Color')
  ) THEN
    RAISE EXCEPTION '062_candela_threshold_presets_seed: Fire Alarm spec defs missing (run 043 first)';
  END IF;
END
$$;

-- ─── 1. Candela spec def (Fire Alarm scope namespace) ────────────────────────

WITH fa_root AS (
  SELECT id FROM item WHERE name = 'Fire Alarm' AND parent_id IS NULL LIMIT 1
)
INSERT INTO spec_def (display_name, value_type, sort_order, scope_root_item_id)
SELECT 'Candela', 'enum', 4, r.id
FROM fa_root r
WHERE NOT EXISTS (
  SELECT 1
  FROM spec_def existing
  WHERE existing.scope_root_item_id = r.id
    AND existing.display_name = 'Candela'
);

-- ─── 2. Candela options — Low | High only ────────────────────────────────────

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
CROSS JOIN option_seed os
WHERE NOT EXISTS (
  SELECT 1
  FROM spec_option existing
  WHERE existing.spec_def_id = cd.id
    AND existing.display_name = os.display_name
);

-- Part candela rows: see 065_system_sensor_av_candela_specs.sql

COMMIT;

-- Dev fixtures: Candela enum + High/Low threshold presets on Fire Alarm.
-- Prerequisite: 043 (Fire Alarm specs), 048 (code columns dropped), 060 (threshold preset tables).
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

-- ─── 2. Candela options ───────────────────────────────────────────────────────

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
      ('15', 1),
      ('30', 2),
      ('75', 3),
      ('115', 4),
      ('135', 5),
      ('150', 6),
      ('177', 7),
      ('185', 8)
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

-- ─── 3. High / Low threshold presets ─────────────────────────────────────────

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
preset_seed AS (
  SELECT *
  FROM (
    VALUES
      ('Low', 1),
      ('High', 2)
  ) AS v (label, sort_order)
),
inserted_presets AS (
  INSERT INTO spec_threshold_preset (spec_def_id, label, sort_order)
  SELECT cd.id, ps.label, ps.sort_order
  FROM candela_def cd
  CROSS JOIN preset_seed ps
  WHERE NOT EXISTS (
    SELECT 1
    FROM spec_threshold_preset existing
    WHERE existing.spec_def_id = cd.id
      AND existing.label = ps.label
  )
  RETURNING id, label
),
all_presets AS (
  SELECT p.id, p.label
  FROM spec_threshold_preset p
  INNER JOIN candela_def cd ON cd.id = p.spec_def_id
  WHERE p.label IN ('Low', 'High')
),
low_options AS (
  SELECT so.id
  FROM spec_option so
  INNER JOIN candela_def cd ON cd.id = so.spec_def_id
  WHERE so.display_name IN ('15', '30', '75', '115')
),
high_options AS (
  SELECT so.id
  FROM spec_option so
  INNER JOIN candela_def cd ON cd.id = so.spec_def_id
  WHERE so.display_name IN ('135', '150', '177', '185')
)
INSERT INTO spec_threshold_preset_option (preset_id, spec_option_id)
SELECT ap.id, lo.id
FROM all_presets ap
CROSS JOIN low_options lo
WHERE ap.label = 'Low'
  AND NOT EXISTS (
    SELECT 1
    FROM spec_threshold_preset_option existing
    WHERE existing.preset_id = ap.id
      AND existing.spec_option_id = lo.id
  );

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
all_presets AS (
  SELECT p.id, p.label
  FROM spec_threshold_preset p
  INNER JOIN candela_def cd ON cd.id = p.spec_def_id
  WHERE p.label IN ('Low', 'High')
),
high_options AS (
  SELECT so.id
  FROM spec_option so
  INNER JOIN candela_def cd ON cd.id = so.spec_def_id
  WHERE so.display_name IN ('135', '150', '177', '185')
)
INSERT INTO spec_threshold_preset_option (preset_id, spec_option_id)
SELECT ap.id, ho.id
FROM all_presets ap
CROSS JOIN high_options ho
WHERE ap.label = 'High'
  AND NOT EXISTS (
    SELECT 1
    FROM spec_threshold_preset_option existing
    WHERE existing.preset_id = ap.id
      AND existing.spec_option_id = ho.id
  );

-- Part candela rows: see 065_system_sensor_av_candela_specs.sql

COMMIT;

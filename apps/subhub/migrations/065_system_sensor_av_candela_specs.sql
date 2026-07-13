-- Dev fixtures: System Sensor L-Series AV candela options + field-selectable part rows.
-- Source: System Sensor L-Series indoor horn/strobe datasheets (wall mount field-selectable
--         candela: 15, 30, 75, 95, 110, 135, 185 cd). Horn-only HRL has no strobe/candela.
-- Prerequisite: 062 (candela spec), 063 (System Sensor links + color/series), 048 (no code cols).
-- Idempotent: match by display_name; manufacturer_part_spec uses spec_option_id UUIDs.

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
    RAISE EXCEPTION '065_system_sensor_av_candela_specs: Candela spec missing (run 062 first)';
  END IF;
END
$$;

-- ─── 1. Candela enum options — wall-mount settings missing from 062 ───────────

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
      ('95', 9),
      ('110', 10)
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

-- ─── 2. Extend Low threshold preset with mid-wall settings (95, 110 cd) ───────

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
low_preset AS (
  SELECT p.id
  FROM spec_threshold_preset p
  INNER JOIN candela_def cd ON cd.id = p.spec_def_id
  WHERE p.label = 'Low'
  LIMIT 1
),
mid_wall_options AS (
  SELECT so.id
  FROM spec_option so
  INNER JOIN candela_def cd ON cd.id = so.spec_def_id
  WHERE so.display_name IN ('95', '110')
)
INSERT INTO spec_threshold_preset_option (preset_id, spec_option_id)
SELECT lp.id, mwo.id
FROM low_preset lp
CROSS JOIN mid_wall_options mwo
WHERE NOT EXISTS (
  SELECT 1
  FROM spec_threshold_preset_option existing
  WHERE existing.preset_id = lp.id
    AND existing.spec_option_id = mwo.id
);

-- ─── 3. Replace candela rows on L-Series wall horn/strobes ───────────────────
--    Field-selectable per device: 15, 30, 75, 95, 110, 135, 185 cd.

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
av_horn_strobe AS (
  SELECT mp.id AS part_id
  FROM manufacturer_part mp
  INNER JOIN party p ON p.id = mp.manufacturer_party_id AND p.display_name = 'System Sensor'
  INNER JOIN party_role pr ON pr.party_id = p.id AND pr.role = 'manufacturer'
  WHERE mp.mpn IN ('P2RL', 'P2RLED', 'P2RL-LF')
)
DELETE FROM manufacturer_part_spec mps
USING candela_def cd, av_horn_strobe ahs
WHERE mps.manufacturer_part_id = ahs.part_id
  AND mps.spec_def_id = cd.id;

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
option_by_name AS (
  SELECT so.display_name, so.id
  FROM spec_option so
  INNER JOIN candela_def cd ON cd.id = so.spec_def_id
),
wall_candela AS (
  SELECT unnest(
    ARRAY['15', '30', '75', '95', '110', '135', '185']
  ) AS display_name
),
part_spec_seed AS (
  SELECT *
  FROM (
    VALUES
      ('System Sensor', 'P2RL'),
      ('System Sensor', 'P2RLED'),
      ('System Sensor', 'P2RL-LF')
  ) AS v (mfr_name, mpn)
)
INSERT INTO manufacturer_part_spec (
  manufacturer_part_id,
  spec_def_id,
  spec_option_id
)
SELECT
  mp.id,
  cd.id,
  obn.id
FROM part_spec_seed pss
CROSS JOIN candela_def cd
CROSS JOIN wall_candela wc
INNER JOIN option_by_name obn ON obn.display_name = wc.display_name
INNER JOIN party p ON p.display_name = pss.mfr_name AND p.kind = 'organization'
INNER JOIN party_role pr ON pr.party_id = p.id AND pr.role = 'manufacturer'
INNER JOIN manufacturer_part mp
  ON mp.manufacturer_party_id = p.id
 AND mp.mpn = pss.mpn
WHERE NOT EXISTS (
  SELECT 1
  FROM manufacturer_part_spec existing
  WHERE existing.manufacturer_part_id = mp.id
    AND existing.spec_def_id = cd.id
    AND existing.spec_option_id = obn.id
);

-- ─── 4. Horn-only HRL — no candela (no strobe) ───────────────────────────────

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
hrl_part AS (
  SELECT mp.id
  FROM manufacturer_part mp
  INNER JOIN party p ON p.id = mp.manufacturer_party_id AND p.display_name = 'System Sensor'
  INNER JOIN party_role pr ON pr.party_id = p.id AND pr.role = 'manufacturer'
  WHERE mp.mpn = 'HRL'
  LIMIT 1
)
DELETE FROM manufacturer_part_spec mps
USING candela_def cd, hrl_part hp
WHERE mps.manufacturer_part_id = hp.id
  AND mps.spec_def_id = cd.id;

COMMIT;

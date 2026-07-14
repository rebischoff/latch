-- Dev fixtures: System Sensor L-Series AV candela — Low on horn/strobes only.
-- Source: System Sensor L-Series indoor horn/strobe datasheets (capability class Low).
-- Horn-only HRL has no strobe/candela.
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

-- ─── 1. Replace candela rows on L-Series wall horn/strobes — Low only ────────

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
),
low_option AS (
  SELECT so.id
  FROM spec_option so
  INNER JOIN candela_def cd ON cd.id = so.spec_def_id
  WHERE so.display_name = 'Low'
  LIMIT 1
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
low_option AS (
  SELECT so.id
  FROM spec_option so
  INNER JOIN candela_def cd ON cd.id = so.spec_def_id
  WHERE so.display_name = 'Low'
  LIMIT 1
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
  lo.id
FROM part_spec_seed pss
CROSS JOIN candela_def cd
CROSS JOIN low_option lo
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
    AND existing.spec_option_id = lo.id
);

-- ─── 2. Horn-only HRL — no candela (no strobe) ───────────────────────────────

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

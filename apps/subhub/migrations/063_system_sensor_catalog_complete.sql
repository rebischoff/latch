-- Dev fixtures: System Sensor part links and compatibility specs.
-- Prerequisite: 027 (parts), 043 (Fire Alarm catalog), 048 (code columns dropped),
--               059 (notification mount tree), 062 (candela spec def + options).
-- Idempotent: match by item path + mfr/mpn + spec/option display_name.
-- Part specs use scope-root namespace (37ai V3) — FK ids only, no string codes.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM party p
    INNER JOIN party_role pr ON pr.party_id = p.id AND pr.role = 'manufacturer'
    INNER JOIN manufacturer_part mp ON mp.manufacturer_party_id = p.id
    WHERE p.display_name = 'System Sensor'
      AND mp.mpn = 'P2RL'
  ) THEN
    RAISE EXCEPTION '063_system_sensor_catalog_complete: System Sensor parts missing (run 027 first)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM item fa
    INNER JOIN spec_def sd ON sd.scope_root_item_id = fa.id
    WHERE fa.name = 'Fire Alarm'
      AND fa.parent_id IS NULL
      AND sd.display_name = 'Candela'
  ) THEN
    RAISE EXCEPTION '063_system_sensor_catalog_complete: Candela spec missing (run 062 first)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM item fa
    INNER JOIN item na ON na.parent_id = fa.id AND na.name = 'Notification Appliances'
    INNER JOIN item mount ON mount.parent_id = na.id AND mount.name = 'Wall'
    INNER JOIN item leaf ON leaf.parent_id = mount.id AND leaf.name = 'Horn/Strobe'
    WHERE fa.name = 'Fire Alarm'
      AND fa.parent_id IS NULL
  ) THEN
    RAISE EXCEPTION '063_system_sensor_catalog_complete: Wall mount leaves missing (run 059 first)';
  END IF;
END
$$;

-- ─── 1. part_item — notification leaves (post-059 mount paths) ───────────────

WITH fa_root AS (
  SELECT id FROM item WHERE name = 'Fire Alarm' AND parent_id IS NULL LIMIT 1
),
notification_branch AS (
  SELECT b.id, b.name AS branch_name
  FROM item b
  INNER JOIN fa_root r ON b.parent_id = r.id
  WHERE b.name = 'Notification Appliances'
  LIMIT 1
),
catalog_mount_leaf AS (
  SELECT
    leaf.id AS item_id,
    nb.branch_name,
    mount.name AS mount_name,
    leaf.name AS leaf_name
  FROM item leaf
  INNER JOIN item mount ON mount.id = leaf.parent_id
  INNER JOIN notification_branch nb ON nb.id = mount.parent_id
),
part_seed AS (
  SELECT *
  FROM (
    VALUES
      ('Notification Appliances', 'Wall', 'Horn/Strobe', 'System Sensor', 'P2RL', 1),
      ('Notification Appliances', 'Wall', 'Horn/Strobe', 'System Sensor', 'P2RL-LF', 2),
      ('Notification Appliances', 'Wall', 'Horn/Strobe', 'System Sensor', 'P2RLED', 3),
      ('Notification Appliances', 'Wall', 'Horn', 'System Sensor', 'HRL', 1)
  ) AS v (branch_name, mount_name, leaf_name, mfr_name, mpn, sort_order)
)
INSERT INTO part_item (part_id, item_id, sort_order)
SELECT mp.id, cl.item_id, ps.sort_order
FROM part_seed ps
INNER JOIN catalog_mount_leaf cl
  ON cl.branch_name = ps.branch_name
 AND cl.mount_name = ps.mount_name
 AND cl.leaf_name = ps.leaf_name
INNER JOIN party p ON p.display_name = ps.mfr_name AND p.kind = 'organization'
INNER JOIN party_role pr ON pr.party_id = p.id AND pr.role = 'manufacturer'
INNER JOIN manufacturer_part mp
  ON mp.manufacturer_party_id = p.id
 AND mp.mpn = ps.mpn
WHERE NOT EXISTS (
  SELECT 1
  FROM part_item existing
  WHERE existing.part_id = mp.id
    AND existing.item_id = cl.item_id
);

-- ─── 2. manufacturer_part_spec — L-Series color + series ─────────────────────

WITH fa_root AS (
  SELECT id FROM item WHERE name = 'Fire Alarm' AND parent_id IS NULL LIMIT 1
),
option_by_def AS (
  SELECT
    sd.display_name AS def_display_name,
    so.display_name AS option_display_name,
    so.id AS option_id,
    sd.id AS def_id
  FROM spec_def sd
  INNER JOIN fa_root r ON r.id = sd.scope_root_item_id
  INNER JOIN spec_option so ON so.spec_def_id = sd.id
  WHERE sd.display_name IN ('Color', 'Series', 'Notification Color', 'Notification Series')
),
part_spec_seed AS (
  SELECT *
  FROM (
    VALUES
      ('System Sensor', 'P2RL', 'Notification Color', 'Red'),
      ('System Sensor', 'P2RL', 'Notification Series', 'System Sensor L-Series'),
      ('System Sensor', 'P2RLED', 'Notification Color', 'Red'),
      ('System Sensor', 'P2RLED', 'Notification Series', 'System Sensor L-Series'),
      ('System Sensor', 'P2RL-LF', 'Notification Color', 'Red'),
      ('System Sensor', 'P2RL-LF', 'Notification Series', 'System Sensor L-Series'),
      ('System Sensor', 'HRL', 'Notification Color', 'Red'),
      ('System Sensor', 'HRL', 'Notification Series', 'System Sensor L-Series'),
      ('System Sensor', 'P2RL', 'Color', 'Red'),
      ('System Sensor', 'P2RL', 'Series', 'L-Series'),
      ('System Sensor', 'P2RLED', 'Color', 'Red'),
      ('System Sensor', 'P2RLED', 'Series', 'L-Series'),
      ('System Sensor', 'P2RL-LF', 'Color', 'Red'),
      ('System Sensor', 'P2RL-LF', 'Series', 'L-Series'),
      ('System Sensor', 'HRL', 'Color', 'Red'),
      ('System Sensor', 'HRL', 'Series', 'L-Series')
  ) AS v (mfr_name, mpn, def_display_name, option_display_name)
)
INSERT INTO manufacturer_part_spec (
  manufacturer_part_id,
  spec_def_id,
  spec_option_id
)
SELECT
  mp.id,
  obd.def_id,
  obd.option_id
FROM part_spec_seed pss
INNER JOIN option_by_def obd
  ON obd.def_display_name = pss.def_display_name
 AND obd.option_display_name = pss.option_display_name
INNER JOIN party p ON p.display_name = pss.mfr_name AND p.kind = 'organization'
INNER JOIN party_role pr ON pr.party_id = p.id AND pr.role = 'manufacturer'
INNER JOIN manufacturer_part mp
  ON mp.manufacturer_party_id = p.id
 AND mp.mpn = pss.mpn
WHERE NOT EXISTS (
  SELECT 1
  FROM manufacturer_part_spec existing
  WHERE existing.manufacturer_part_id = mp.id
    AND existing.spec_def_id = obd.def_id
    AND existing.spec_option_id = obd.option_id
);

-- ─── 3. manufacturer_part_spec — addressable sounder bases (SLC) ─────────────

WITH fa_root AS (
  SELECT id FROM item WHERE name = 'Fire Alarm' AND parent_id IS NULL LIMIT 1
),
slc_def AS (
  SELECT sd.id
  FROM spec_def sd
  INNER JOIN fa_root r ON r.id = sd.scope_root_item_id
  WHERE sd.display_name = 'SLC Protocol'
  LIMIT 1
),
litespeed AS (
  SELECT so.id
  FROM spec_option so
  INNER JOIN slc_def sd ON sd.id = so.spec_def_id
  WHERE so.display_name IN ('LiteSpeed', 'FireLite LiteSpeed')
  LIMIT 1
),
part_spec_seed AS (
  SELECT *
  FROM (
    VALUES
      ('System Sensor', 'B200S'),
      ('System Sensor', 'B200S-LF')
  ) AS v (mfr_name, mpn)
)
INSERT INTO manufacturer_part_spec (
  manufacturer_part_id,
  spec_def_id,
  spec_option_id
)
SELECT
  mp.id,
  sd.id,
  ls.id
FROM part_spec_seed pss
CROSS JOIN slc_def sd
CROSS JOIN litespeed ls
INNER JOIN party p ON p.display_name = pss.mfr_name AND p.kind = 'organization'
INNER JOIN party_role pr ON pr.party_id = p.id AND pr.role = 'manufacturer'
INNER JOIN manufacturer_part mp
  ON mp.manufacturer_party_id = p.id
 AND mp.mpn = pss.mpn
WHERE NOT EXISTS (
  SELECT 1
  FROM manufacturer_part_spec existing
  WHERE existing.manufacturer_part_id = mp.id
    AND existing.spec_def_id = sd.id
    AND existing.spec_option_id = ls.id
);

COMMIT;

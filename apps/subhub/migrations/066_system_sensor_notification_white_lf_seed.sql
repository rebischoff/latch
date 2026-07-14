-- Dev fixtures: System Sensor L-Series white notification appliances + low-frequency horn/strobe lineup.
-- Source: System Sensor L-Series indoor notification datasheets (P2WL/P2WLED/HWL white; P2WL-LF/HRL-LF/HWL-LF 520 Hz).
-- Prerequisite: 027 (parts), 059 (notification mount tree), 062 (candela), 063 (System Sensor red links),
--               065 (wall candela rows on horn/strobes).
-- Idempotent: match by mpn + item path + spec display_name; skip existing rows.

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
    RAISE EXCEPTION '066_system_sensor_notification_white_lf_seed: System Sensor P2RL missing (run 027/063 first)';
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
    RAISE EXCEPTION '066_system_sensor_notification_white_lf_seed: Wall mount leaves missing (run 059 first)';
  END IF;
END
$$;

-- ─── 1. Low Frequency boolean spec (Fire Alarm scope namespace) ──────────────

WITH fa_root AS (
  SELECT id FROM item WHERE name = 'Fire Alarm' AND parent_id IS NULL LIMIT 1
)
INSERT INTO spec_def (display_name, value_type, sort_order, scope_root_item_id)
SELECT 'Low Frequency', 'boolean', 5, r.id
FROM fa_root r
WHERE NOT EXISTS (
  SELECT 1
  FROM spec_def existing
  WHERE existing.scope_root_item_id = r.id
    AND existing.display_name = 'Low Frequency'
);

-- ─── 2. manufacturer_part — white + LF notification appliances ───────────────

WITH part_seed AS (
  SELECT *
  FROM (
    VALUES
      ('System Sensor', 'P2WL', 'L-Series 2-wire horn/strobe, wall mount, white', 'ea', NULL::text, 1::numeric),
      ('System Sensor', 'P2WLED', 'L-Series LED horn/strobe, wall mount, white', 'ea', NULL, 1),
      ('System Sensor', 'HWL', 'L-Series horn only, wall mount, white', 'ea', NULL, 1),
      ('System Sensor', 'P2WL-LF', 'L-Series low-frequency sounder/strobe, wall mount, white', 'ea', NULL, 1),
      ('System Sensor', 'HRL-LF', 'L-Series low-frequency horn, wall mount, red', 'ea', NULL, 1),
      ('System Sensor', 'HWL-LF', 'L-Series low-frequency horn, wall mount, white', 'ea', NULL, 1)
  ) AS v (mfr_name, mpn, description, unit, purchase_unit, units_per_purchase)
)
INSERT INTO manufacturer_part (
  manufacturer_party_id,
  mpn,
  description,
  unit,
  purchase_unit,
  units_per_purchase
)
SELECT
  p.id,
  ps.mpn,
  ps.description,
  ps.unit,
  ps.purchase_unit,
  ps.units_per_purchase
FROM part_seed ps
INNER JOIN party p ON p.display_name = ps.mfr_name
INNER JOIN party_role pr ON pr.party_id = p.id AND pr.role = 'manufacturer'
WHERE NOT EXISTS (
  SELECT 1
  FROM manufacturer_part mp
  WHERE mp.manufacturer_party_id = p.id
    AND mp.mpn = ps.mpn
);

-- ─── 3. vendor_part — ADI / Graybar / WESCO pricing ─────────────────────────

WITH pricing_seed AS (
  SELECT *
  FROM (
    VALUES
      ('System Sensor', 'P2WL', 'ADI Global Distribution', 'ADI-P2WL', 'L-Series horn/strobe P2WL white', 72.00, true),
      ('System Sensor', 'P2WL', 'WESCO International', 'WES-P2WL', 'Horn/strobe wall white P2WL', 76.50, false),
      ('System Sensor', 'P2WLED', 'Graybar', 'GRY-P2WLED', 'LED horn/strobe P2WLED white', 78.00, true),
      ('System Sensor', 'HWL', 'ADI Global Distribution', 'ADI-HWL', 'L-Series horn HWL white', 42.00, true),
      ('System Sensor', 'P2WL-LF', 'ADI Global Distribution', 'ADI-P2WL-LF', 'Low-frequency sounder/strobe P2WL-LF white', 89.00, true),
      ('System Sensor', 'P2WL-LF', 'WESCO International', 'WES-P2WL-LF', 'LF sounder/strobe P2WL-LF white', 94.50, false),
      ('System Sensor', 'HRL-LF', 'ADI Global Distribution', 'ADI-HRL-LF', 'Low-frequency horn HRL-LF red', 48.00, true),
      ('System Sensor', 'HWL-LF', 'ADI Global Distribution', 'ADI-HWL-LF', 'Low-frequency horn HWL-LF white', 48.00, true)
  ) AS v (mfr_name, mpn, vendor_name, vendor_pn, vendor_description, unit_price, is_preferred)
)
INSERT INTO vendor_part (
  vendor_party_id,
  manufacturer_part_id,
  vendor_pn,
  vendor_description,
  unit_price,
  is_preferred
)
SELECT
  vp.id,
  mp.id,
  ps.vendor_pn,
  ps.vendor_description,
  ps.unit_price,
  ps.is_preferred
FROM pricing_seed ps
INNER JOIN party mfr ON mfr.display_name = ps.mfr_name
INNER JOIN party_role mfr_role ON mfr_role.party_id = mfr.id AND mfr_role.role = 'manufacturer'
INNER JOIN manufacturer_part mp
  ON mp.manufacturer_party_id = mfr.id
 AND mp.mpn = ps.mpn
INNER JOIN party vp ON vp.display_name = ps.vendor_name AND vp.kind = 'organization'
INNER JOIN party_role vendor_role ON vendor_role.party_id = vp.id AND vendor_role.role = 'vendor'
WHERE NOT EXISTS (
  SELECT 1
  FROM vendor_part existing
  WHERE existing.vendor_party_id = vp.id
    AND existing.vendor_pn = ps.vendor_pn
);

-- ─── 4. part_item — notification leaves (post-059 mount paths) ───────────────

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
      ('Notification Appliances', 'Wall', 'Horn/Strobe', 'System Sensor', 'P2WL', 4),
      ('Notification Appliances', 'Wall', 'Horn/Strobe', 'System Sensor', 'P2WLED', 5),
      ('Notification Appliances', 'Wall', 'Horn/Strobe', 'System Sensor', 'P2WL-LF', 6),
      ('Notification Appliances', 'Wall', 'Horn', 'System Sensor', 'HWL', 2),
      ('Notification Appliances', 'Wall', 'Horn', 'System Sensor', 'HRL-LF', 3),
      ('Notification Appliances', 'Wall', 'Horn', 'System Sensor', 'HWL-LF', 4)
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

-- ─── 5. manufacturer_part_spec — color + series ──────────────────────────────

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
      ('System Sensor', 'P2WL', 'White'),
      ('System Sensor', 'P2WLED', 'White'),
      ('System Sensor', 'HWL', 'White'),
      ('System Sensor', 'P2WL-LF', 'White'),
      ('System Sensor', 'HRL-LF', 'Red'),
      ('System Sensor', 'HWL-LF', 'White')
  ) AS v (mfr_name, mpn, color_name)
),
color_rows AS (
  SELECT
    pss.mfr_name,
    pss.mpn,
    obd.def_id,
    obd.option_id
  FROM part_spec_seed pss
  INNER JOIN option_by_def obd
    ON obd.def_display_name IN ('Color', 'Notification Color')
   AND obd.option_display_name = pss.color_name
),
series_rows AS (
  SELECT
    pss.mfr_name,
    pss.mpn,
    obd.def_id,
    obd.option_id
  FROM part_spec_seed pss
  CROSS JOIN option_by_def obd
  WHERE obd.def_display_name IN ('Series', 'Notification Series')
    AND obd.option_display_name IN ('L-Series', 'System Sensor L-Series')
)
INSERT INTO manufacturer_part_spec (
  manufacturer_part_id,
  spec_def_id,
  spec_option_id
)
SELECT
  mp.id,
  rows.def_id,
  rows.option_id
FROM (
  SELECT * FROM color_rows
  UNION ALL
  SELECT * FROM series_rows
) rows
INNER JOIN party p ON p.display_name = rows.mfr_name AND p.kind = 'organization'
INNER JOIN party_role pr ON pr.party_id = p.id AND pr.role = 'manufacturer'
INNER JOIN manufacturer_part mp
  ON mp.manufacturer_party_id = p.id
 AND mp.mpn = rows.mpn
WHERE NOT EXISTS (
  SELECT 1
  FROM manufacturer_part_spec existing
  WHERE existing.manufacturer_part_id = mp.id
    AND existing.spec_def_id = rows.def_id
    AND existing.spec_option_id = rows.option_id
);

-- ─── 6. manufacturer_part_spec — Low Frequency boolean ───────────────────────
--    true: 520 Hz sounder/strobe + horn + sounder-base parts already in catalog.
--    Non-LF parts omit the row (37ai V5 wildcard).

WITH fa_root AS (
  SELECT id FROM item WHERE name = 'Fire Alarm' AND parent_id IS NULL LIMIT 1
),
lf_def AS (
  SELECT sd.id
  FROM spec_def sd
  INNER JOIN fa_root r ON r.id = sd.scope_root_item_id
  WHERE sd.display_name = 'Low Frequency'
  LIMIT 1
),
lf_part_seed AS (
  SELECT *
  FROM (
    VALUES
      ('System Sensor', 'P2RL-LF'),
      ('System Sensor', 'P2WL-LF'),
      ('System Sensor', 'HRL-LF'),
      ('System Sensor', 'HWL-LF'),
      ('System Sensor', 'B200S-LF')
  ) AS v (mfr_name, mpn)
)
INSERT INTO manufacturer_part_spec (
  manufacturer_part_id,
  spec_def_id,
  value_boolean
)
SELECT
  mp.id,
  ld.id,
  true
FROM lf_part_seed lps
CROSS JOIN lf_def ld
INNER JOIN party p ON p.display_name = lps.mfr_name AND p.kind = 'organization'
INNER JOIN party_role pr ON pr.party_id = p.id AND pr.role = 'manufacturer'
INNER JOIN manufacturer_part mp
  ON mp.manufacturer_party_id = p.id
 AND mp.mpn = lps.mpn
WHERE NOT EXISTS (
  SELECT 1
  FROM manufacturer_part_spec existing
  WHERE existing.manufacturer_part_id = mp.id
    AND existing.spec_def_id = ld.id
);

-- ─── 7. manufacturer_part_spec — candela Low on wall horn/strobes ─────────────

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
horn_strobe_seed AS (
  SELECT *
  FROM (
    VALUES
      ('System Sensor', 'P2WL'),
      ('System Sensor', 'P2WLED'),
      ('System Sensor', 'P2WL-LF')
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
FROM horn_strobe_seed hss
CROSS JOIN candela_def cd
CROSS JOIN low_option lo
INNER JOIN party p ON p.display_name = hss.mfr_name AND p.kind = 'organization'
INNER JOIN party_role pr ON pr.party_id = p.id AND pr.role = 'manufacturer'
INNER JOIN manufacturer_part mp
  ON mp.manufacturer_party_id = p.id
 AND mp.mpn = hss.mpn
WHERE NOT EXISTS (
  SELECT 1
  FROM manufacturer_part_spec existing
  WHERE existing.manufacturer_part_id = mp.id
    AND existing.spec_def_id = cd.id
    AND existing.spec_option_id = lo.id
);

COMMIT;

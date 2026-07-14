-- Dev fixtures: System Sensor mount-correct catalog — undo 067 wall→ceiling/outdoor copies,
-- conventional smoke SLC specs, ceiling/outdoor L-Series parts, Candela Low on horn/strobes.
-- Prerequisite: 027, 059, 062, 063, 065, 066, 067 applied.
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
    RAISE EXCEPTION '068_system_sensor_mount_catalog_fix: System Sensor P2RL missing (run 027/063 first)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM item fa
    INNER JOIN item na ON na.parent_id = fa.id AND na.name = 'Notification Appliances'
    INNER JOIN item mount ON mount.parent_id = na.id AND mount.name IN ('Ceiling', 'Outdoor', 'Wall')
    WHERE fa.name = 'Fire Alarm'
      AND fa.parent_id IS NULL
    GROUP BY fa.id
    HAVING COUNT(DISTINCT mount.name) = 3
  ) THEN
    RAISE EXCEPTION '068_system_sensor_mount_catalog_fix: notification mount tree missing (run 059 first)';
  END IF;
END
$$;

-- ─── 1. Remove erroneous Ceiling / Outdoor links on indoor wall-only MPNs (067 undo) ─

WITH fa_root AS (
  SELECT id FROM item WHERE name = 'Fire Alarm' AND parent_id IS NULL LIMIT 1
),
notification_branch AS (
  SELECT b.id
  FROM item b
  INNER JOIN fa_root r ON b.parent_id = r.id
  WHERE b.name = 'Notification Appliances'
  LIMIT 1
),
non_wall_leaves AS (
  SELECT leaf.id AS item_id
  FROM item leaf
  INNER JOIN item mount ON mount.id = leaf.parent_id
  INNER JOIN notification_branch nb ON nb.id = mount.parent_id
  WHERE mount.name IN ('Ceiling', 'Outdoor')
),
wall_only_mpns AS (
  SELECT mp.id
  FROM manufacturer_part mp
  INNER JOIN party p ON p.id = mp.manufacturer_party_id AND p.display_name = 'System Sensor'
  INNER JOIN party_role pr ON pr.party_id = p.id AND pr.role = 'manufacturer'
  WHERE mp.mpn IN (
    'P2RL', 'P2RL-LF', 'P2RLED',
    'P2WL', 'P2WLED', 'P2WL-LF',
    'HRL', 'HRL-LF', 'HWL', 'HWL-LF'
  )
)
DELETE FROM part_item pi
USING non_wall_leaves nwl, wall_only_mpns wom
WHERE pi.item_id = nwl.item_id
  AND pi.part_id = wom.id;

-- ─── 2. Conventional smokes — SLC Protocol = Conventional (None) ─────────────

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
conventional AS (
  SELECT so.id
  FROM spec_option so
  INNER JOIN slc_def sd ON sd.id = so.spec_def_id
  WHERE so.display_name = 'Conventional (None)'
  LIMIT 1
),
smoke_seed AS (
  SELECT *
  FROM (
    VALUES
      ('System Sensor', '2W-B'),
      ('System Sensor', '4W-B'),
      ('System Sensor', '2WT-B')
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
  cv.id
FROM smoke_seed ss
CROSS JOIN slc_def sd
CROSS JOIN conventional cv
INNER JOIN party p ON p.display_name = ss.mfr_name AND p.kind = 'organization'
INNER JOIN party_role pr ON pr.party_id = p.id AND pr.role = 'manufacturer'
INNER JOIN manufacturer_part mp
  ON mp.manufacturer_party_id = p.id
 AND mp.mpn = ss.mpn
WHERE NOT EXISTS (
  SELECT 1
  FROM manufacturer_part_spec existing
  WHERE existing.manufacturer_part_id = mp.id
    AND existing.spec_def_id = sd.id
);

-- ─── 3. manufacturer_part — ceiling + outdoor L-Series notification ──────────

WITH part_seed AS (
  SELECT *
  FROM (
    VALUES
      ('System Sensor', 'PC2RLED', 'L-Series LED horn/strobe, ceiling mount, red', 'ea', NULL::text, 1::numeric),
      ('System Sensor', 'PC2WLED', 'L-Series LED horn/strobe, ceiling mount, white', 'ea', NULL, 1),
      ('System Sensor', 'PC2RLED-LF', 'L-Series LED low-frequency horn/strobe, ceiling mount, red', 'ea', NULL, 1),
      ('System Sensor', 'P2GRKLED', 'L-Series outdoor LED horn/strobe, wall mount, red', 'ea', NULL, 1),
      ('System Sensor', 'PC2RKLED', 'L-Series outdoor LED horn/strobe, ceiling mount, red', 'ea', NULL, 1),
      ('System Sensor', 'HGRKL', 'L-Series outdoor horn only, wall mount, red', 'ea', NULL, 1)
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

-- ─── 5. vendor_part — dev pricing ────────────────────────────────────────────

WITH pricing_seed AS (
  SELECT *
  FROM (
    VALUES
      ('System Sensor', 'PC2RLED', 'ADI Global Distribution', 'ADI-PC2RLED', 'LED ceiling horn/strobe PC2RLED red', 95.00, true),
      ('System Sensor', 'PC2RLED', 'Graybar', 'GRY-PC2RLED', 'Ceiling horn/strobe PC2RLED red', 98.50, false),
      ('System Sensor', 'PC2WLED', 'Graybar', 'GRY-PC2WLED', 'LED ceiling horn/strobe PC2WLED white', 95.00, true),
      ('System Sensor', 'PC2RLED-LF', 'ADI Global Distribution', 'ADI-PC2RLED-LF', 'LF ceiling horn/strobe PC2RLED-LF red', 105.00, true),
      ('System Sensor', 'P2GRKLED', 'ADI Global Distribution', 'ADI-P2GRKLED', 'Outdoor LED horn/strobe P2GRKLED red', 98.00, true),
      ('System Sensor', 'P2GRKLED', 'WESCO International', 'WES-P2GRKLED', 'Outdoor wall horn/strobe P2GRKLED', 102.00, false),
      ('System Sensor', 'PC2RKLED', 'ADI Global Distribution', 'ADI-PC2RKLED', 'Outdoor LED ceiling horn/strobe PC2RKLED red', 108.00, true),
      ('System Sensor', 'HGRKL', 'ADI Global Distribution', 'ADI-HGRKL', 'Outdoor horn HGRKL red', 52.00, true)
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

-- ─── 6. part_item — one mount-specific leaf per part ─────────────────────────

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
      ('Notification Appliances', 'Ceiling', 'Horn/Strobe', 'System Sensor', 'PC2RLED', 1),
      ('Notification Appliances', 'Ceiling', 'Horn/Strobe', 'System Sensor', 'PC2WLED', 2),
      ('Notification Appliances', 'Ceiling', 'Horn/Strobe', 'System Sensor', 'PC2RLED-LF', 3),
      ('Notification Appliances', 'Outdoor', 'Horn/Strobe', 'System Sensor', 'P2GRKLED', 1),
      ('Notification Appliances', 'Outdoor', 'Horn/Strobe', 'System Sensor', 'PC2RKLED', 2),
      ('Notification Appliances', 'Outdoor', 'Horn', 'System Sensor', 'HGRKL', 1)
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

-- ─── 7. manufacturer_part_spec — Notification Color + Notification Series ────
--    Series = System Sensor L-Series for all L-Series notification appliances.

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
  WHERE sd.display_name IN ('Notification Color', 'Notification Series')
),
part_spec_seed AS (
  SELECT *
  FROM (
    VALUES
      ('System Sensor', 'PC2RLED', 'Red'),
      ('System Sensor', 'PC2RLED-LF', 'Red'),
      ('System Sensor', 'PC2WLED', 'White'),
      ('System Sensor', 'P2GRKLED', 'Red'),
      ('System Sensor', 'PC2RKLED', 'Red'),
      ('System Sensor', 'HGRKL', 'Red')
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
    ON obd.def_display_name = 'Notification Color'
   AND obd.option_display_name = pss.color_name
),
series_rows AS (
  SELECT
    pss.mfr_name,
    pss.mpn,
    obd.def_id,
    obd.option_id
  FROM part_spec_seed pss
  INNER JOIN option_by_def obd
    ON obd.def_display_name = 'Notification Series'
   AND obd.option_display_name = 'System Sensor L-Series'
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

-- ─── 8. manufacturer_part_spec — Candela Low on ceiling/outdoor horn/strobes ─

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
      ('System Sensor', 'PC2RLED'),
      ('System Sensor', 'PC2WLED'),
      ('System Sensor', 'PC2RLED-LF'),
      ('System Sensor', 'P2GRKLED'),
      ('System Sensor', 'PC2RKLED')
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

-- ─── 9. manufacturer_part_spec — Low Frequency on LF horn/strobes ──────────────

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
      ('System Sensor', 'PC2RLED-LF')
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

COMMIT;

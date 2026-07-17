-- Dev fixtures: CCTV item tree, starter specs, Axis parts (decision 2026-07-16).
-- Prerequisite: CCTV scope root (031 → 033 → 040a), 027 vendors (ADI), 044 node_type.
-- Idempotent: match by parent path + name / display_name / mpn; skip existing rows.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM item WHERE name = 'CCTV' AND parent_id IS NULL
  ) THEN
    RAISE EXCEPTION '081_catalog_cctv_dev_seed: CCTV root item missing (run 031/033/040a first)';
  END IF;
END
$$;

-- ─── 1. Item tree — branches under CCTV root ─────────────────────────────────

WITH cctv_root AS (
  SELECT id FROM item WHERE name = 'CCTV' AND parent_id IS NULL LIMIT 1
),
branch_seed AS (
  SELECT *
  FROM (
    VALUES
      ('Cameras', 1),
      ('Recorders', 2),
      ('Network & Power', 3),
      ('Wire & Cable', 4),
      ('Test & Commission', 5)
  ) AS v (name, sort_order)
)
INSERT INTO item (name, parent_id, sort_order, node_type)
SELECT bs.name, r.id, bs.sort_order, 'category'
FROM cctv_root r
CROSS JOIN branch_seed bs
WHERE NOT EXISTS (
  SELECT 1
  FROM item existing
  WHERE existing.parent_id = r.id
    AND existing.name = bs.name
);

-- ─── 2. Item tree — leaves under branches ────────────────────────────────────

WITH cctv_root AS (
  SELECT id FROM item WHERE name = 'CCTV' AND parent_id IS NULL LIMIT 1
),
branch AS (
  SELECT b.id, b.name
  FROM item b
  INNER JOIN cctv_root r ON b.parent_id = r.id
),
leaf_seed AS (
  SELECT *
  FROM (
    VALUES
      ('Cameras', 'Dome Camera', 1),
      ('Cameras', 'Bullet Camera', 2),
      ('Cameras', 'Turret Camera', 3),
      ('Cameras', 'PTZ Camera', 4),
      ('Cameras', '— ROM allowance', 99),
      ('Recorders', 'NVR', 1),
      ('Recorders', '— ROM allowance', 99),
      ('Network & Power', 'PoE Switch', 1),
      ('Network & Power', '— ROM allowance', 99),
      ('Wire & Cable', 'Cat6 Cable', 1),
      ('Wire & Cable', '— ROM allowance', 99),
      ('Test & Commission', 'Camera', 1),
      ('Test & Commission', '— ROM allowance', 99)
  ) AS v (branch_name, leaf_name, sort_order)
)
INSERT INTO item (name, parent_id, sort_order, node_type)
SELECT ls.leaf_name, b.id, ls.sort_order, 'item'
FROM leaf_seed ls
INNER JOIN branch b ON b.name = ls.branch_name
WHERE NOT EXISTS (
  SELECT 1
  FROM item existing
  WHERE existing.parent_id = b.id
    AND existing.name = ls.leaf_name
);

-- ─── 3. Spec definitions (CCTV starter set) ──────────────────────────────────

WITH cctv_root AS (
  SELECT id FROM item WHERE name = 'CCTV' AND parent_id IS NULL LIMIT 1
),
def_seed AS (
  SELECT *
  FROM (
    VALUES
      ('Platform', 'enum', 1),
      ('Form Factor', 'enum', 2),
      ('Resolution', 'enum', 3),
      ('Housing', 'enum', 4)
  ) AS v (display_name, value_type, sort_order)
)
INSERT INTO spec_def (display_name, value_type, sort_order, scope_root_item_id)
SELECT ds.display_name, ds.value_type, ds.sort_order, r.id
FROM def_seed ds
CROSS JOIN cctv_root r
WHERE NOT EXISTS (
  SELECT 1
  FROM spec_def existing
  WHERE existing.scope_root_item_id = r.id
    AND existing.display_name = ds.display_name
);

-- ─── 4. Spec options ─────────────────────────────────────────────────────────

WITH cctv_root AS (
  SELECT id FROM item WHERE name = 'CCTV' AND parent_id IS NULL LIMIT 1
),
option_seed AS (
  SELECT *
  FROM (
    VALUES
      ('Platform', 'ONVIF', 1),
      ('Platform', 'Axis', 2),
      ('Platform', 'Avigilon', 3),
      ('Platform', 'Hikvision', 4),
      ('Form Factor', 'Dome', 1),
      ('Form Factor', 'Bullet', 2),
      ('Form Factor', 'Turret', 3),
      ('Form Factor', 'PTZ', 4),
      ('Form Factor', 'Fisheye', 5),
      ('Resolution', '2MP', 1),
      ('Resolution', '4MP', 2),
      ('Resolution', '8MP', 3),
      ('Housing', 'Indoor', 1),
      ('Housing', 'Outdoor', 2),
      ('Housing', 'Vandal', 3)
  ) AS v (def_display_name, display_name, sort_order)
)
INSERT INTO spec_option (spec_def_id, display_name, sort_order)
SELECT sd.id, os.display_name, os.sort_order
FROM option_seed os
INNER JOIN spec_def sd ON sd.display_name = os.def_display_name
INNER JOIN cctv_root r ON r.id = sd.scope_root_item_id
WHERE NOT EXISTS (
  SELECT 1
  FROM spec_option existing
  WHERE existing.spec_def_id = sd.id
    AND existing.display_name = os.display_name
);

-- ─── 5. Manufacturer — Axis ──────────────────────────────────────────────────

WITH mfr_inserted AS (
  INSERT INTO party (kind, display_name, legal_name)
  SELECT 'organization', 'Axis Communications', 'Axis Communications AB'
  WHERE NOT EXISTS (
    SELECT 1
    FROM party p
    INNER JOIN party_role pr ON pr.party_id = p.id AND pr.role = 'manufacturer'
    WHERE p.display_name = 'Axis Communications'
  )
  RETURNING id
)
INSERT INTO party_role (party_id, role)
SELECT mi.id, 'manufacturer'
FROM mfr_inserted mi
ON CONFLICT (party_id, role) DO NOTHING;

INSERT INTO party_organization (party_id, dba_name)
SELECT p.id, NULL
FROM party p
INNER JOIN party_role pr ON pr.party_id = p.id AND pr.role = 'manufacturer'
WHERE p.kind = 'organization'
  AND p.display_name = 'Axis Communications'
ON CONFLICT (party_id) DO NOTHING;

-- ─── 6. manufacturer_part — cameras + NVR ────────────────────────────────────

WITH part_seed AS (
  SELECT *
  FROM (
    VALUES
      ('Axis Communications', 'P3265-LVE', 'Dome camera 2MP outdoor vandal, IR', 'ea', NULL::text, 1::numeric),
      ('Axis Communications', 'P1465-LE', 'Bullet camera 2MP outdoor, IR', 'ea', NULL, 1),
      ('Axis Communications', 'M3086-V', 'Dome camera 4MP indoor vandal', 'ea', NULL, 1),
      ('Axis Communications', 'Q6315-LE', 'PTZ camera 2MP outdoor', 'ea', NULL, 1),
      ('Axis Communications', 'S3008', '8-channel NVR appliance', 'ea', NULL, 1)
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

-- ─── 7. vendor_part — ADI pricing ────────────────────────────────────────────

WITH pricing_seed AS (
  SELECT *
  FROM (
    VALUES
      ('Axis Communications', 'P3265-LVE', 'ADI Global Distribution', 'ADI-P3265-LVE', 'Axis P3265-LVE dome', 485.00, true),
      ('Axis Communications', 'P1465-LE', 'ADI Global Distribution', 'ADI-P1465-LE', 'Axis P1465-LE bullet', 425.00, true),
      ('Axis Communications', 'M3086-V', 'ADI Global Distribution', 'ADI-M3086-V', 'Axis M3086-V dome', 310.00, true),
      ('Axis Communications', 'Q6315-LE', 'ADI Global Distribution', 'ADI-Q6315-LE', 'Axis Q6315-LE PTZ', 1890.00, true),
      ('Axis Communications', 'S3008', 'ADI Global Distribution', 'ADI-S3008', 'Axis S3008 recorder', 695.00, true)
  ) AS v (mfr_name, mpn, vendor_name, vendor_pn, vendor_description, unit_price, is_preferred)
)
INSERT INTO vendor_part (
  manufacturer_part_id,
  vendor_party_id,
  vendor_pn,
  vendor_description,
  unit_price,
  is_preferred
)
SELECT
  mp.id,
  vp.id,
  ps.vendor_pn,
  ps.vendor_description,
  ps.unit_price,
  ps.is_preferred
FROM pricing_seed ps
INNER JOIN party pm ON pm.display_name = ps.mfr_name
INNER JOIN party_role prm ON prm.party_id = pm.id AND prm.role = 'manufacturer'
INNER JOIN manufacturer_part mp
  ON mp.manufacturer_party_id = pm.id
 AND mp.mpn = ps.mpn
INNER JOIN party vp ON vp.display_name = ps.vendor_name
INNER JOIN party_role vpr ON vpr.party_id = vp.id AND vpr.role = 'vendor'
WHERE NOT EXISTS (
  SELECT 1
  FROM vendor_part existing
  WHERE existing.manufacturer_part_id = mp.id
    AND existing.vendor_party_id = vp.id
);

-- ─── 8. part_item — link parts to camera / NVR leaves ────────────────────────

WITH cctv_root AS (
  SELECT id FROM item WHERE name = 'CCTV' AND parent_id IS NULL LIMIT 1
),
catalog_leaf AS (
  SELECT leaf.id AS item_id, branch.name AS branch_name, leaf.name AS leaf_name
  FROM item leaf
  INNER JOIN item branch ON branch.id = leaf.parent_id
  INNER JOIN cctv_root r ON branch.parent_id = r.id
),
part_seed AS (
  SELECT *
  FROM (
    VALUES
      ('Cameras', 'Dome Camera', 'Axis Communications', 'P3265-LVE', 1),
      ('Cameras', 'Dome Camera', 'Axis Communications', 'M3086-V', 2),
      ('Cameras', 'Bullet Camera', 'Axis Communications', 'P1465-LE', 1),
      ('Cameras', 'PTZ Camera', 'Axis Communications', 'Q6315-LE', 1),
      ('Recorders', 'NVR', 'Axis Communications', 'S3008', 1)
  ) AS v (branch_name, leaf_name, mfr_name, mpn, sort_order)
)
INSERT INTO part_item (part_id, item_id, sort_order)
SELECT mp.id, cl.item_id, ps.sort_order
FROM part_seed ps
INNER JOIN catalog_leaf cl
  ON cl.branch_name = ps.branch_name
 AND cl.leaf_name = ps.leaf_name
INNER JOIN party p ON p.display_name = ps.mfr_name
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

-- ─── 9. fallback_unit_cost on ROM + cable leaves ─────────────────────────────

WITH cctv_root AS (
  SELECT id FROM item WHERE name = 'CCTV' AND parent_id IS NULL LIMIT 1
),
rom_leaf AS (
  SELECT leaf.id, branch.name AS branch_name
  FROM item leaf
  INNER JOIN item branch ON branch.id = leaf.parent_id
  INNER JOIN cctv_root r ON branch.parent_id = r.id
  WHERE leaf.name = '— ROM allowance'
)
UPDATE item i
SET fallback_unit_cost = CASE rl.branch_name
  WHEN 'Cameras' THEN 350.00
  WHEN 'Recorders' THEN 600.00
  WHEN 'Network & Power' THEN 200.00
  WHEN 'Wire & Cable' THEN 0.28
  WHEN 'Test & Commission' THEN 45.00
  ELSE i.fallback_unit_cost
END
FROM rom_leaf rl
WHERE i.id = rl.id
  AND i.fallback_unit_cost = 0;

WITH cctv_root AS (
  SELECT id FROM item WHERE name = 'CCTV' AND parent_id IS NULL LIMIT 1
),
cable_leaf AS (
  SELECT leaf.id
  FROM item leaf
  INNER JOIN item branch ON branch.id = leaf.parent_id
  INNER JOIN cctv_root r ON branch.parent_id = r.id
  WHERE branch.name = 'Wire & Cable'
    AND leaf.name = 'Cat6 Cable'
)
UPDATE item i
SET fallback_unit_cost = 0.28
FROM cable_leaf cl
WHERE i.id = cl.id
  AND i.fallback_unit_cost = 0;

-- ─── 10. manufacturer_part_spec — cameras (S1–S4) + NVR (Platform only) ───────
-- Multi-row per def = part supports those options. NVR omits Form Factor /
-- Resolution / Housing → wildcard on those dims (V5).

WITH cctv_root AS (
  SELECT id FROM item WHERE name = 'CCTV' AND parent_id IS NULL LIMIT 1
),
option_by_def AS (
  SELECT
    sd.display_name AS def_display_name,
    so.display_name AS option_display_name,
    so.id AS option_id,
    sd.id AS def_id
  FROM spec_def sd
  INNER JOIN cctv_root r ON r.id = sd.scope_root_item_id
  INNER JOIN spec_option so ON so.spec_def_id = sd.id
),
part_spec_seed AS (
  SELECT *
  FROM (
    VALUES
      -- P3265-LVE dome 2MP outdoor vandal
      ('Axis Communications', 'P3265-LVE', 'Platform', 'Axis'),
      ('Axis Communications', 'P3265-LVE', 'Platform', 'ONVIF'),
      ('Axis Communications', 'P3265-LVE', 'Form Factor', 'Dome'),
      ('Axis Communications', 'P3265-LVE', 'Resolution', '2MP'),
      ('Axis Communications', 'P3265-LVE', 'Housing', 'Outdoor'),
      ('Axis Communications', 'P3265-LVE', 'Housing', 'Vandal'),
      -- P1465-LE bullet 2MP outdoor
      ('Axis Communications', 'P1465-LE', 'Platform', 'Axis'),
      ('Axis Communications', 'P1465-LE', 'Platform', 'ONVIF'),
      ('Axis Communications', 'P1465-LE', 'Form Factor', 'Bullet'),
      ('Axis Communications', 'P1465-LE', 'Resolution', '2MP'),
      ('Axis Communications', 'P1465-LE', 'Housing', 'Outdoor'),
      -- M3086-V dome 4MP indoor vandal
      ('Axis Communications', 'M3086-V', 'Platform', 'Axis'),
      ('Axis Communications', 'M3086-V', 'Platform', 'ONVIF'),
      ('Axis Communications', 'M3086-V', 'Form Factor', 'Dome'),
      ('Axis Communications', 'M3086-V', 'Resolution', '4MP'),
      ('Axis Communications', 'M3086-V', 'Housing', 'Indoor'),
      ('Axis Communications', 'M3086-V', 'Housing', 'Vandal'),
      -- Q6315-LE PTZ 2MP outdoor
      ('Axis Communications', 'Q6315-LE', 'Platform', 'Axis'),
      ('Axis Communications', 'Q6315-LE', 'Platform', 'ONVIF'),
      ('Axis Communications', 'Q6315-LE', 'Form Factor', 'PTZ'),
      ('Axis Communications', 'Q6315-LE', 'Resolution', '2MP'),
      ('Axis Communications', 'Q6315-LE', 'Housing', 'Outdoor'),
      -- S3008 NVR — Platform only
      ('Axis Communications', 'S3008', 'Platform', 'Axis'),
      ('Axis Communications', 'S3008', 'Platform', 'ONVIF')
  ) AS v (mfr_name, mpn, def_name, option_name)
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
  ON obd.def_display_name = pss.def_name
 AND obd.option_display_name = pss.option_name
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

COMMIT;

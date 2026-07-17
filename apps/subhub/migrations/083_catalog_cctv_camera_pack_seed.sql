-- Dev fixtures: Axis camera pack for CCTV estimate smoke (2026-07-16).
-- Prerequisite: 081–082 (CCTV tree, Platform/Form Factor/Resolution/Housing, Axis mfr, ADI).
-- Fills 2–3 parts per camera leaf so C-panel filters change the picker.
-- Idempotent: match by mpn / leaf path; skip existing rows.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM item leaf
    INNER JOIN item b ON b.id = leaf.parent_id AND b.name = 'Cameras'
    INNER JOIN item r ON r.id = b.parent_id AND r.name = 'CCTV' AND r.parent_id IS NULL
    WHERE leaf.name = 'Dome Camera'
  ) THEN
    RAISE EXCEPTION '083_catalog_cctv_camera_pack_seed: Cameras leaves missing (run 081/082 first)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM party p
    INNER JOIN party_role pr ON pr.party_id = p.id AND pr.role = 'manufacturer'
    WHERE p.display_name = 'Axis Communications'
  ) THEN
    RAISE EXCEPTION '083_catalog_cctv_camera_pack_seed: Axis Communications missing (run 081 first)';
  END IF;
END
$$;

-- ─── 1. manufacturer_part ────────────────────────────────────────────────────

WITH part_seed AS (
  SELECT *
  FROM (
    VALUES
      ('Axis Communications', 'P3268-LVE', 'Dome camera 8MP outdoor vandal, IR', 'ea', NULL::text, 1::numeric),
      ('Axis Communications', 'P1468-LE', 'Bullet camera 8MP outdoor, IR', 'ea', NULL, 1),
      ('Axis Communications', 'M2036-LE', 'Bullet camera 4MP outdoor, IR', 'ea', NULL, 1),
      ('Axis Communications', 'M4218-LV', 'Turret camera 8MP indoor, IR', 'ea', NULL, 1),
      ('Axis Communications', 'P9117-PV', 'Turret/corner camera 4MP outdoor vandal', 'ea', NULL, 1),
      ('Axis Communications', 'Q6318-LE', 'PTZ camera 8MP outdoor', 'ea', NULL, 1),
      ('Axis Communications', 'M3068-P', 'Fisheye camera outdoor', 'ea', NULL, 1)
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

-- ─── 2. vendor_part — ADI ────────────────────────────────────────────────────

WITH pricing_seed AS (
  SELECT *
  FROM (
    VALUES
      ('Axis Communications', 'P3268-LVE', 'ADI Global Distribution', 'ADI-P3268-LVE', 'Axis P3268-LVE dome 8MP', 685.00, true),
      ('Axis Communications', 'P1468-LE', 'ADI Global Distribution', 'ADI-P1468-LE', 'Axis P1468-LE bullet 8MP', 595.00, true),
      ('Axis Communications', 'M2036-LE', 'ADI Global Distribution', 'ADI-M2036-LE', 'Axis M2036-LE bullet 4MP', 285.00, true),
      ('Axis Communications', 'M4218-LV', 'ADI Global Distribution', 'ADI-M4218-LV', 'Axis M4218-LV turret 8MP', 445.00, true),
      ('Axis Communications', 'P9117-PV', 'ADI Global Distribution', 'ADI-P9117-PV', 'Axis P9117-PV outdoor 4MP', 520.00, true),
      ('Axis Communications', 'Q6318-LE', 'ADI Global Distribution', 'ADI-Q6318-LE', 'Axis Q6318-LE PTZ 8MP', 2890.00, true),
      ('Axis Communications', 'M3068-P', 'ADI Global Distribution', 'ADI-M3068-P', 'Axis M3068-P fisheye', 640.00, true)
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

-- ─── 3. part_item — link to camera leaves ────────────────────────────────────

WITH cctv_root AS (
  SELECT id FROM item WHERE name = 'CCTV' AND parent_id IS NULL LIMIT 1
),
catalog_leaf AS (
  SELECT leaf.id AS item_id, leaf.name AS leaf_name
  FROM item leaf
  INNER JOIN item branch ON branch.id = leaf.parent_id AND branch.name = 'Cameras'
  INNER JOIN cctv_root r ON branch.parent_id = r.id
),
part_seed AS (
  SELECT *
  FROM (
    VALUES
      ('Dome Camera', 'Axis Communications', 'P3268-LVE', 3),
      ('Bullet Camera', 'Axis Communications', 'P1468-LE', 2),
      ('Bullet Camera', 'Axis Communications', 'M2036-LE', 3),
      ('Turret Camera', 'Axis Communications', 'M4218-LV', 2),
      ('Turret Camera', 'Axis Communications', 'P9117-PV', 3),
      ('PTZ Camera', 'Axis Communications', 'Q6318-LE', 2),
      ('Fisheye Camera', 'Axis Communications', 'M3068-P', 2)
  ) AS v (leaf_name, mfr_name, mpn, sort_order)
)
INSERT INTO part_item (part_id, item_id, sort_order)
SELECT mp.id, cl.item_id, ps.sort_order
FROM part_seed ps
INNER JOIN catalog_leaf cl ON cl.leaf_name = ps.leaf_name
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

-- ─── 4. manufacturer_part_spec — S1–S4 (Axis + ONVIF) ────────────────────────

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
      -- P3268-LVE dome 8MP outdoor vandal
      ('Axis Communications', 'P3268-LVE', 'Platform', 'Axis'),
      ('Axis Communications', 'P3268-LVE', 'Platform', 'ONVIF'),
      ('Axis Communications', 'P3268-LVE', 'Form Factor', 'Dome'),
      ('Axis Communications', 'P3268-LVE', 'Resolution', '8MP'),
      ('Axis Communications', 'P3268-LVE', 'Housing', 'Outdoor'),
      ('Axis Communications', 'P3268-LVE', 'Housing', 'Vandal'),
      -- P1468-LE bullet 8MP outdoor
      ('Axis Communications', 'P1468-LE', 'Platform', 'Axis'),
      ('Axis Communications', 'P1468-LE', 'Platform', 'ONVIF'),
      ('Axis Communications', 'P1468-LE', 'Form Factor', 'Bullet'),
      ('Axis Communications', 'P1468-LE', 'Resolution', '8MP'),
      ('Axis Communications', 'P1468-LE', 'Housing', 'Outdoor'),
      -- M2036-LE bullet 4MP outdoor
      ('Axis Communications', 'M2036-LE', 'Platform', 'Axis'),
      ('Axis Communications', 'M2036-LE', 'Platform', 'ONVIF'),
      ('Axis Communications', 'M2036-LE', 'Form Factor', 'Bullet'),
      ('Axis Communications', 'M2036-LE', 'Resolution', '4MP'),
      ('Axis Communications', 'M2036-LE', 'Housing', 'Outdoor'),
      -- M4218-LV turret 8MP indoor
      ('Axis Communications', 'M4218-LV', 'Platform', 'Axis'),
      ('Axis Communications', 'M4218-LV', 'Platform', 'ONVIF'),
      ('Axis Communications', 'M4218-LV', 'Form Factor', 'Turret'),
      ('Axis Communications', 'M4218-LV', 'Resolution', '8MP'),
      ('Axis Communications', 'M4218-LV', 'Housing', 'Indoor'),
      -- P9117-PV turret 4MP outdoor vandal
      ('Axis Communications', 'P9117-PV', 'Platform', 'Axis'),
      ('Axis Communications', 'P9117-PV', 'Platform', 'ONVIF'),
      ('Axis Communications', 'P9117-PV', 'Form Factor', 'Turret'),
      ('Axis Communications', 'P9117-PV', 'Resolution', '4MP'),
      ('Axis Communications', 'P9117-PV', 'Housing', 'Outdoor'),
      ('Axis Communications', 'P9117-PV', 'Housing', 'Vandal'),
      -- Q6318-LE PTZ 8MP outdoor
      ('Axis Communications', 'Q6318-LE', 'Platform', 'Axis'),
      ('Axis Communications', 'Q6318-LE', 'Platform', 'ONVIF'),
      ('Axis Communications', 'Q6318-LE', 'Form Factor', 'PTZ'),
      ('Axis Communications', 'Q6318-LE', 'Resolution', '8MP'),
      ('Axis Communications', 'Q6318-LE', 'Housing', 'Outdoor'),
      -- M3068-P fisheye outdoor (8MP class)
      ('Axis Communications', 'M3068-P', 'Platform', 'Axis'),
      ('Axis Communications', 'M3068-P', 'Platform', 'ONVIF'),
      ('Axis Communications', 'M3068-P', 'Form Factor', 'Fisheye'),
      ('Axis Communications', 'M3068-P', 'Resolution', '8MP'),
      ('Axis Communications', 'M3068-P', 'Housing', 'Outdoor')
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

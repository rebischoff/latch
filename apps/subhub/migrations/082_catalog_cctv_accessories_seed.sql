-- Dev fixtures: CCTV mounts, server, licenses, more cameras, labor, None freight (2026-07-16).
-- Prerequisite: 081 (CCTV tree + starter specs + Axis), 027 (ADI), labor_phase / labor_rate_type.
-- Decisions A1–A8: docs/decisions/catalog.md — CCTV accessories.
-- Idempotent: match by path + name / mpn / display_name; skip existing rows.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM item fa
    INNER JOIN spec_def sd ON sd.scope_root_item_id = fa.id
    WHERE fa.name = 'CCTV'
      AND fa.parent_id IS NULL
      AND sd.display_name = 'Platform'
  ) THEN
    RAISE EXCEPTION '082_catalog_cctv_accessories_seed: CCTV Platform spec missing (run 081 first)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM labor_phase WHERE name = 'Installation')
     OR NOT EXISTS (SELECT 1 FROM labor_rate_type WHERE name = 'Installer') THEN
    RAISE EXCEPTION '082_catalog_cctv_accessories_seed: labor_phase / labor_rate_type missing';
  END IF;
END
$$;

-- ─── 0. Allow 0%/\$0 cost_add_on (Z5 None) + seed freight None ───────────────

ALTER TABLE cost_add_on_type DROP CONSTRAINT IF EXISTS cost_add_on_type_check;
ALTER TABLE cost_add_on_type
  ADD CONSTRAINT cost_add_on_type_check
  CHECK (percent >= 0 AND amount_cents >= 0);

INSERT INTO cost_add_on_type (kind, name, percent, amount_cents, sort_order)
SELECT 'freight', 'None', 0, 0, 0
WHERE NOT EXISTS (
  SELECT 1 FROM cost_add_on_type WHERE kind = 'freight' AND name = 'None'
);

-- ─── 1. Reorder existing branches; add Mounts + Software & Licenses ───────────

WITH cctv_root AS (
  SELECT id FROM item WHERE name = 'CCTV' AND parent_id IS NULL LIMIT 1
)
UPDATE item i
SET sort_order = v.sort_order
FROM cctv_root r
CROSS JOIN (
  VALUES
    ('Cameras', 1),
    ('Recorders', 3),
    ('Network & Power', 5),
    ('Wire & Cable', 6),
    ('Test & Commission', 7)
) AS v (name, sort_order)
WHERE i.parent_id = r.id
  AND i.name = v.name;

WITH cctv_root AS (
  SELECT id FROM item WHERE name = 'CCTV' AND parent_id IS NULL LIMIT 1
),
branch_seed AS (
  SELECT *
  FROM (
    VALUES
      ('Mounts', 2),
      ('Software & Licenses', 4)
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

-- ─── 2. Leaves — mounts, fisheye, server, licenses ───────────────────────────

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
      ('Cameras', 'Fisheye Camera', 5),
      ('Mounts', 'Wall Mount', 1),
      ('Mounts', 'Pendant Mount', 2),
      ('Mounts', 'Pole Mount', 3),
      ('Mounts', 'Corner Bracket', 4),
      ('Mounts', '— ROM allowance', 99),
      ('Recorders', 'Server / VMS Host', 2),
      ('Software & Licenses', 'Camera Channel License', 1),
      ('Software & Licenses', 'Viewing Client License', 2),
      ('Software & Licenses', '— ROM allowance', 99)
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

-- ─── 3. License branch — freight None (A7) ───────────────────────────────────

WITH cctv_root AS (
  SELECT id FROM item WHERE name = 'CCTV' AND parent_id IS NULL LIMIT 1
),
software_branch AS (
  SELECT b.id
  FROM item b
  INNER JOIN cctv_root r ON b.parent_id = r.id
  WHERE b.name = 'Software & Licenses'
  LIMIT 1
),
none_freight AS (
  SELECT id FROM cost_add_on_type WHERE kind = 'freight' AND name = 'None' LIMIT 1
)
UPDATE item i
SET freight_rate_type_id = nf.id
FROM software_branch sb
CROSS JOIN none_freight nf
WHERE i.id = sb.id
  AND (i.freight_rate_type_id IS DISTINCT FROM nf.id);

-- ─── 4. ROM fallback costs ───────────────────────────────────────────────────

WITH cctv_root AS (
  SELECT id FROM item WHERE name = 'CCTV' AND parent_id IS NULL LIMIT 1
),
rom_leaf AS (
  SELECT leaf.id, branch.name AS branch_name
  FROM item leaf
  INNER JOIN item branch ON branch.id = leaf.parent_id
  INNER JOIN cctv_root r ON branch.parent_id = r.id
  WHERE leaf.name = '— ROM allowance'
    AND branch.name IN ('Mounts', 'Software & Licenses')
)
UPDATE item i
SET fallback_unit_cost = CASE rl.branch_name
  WHEN 'Mounts' THEN 45.00
  WHEN 'Software & Licenses' THEN 75.00
  ELSE i.fallback_unit_cost
END
FROM rom_leaf rl
WHERE i.id = rl.id
  AND i.fallback_unit_cost = 0;

-- ─── 5. manufacturer_part — cameras / mounts / server / licenses ─────────────

WITH part_seed AS (
  SELECT *
  FROM (
    VALUES
      -- Cameras
      ('Axis Communications', 'M4216-LV', 'Turret camera 4MP indoor, IR', 'ea', NULL::text, 1::numeric),
      ('Axis Communications', 'M3057-PLVE', 'Fisheye camera outdoor vandal', 'ea', NULL, 1),
      -- Mounts
      ('Axis Communications', 'T91B61', 'Wall mount bracket', 'ea', NULL, 1),
      ('Axis Communications', 'T94T01D', 'Pendant kit', 'ea', NULL, 1),
      ('Axis Communications', 'T91A67', 'Pole mount', 'ea', NULL, 1),
      ('Axis Communications', 'T91A64', 'Corner bracket', 'ea', NULL, 1),
      -- Server
      ('Axis Communications', 'S1216', 'Camera Station S12 server appliance', 'ea', NULL, 1),
      -- Licenses (A1 — part-backed, non-physical)
      ('Axis Communications', 'ACS-CAM', 'Camera Station camera channel license', 'ea', NULL, 1),
      ('Axis Communications', 'ACS-CORE', 'Camera Station core / viewing client license', 'ea', NULL, 1)
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

-- ─── 6. vendor_part — ADI ────────────────────────────────────────────────────

WITH pricing_seed AS (
  SELECT *
  FROM (
    VALUES
      ('Axis Communications', 'M4216-LV', 'ADI Global Distribution', 'ADI-M4216-LV', 'Axis M4216-LV turret', 365.00, true),
      ('Axis Communications', 'M3057-PLVE', 'ADI Global Distribution', 'ADI-M3057-PLVE', 'Axis M3057-PLVE fisheye', 720.00, true),
      ('Axis Communications', 'T91B61', 'ADI Global Distribution', 'ADI-T91B61', 'Axis T91B61 wall mount', 48.00, true),
      ('Axis Communications', 'T94T01D', 'ADI Global Distribution', 'ADI-T94T01D', 'Axis T94T01D pendant', 95.00, true),
      ('Axis Communications', 'T91A67', 'ADI Global Distribution', 'ADI-T91A67', 'Axis T91A67 pole mount', 110.00, true),
      ('Axis Communications', 'T91A64', 'ADI Global Distribution', 'ADI-T91A64', 'Axis T91A64 corner', 72.00, true),
      ('Axis Communications', 'S1216', 'ADI Global Distribution', 'ADI-S1216', 'Axis S1216 server', 2450.00, true),
      ('Axis Communications', 'ACS-CAM', 'ADI Global Distribution', 'ADI-ACS-CAM', 'ACS camera channel license', 89.00, true),
      ('Axis Communications', 'ACS-CORE', 'ADI Global Distribution', 'ADI-ACS-CORE', 'ACS core/client license', 125.00, true)
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

-- ─── 7. part_item links ──────────────────────────────────────────────────────

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
      ('Cameras', 'Turret Camera', 'Axis Communications', 'M4216-LV', 1),
      ('Cameras', 'Fisheye Camera', 'Axis Communications', 'M3057-PLVE', 1),
      ('Mounts', 'Wall Mount', 'Axis Communications', 'T91B61', 1),
      ('Mounts', 'Pendant Mount', 'Axis Communications', 'T94T01D', 1),
      ('Mounts', 'Pole Mount', 'Axis Communications', 'T91A67', 1),
      ('Mounts', 'Corner Bracket', 'Axis Communications', 'T91A64', 1),
      ('Recorders', 'Server / VMS Host', 'Axis Communications', 'S1216', 1),
      ('Software & Licenses', 'Camera Channel License', 'Axis Communications', 'ACS-CAM', 1),
      ('Software & Licenses', 'Viewing Client License', 'Axis Communications', 'ACS-CORE', 1)
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

-- ─── 8. manufacturer_part_spec ────────────────────────────────────────────────
-- Cameras: S1–S4. Mounts / server / licenses: Platform only (A3).

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
      -- M4216-LV turret 4MP indoor
      ('Axis Communications', 'M4216-LV', 'Platform', 'Axis'),
      ('Axis Communications', 'M4216-LV', 'Platform', 'ONVIF'),
      ('Axis Communications', 'M4216-LV', 'Form Factor', 'Turret'),
      ('Axis Communications', 'M4216-LV', 'Resolution', '4MP'),
      ('Axis Communications', 'M4216-LV', 'Housing', 'Indoor'),
      -- M3057-PLVE fisheye outdoor vandal (treat as 8MP class)
      ('Axis Communications', 'M3057-PLVE', 'Platform', 'Axis'),
      ('Axis Communications', 'M3057-PLVE', 'Platform', 'ONVIF'),
      ('Axis Communications', 'M3057-PLVE', 'Form Factor', 'Fisheye'),
      ('Axis Communications', 'M3057-PLVE', 'Resolution', '8MP'),
      ('Axis Communications', 'M3057-PLVE', 'Housing', 'Outdoor'),
      ('Axis Communications', 'M3057-PLVE', 'Housing', 'Vandal'),
      -- Mounts — Platform only
      ('Axis Communications', 'T91B61', 'Platform', 'Axis'),
      ('Axis Communications', 'T91B61', 'Platform', 'ONVIF'),
      ('Axis Communications', 'T94T01D', 'Platform', 'Axis'),
      ('Axis Communications', 'T94T01D', 'Platform', 'ONVIF'),
      ('Axis Communications', 'T91A67', 'Platform', 'Axis'),
      ('Axis Communications', 'T91A67', 'Platform', 'ONVIF'),
      ('Axis Communications', 'T91A64', 'Platform', 'Axis'),
      ('Axis Communications', 'T91A64', 'Platform', 'ONVIF'),
      -- Server — Platform only
      ('Axis Communications', 'S1216', 'Platform', 'Axis'),
      ('Axis Communications', 'S1216', 'Platform', 'ONVIF'),
      -- Licenses — Platform only
      ('Axis Communications', 'ACS-CAM', 'Platform', 'Axis'),
      ('Axis Communications', 'ACS-CORE', 'Platform', 'Axis')
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

-- ─── 9. item_labor_phase on category nodes (A6 — inherit to leaves) ──────────

WITH cctv_root AS (
  SELECT id FROM item WHERE name = 'CCTV' AND parent_id IS NULL LIMIT 1
),
branch AS (
  SELECT b.id, b.name
  FROM item b
  INNER JOIN cctv_root r ON b.parent_id = r.id
),
phases AS (
  SELECT id, name FROM labor_phase
),
rates AS (
  SELECT id, name FROM labor_rate_type
),
labor_seed AS (
  SELECT *
  FROM (
    VALUES
      -- Cameras: Install + Program + Test
      ('Cameras', 'Installation', 'Installer', 0.75, 1),
      ('Cameras', 'Program', 'Programmer', 0.25, 2),
      ('Cameras', 'Test', 'Installer', 0.10, 3),
      -- Mounts: Install only
      ('Mounts', 'Installation', 'Installer', 0.40, 1),
      -- Recorders: Install + Program + Test
      ('Recorders', 'Installation', 'Installer', 1.50, 1),
      ('Recorders', 'Program', 'Programmer', 1.00, 2),
      ('Recorders', 'Test', 'Installer', 0.50, 3),
      -- Licenses: Program only
      ('Software & Licenses', 'Program', 'Programmer', 0.25, 1),
      -- Test & Commission: Test
      ('Test & Commission', 'Test', 'Installer', 0.50, 1)
  ) AS v (branch_name, phase_name, rate_name, hours_per_unit, sort_order)
)
INSERT INTO item_labor_phase (
  item_id,
  labor_phase_id,
  labor_rate_type_id,
  hours_per_unit,
  sort_order
)
SELECT
  b.id,
  p.id,
  rt.id,
  ls.hours_per_unit,
  ls.sort_order
FROM labor_seed ls
INNER JOIN branch b ON b.name = ls.branch_name
INNER JOIN phases p ON p.name = ls.phase_name
INNER JOIN rates rt ON rt.name = ls.rate_name
WHERE NOT EXISTS (
  SELECT 1
  FROM item_labor_phase existing
  WHERE existing.item_id = b.id
    AND existing.labor_phase_id = p.id
);

COMMIT;

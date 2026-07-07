-- Optional dev fixtures: Fire Alarm item tree, specs, part pools (task 37i / 37f gap).
-- Prerequisite: 027 (parts), 031 (Fire Alarm root), 040a (unified item tree).
-- Idempotent: Postgres-assigned ids; match by parent path + name; skip existing rows.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM item WHERE name = 'Fire Alarm' AND parent_id IS NULL
  ) THEN
    RAISE EXCEPTION '043_catalog_fire_alarm_dev_seed: Fire Alarm root item missing (run 031 first)';
  END IF;
END
$$;

-- ─── 1. Item tree — branches under Fire Alarm root ─────────────────────────

WITH fa_root AS (
  SELECT id FROM item WHERE name = 'Fire Alarm' AND parent_id IS NULL LIMIT 1
),
branch_seed AS (
  SELECT *
  FROM (
    VALUES
      ('Initiating Devices', 1),
      ('Notification Appliances', 2),
      ('Modules', 3),
      ('Power & NAC', 4),
      ('Wire & Cable', 5),
      ('Test & Inspect', 6)
  ) AS v (name, sort_order)
)
INSERT INTO item (name, parent_id, sort_order)
SELECT bs.name, r.id, bs.sort_order
FROM fa_root r
CROSS JOIN branch_seed bs
WHERE NOT EXISTS (
  SELECT 1
  FROM item existing
  WHERE existing.parent_id = r.id
    AND existing.name = bs.name
);

-- ─── 2. Item tree — leaves under branches ────────────────────────────────────

WITH fa_root AS (
  SELECT id FROM item WHERE name = 'Fire Alarm' AND parent_id IS NULL LIMIT 1
),
branch AS (
  SELECT b.id, b.name
  FROM item b
  INNER JOIN fa_root r ON b.parent_id = r.id
),
leaf_seed AS (
  SELECT *
  FROM (
    VALUES
      ('Initiating Devices', 'Smoke Detector', 1),
      ('Initiating Devices', 'Duct Smoke Detector', 2),
      ('Initiating Devices', 'Manual Pull Station', 3),
      ('Initiating Devices', 'Detector Base', 4),
      ('Notification Appliances', 'Horn/Strobe', 1),
      ('Notification Appliances', 'Horn Only', 2),
      ('Modules', 'Monitor Module', 1),
      ('Modules', 'Relay Module', 2),
      ('Power & NAC', 'NAC Power Supply', 1),
      ('Wire & Cable', 'FPLP Cable (18/2)', 1),
      ('Wire & Cable', 'FPLR Cable (18/2)', 2),
      ('Test & Inspect', 'Initiating Device', 1),
      ('Test & Inspect', 'Notification Appliance', 2),
      ('Test & Inspect', 'FACP', 3),
      ('Initiating Devices', '— ROM allowance', 99),
      ('Notification Appliances', '— ROM allowance', 99),
      ('Modules', '— ROM allowance', 99),
      ('Power & NAC', '— ROM allowance', 99),
      ('Wire & Cable', '— ROM allowance', 99),
      ('Test & Inspect', '— ROM allowance', 99)
  ) AS v (branch_name, leaf_name, sort_order)
)
INSERT INTO item (name, parent_id, sort_order)
SELECT ls.leaf_name, b.id, ls.sort_order
FROM leaf_seed ls
INNER JOIN branch b ON b.name = ls.branch_name
WHERE NOT EXISTS (
  SELECT 1
  FROM item existing
  WHERE existing.parent_id = b.id
    AND existing.name = ls.leaf_name
);

-- ─── 3. Spec definitions (Fire Alarm worked example) ─────────────────────────

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
def_seed AS (
  SELECT *
  FROM (
    VALUES
      ('slc_protocol', 'SLC Protocol', 'enum', 'required', 1, 'root'),
      ('color', 'Color', 'enum', 'required', 2, 'notification'),
      ('series', 'Series', 'enum', 'required', 3, 'notification')
  ) AS v (code, display_name, value_type, filter_mode, sort_order, owner)
)
INSERT INTO spec_def (code, display_name, value_type, filter_mode, sort_order, item_id)
SELECT
  ds.code,
  ds.display_name,
  ds.value_type,
  ds.filter_mode,
  ds.sort_order,
  CASE ds.owner
    WHEN 'root' THEN r.id
    ELSE nb.id
  END
FROM def_seed ds
CROSS JOIN fa_root r
CROSS JOIN notification_branch nb
WHERE NOT EXISTS (
  SELECT 1 FROM spec_def existing WHERE existing.code = ds.code
);

-- ─── 4. Spec options ─────────────────────────────────────────────────────────

WITH option_seed AS (
  SELECT *
  FROM (
    VALUES
      ('slc_protocol', 'litespeed', 'LiteSpeed', 1),
      ('slc_protocol', 'clip', 'CLIP', 2),
      ('slc_protocol', 'onyx', 'ONYX', 3),
      ('color', 'red', 'Red', 1),
      ('color', 'white', 'White', 2),
      ('series', 'l_series', 'L-Series', 1),
      ('series', 'genesis', 'Genesis', 2)
  ) AS v (def_code, code, display_name, sort_order)
)
INSERT INTO spec_option (spec_def_id, code, display_name, sort_order)
SELECT sd.id, os.code, os.display_name, os.sort_order
FROM option_seed os
INNER JOIN spec_def sd ON sd.code = os.def_code
WHERE NOT EXISTS (
  SELECT 1
  FROM spec_option existing
  WHERE existing.spec_def_id = sd.id
    AND existing.code = os.code
);

-- ─── 5. Branch exclude — SLC off Notification Appliances ───────────────────────

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
slc_def AS (
  SELECT id FROM spec_def WHERE code = 'slc_protocol' LIMIT 1
)
INSERT INTO item_spec_exclude (item_id, spec_def_id, sort_order)
SELECT nb.id, sd.id, 1
FROM notification_branch nb
CROSS JOIN slc_def sd
WHERE NOT EXISTS (
  SELECT 1
  FROM item_spec_exclude existing
  WHERE existing.item_id = nb.id
    AND existing.spec_def_id = sd.id
);

-- ─── 6. Part pools (part_item) — reuse 027 manufacturer parts ────────────────

WITH fa_root AS (
  SELECT id FROM item WHERE name = 'Fire Alarm' AND parent_id IS NULL LIMIT 1
),
catalog_leaf AS (
  SELECT leaf.id AS item_id, branch.name AS branch_name, leaf.name AS leaf_name
  FROM item leaf
  INNER JOIN item branch ON branch.id = leaf.parent_id
  INNER JOIN fa_root r ON branch.parent_id = r.id
),
part_seed AS (
  SELECT *
  FROM (
    VALUES
      ('Initiating Devices', 'Smoke Detector', 'System Sensor', '2W-B', 1),
      ('Initiating Devices', 'Smoke Detector', 'System Sensor', '4W-B', 2),
      ('Initiating Devices', 'Smoke Detector', 'System Sensor', '2WT-B', 3),
      ('Initiating Devices', 'Smoke Detector', 'Fire-Lite Alarms', 'SD365', 4),
      ('Initiating Devices', 'Smoke Detector', 'Fire-Lite Alarms', 'SD365T', 5),
      ('Initiating Devices', 'Smoke Detector', 'NOTIFIER', 'FSP-951', 6),
      ('Initiating Devices', 'Duct Smoke Detector', 'Potter Electric Signal', 'PAD300-DUCT', 1),
      ('Initiating Devices', 'Duct Smoke Detector', 'Potter Electric Signal', 'PAD300-DUCTR', 2),
      ('Initiating Devices', 'Manual Pull Station', 'Edwards Signaling', '278B-1420', 1),
      ('Initiating Devices', 'Manual Pull Station', 'NOTIFIER', 'NBG-12LX', 2),
      ('Initiating Devices', 'Detector Base', 'System Sensor', 'B501', 1),
      ('Initiating Devices', 'Detector Base', 'System Sensor', 'B200S', 2),
      ('Initiating Devices', 'Detector Base', 'System Sensor', 'B200S-LF', 3),
      ('Initiating Devices', 'Detector Base', 'Fire-Lite Alarms', 'B300-6', 4),
      ('Notification Appliances', 'Horn/Strobe', 'System Sensor', 'P2RL', 1),
      ('Notification Appliances', 'Horn/Strobe', 'System Sensor', 'P2RL-LF', 2),
      ('Notification Appliances', 'Horn/Strobe', 'System Sensor', 'P2RLED', 3),
      ('Notification Appliances', 'Horn Only', 'System Sensor', 'HRL', 1),
      ('Modules', 'Monitor Module', 'Potter Electric Signal', 'PAD300-IM', 1),
      ('Modules', 'Relay Module', 'Potter Electric Signal', 'PAD300-RM', 1),
      ('Power & NAC', 'NAC Power Supply', 'NOTIFIER', 'NAC-3-40', 1),
      ('Wire & Cable', 'FPLP Cable (18/2)', 'West Penn Wire', '980', 1),
      ('Wire & Cable', 'FPLP Cable (18/2)', 'West Penn Wire', 'D980', 2),
      ('Wire & Cable', 'FPLR Cable (18/2)', 'West Penn Wire', '975', 1),
      ('Wire & Cable', 'FPLR Cable (18/2)', 'West Penn Wire', 'D975', 2)
  ) AS v (branch_name, leaf_name, mfr_name, mpn, sort_order)
)
INSERT INTO part_item (part_id, item_id, sort_order)
SELECT mp.id, cl.item_id, ps.sort_order
FROM part_seed ps
INNER JOIN catalog_leaf cl
  ON cl.branch_name = ps.branch_name
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

-- ─── 7. Bulk cable fallback_unit_cost (preferred vendor from 027) ─────────────

WITH fa_root AS (
  SELECT id FROM item WHERE name = 'Fire Alarm' AND parent_id IS NULL LIMIT 1
),
cable_leaf AS (
  SELECT leaf.id, leaf.name
  FROM item leaf
  INNER JOIN item branch ON branch.id = leaf.parent_id
  INNER JOIN fa_root r ON branch.parent_id = r.id
  WHERE branch.name = 'Wire & Cable'
    AND leaf.name IN ('FPLP Cable (18/2)', 'FPLR Cable (18/2)')
)
UPDATE item i
SET fallback_unit_cost = CASE cl.name
  WHEN 'FPLP Cable (18/2)' THEN 0.42
  WHEN 'FPLR Cable (18/2)' THEN 0.35
END
FROM cable_leaf cl
WHERE i.id = cl.id
  AND i.fallback_unit_cost = 0;

-- ─── 7b. ROM allowance fallback_unit_cost per category branch ───────────────

WITH fa_root AS (
  SELECT id FROM item WHERE name = 'Fire Alarm' AND parent_id IS NULL LIMIT 1
),
rom_leaf AS (
  SELECT leaf.id, branch.name AS branch_name
  FROM item leaf
  INNER JOIN item branch ON branch.id = leaf.parent_id
  INNER JOIN fa_root r ON branch.parent_id = r.id
  WHERE leaf.name = '— ROM allowance'
)
UPDATE item i
SET fallback_unit_cost = CASE rl.branch_name
  WHEN 'Initiating Devices' THEN 125.00
  WHEN 'Notification Appliances' THEN 95.00
  WHEN 'Modules' THEN 75.00
  WHEN 'Power & NAC' THEN 450.00
  WHEN 'Wire & Cable' THEN 0.40
  WHEN 'Test & Inspect' THEN 35.00
  ELSE i.fallback_unit_cost
END
FROM rom_leaf rl
WHERE i.id = rl.id
  AND i.fallback_unit_cost = 0;

-- ─── 8. manufacturer_part_spec — SLC protocol on addressable parts ───────────

WITH slc_def AS (
  SELECT id FROM spec_def WHERE code = 'slc_protocol' LIMIT 1
),
litespeed AS (
  SELECT so.id
  FROM spec_option so
  INNER JOIN slc_def sd ON sd.id = so.spec_def_id
  WHERE so.code = 'litespeed'
  LIMIT 1
),
onyx AS (
  SELECT so.id
  FROM spec_option so
  INNER JOIN slc_def sd ON sd.id = so.spec_def_id
  WHERE so.code = 'onyx'
  LIMIT 1
),
part_spec_seed AS (
  SELECT *
  FROM (
    VALUES
      ('Fire-Lite Alarms', 'SD365', 'litespeed'),
      ('Fire-Lite Alarms', 'SD365T', 'litespeed'),
      ('NOTIFIER', 'FSP-951', 'onyx'),
      ('NOTIFIER', 'NBG-12LX', 'onyx')
  ) AS v (mfr_name, mpn, option_code)
)
INSERT INTO manufacturer_part_spec (
  manufacturer_part_id,
  spec_def_id,
  spec_option_id
)
SELECT
  mp.id,
  sd.id,
  CASE pss.option_code
    WHEN 'litespeed' THEN ls.id
    WHEN 'onyx' THEN ox.id
  END
FROM part_spec_seed pss
CROSS JOIN slc_def sd
CROSS JOIN litespeed ls
CROSS JOIN onyx ox
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
    AND existing.spec_option_id = CASE pss.option_code
      WHEN 'litespeed' THEN ls.id
      WHEN 'onyx' THEN ox.id
    END
);

COMMIT;

-- Dev fixtures: Notification Appliances mount-location branches (Ceiling / Wall / Outdoor).
-- Prerequisite: 043 (Fire Alarm item tree).
-- Idempotent: match by parent path + name; skip existing rows; reparent guarded by current parent.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM item fa
    INNER JOIN item na ON na.parent_id = fa.id AND na.name = 'Notification Appliances'
    WHERE fa.name = 'Fire Alarm'
      AND fa.parent_id IS NULL
  ) THEN
    RAISE EXCEPTION '059_notification_appliance_mount_seed: Notification Appliances branch missing (run 043 first)';
  END IF;
END
$$;

-- ─── 1. Mount-location category branches under Notification Appliances ───────

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
mount_seed AS (
  SELECT *
  FROM (
    VALUES
      ('Ceiling', 1),
      ('Wall', 2),
      ('Outdoor', 3)
  ) AS v (name, sort_order)
)
INSERT INTO item (name, parent_id, sort_order, node_type)
SELECT ms.name, nb.id, ms.sort_order, 'category'
FROM notification_branch nb
CROSS JOIN mount_seed ms
WHERE NOT EXISTS (
  SELECT 1
  FROM item existing
  WHERE existing.parent_id = nb.id
    AND existing.name = ms.name
);

-- ─── 2. Reparent existing flat leaves under Wall ─────────────────────────────

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
wall_branch AS (
  SELECT w.id
  FROM item w
  INNER JOIN notification_branch nb ON w.parent_id = nb.id
  WHERE w.name = 'Wall'
  LIMIT 1
)
UPDATE item i
SET
  parent_id = wb.id,
  name = 'Horn',
  sort_order = 1,
  node_type = 'item'
FROM wall_branch wb
WHERE i.name = 'Horn Only'
  AND i.parent_id = (SELECT id FROM notification_branch);

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
wall_branch AS (
  SELECT w.id
  FROM item w
  INNER JOIN notification_branch nb ON w.parent_id = nb.id
  WHERE w.name = 'Wall'
  LIMIT 1
)
UPDATE item i
SET
  parent_id = wb.id,
  sort_order = 3,
  node_type = 'item'
FROM wall_branch wb
WHERE i.name = 'Horn/Strobe'
  AND i.parent_id = (SELECT id FROM notification_branch);

-- ─── 3. Device leaves under Ceiling, Wall, Outdoor ───────────────────────────

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
mount_branch AS (
  SELECT m.id, m.name AS mount_name
  FROM item m
  INNER JOIN notification_branch nb ON m.parent_id = nb.id
  WHERE m.name IN ('Ceiling', 'Wall', 'Outdoor')
),
leaf_seed AS (
  SELECT *
  FROM (
    VALUES
      ('Ceiling', 'Horn', 1),
      ('Ceiling', 'Strobe', 2),
      ('Ceiling', 'Horn/Strobe', 3),
      ('Ceiling', 'Speaker', 4),
      ('Ceiling', 'Speaker/Strobe', 5),
      ('Wall', 'Horn', 1),
      ('Wall', 'Strobe', 2),
      ('Wall', 'Horn/Strobe', 3),
      ('Wall', 'Speaker', 4),
      ('Wall', 'Speaker/Strobe', 5),
      ('Outdoor', 'Horn', 1),
      ('Outdoor', 'Strobe', 2),
      ('Outdoor', 'Horn/Strobe', 3),
      ('Outdoor', 'Speaker', 4),
      ('Outdoor', 'Speaker/Strobe', 5)
  ) AS v (mount_name, leaf_name, sort_order)
)
INSERT INTO item (name, parent_id, sort_order, node_type)
SELECT ls.leaf_name, mb.id, ls.sort_order, 'item'
FROM leaf_seed ls
INNER JOIN mount_branch mb ON mb.mount_name = ls.mount_name
WHERE NOT EXISTS (
  SELECT 1
  FROM item existing
  WHERE existing.parent_id = mb.id
    AND existing.name = ls.leaf_name
);

-- ─── 4. Reconcile orphans + enforce node_type on mount leaves ────────────────

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
wall_branch AS (
  SELECT w.id
  FROM item w
  INNER JOIN notification_branch nb ON w.parent_id = nb.id
  WHERE w.name = 'Wall'
  LIMIT 1
),
wall_horn AS (
  SELECT h.id
  FROM item h
  INNER JOIN wall_branch wb ON h.parent_id = wb.id
  WHERE h.name = 'Horn'
  ORDER BY h.id
  LIMIT 1
),
horn_only_orphan AS (
  SELECT o.id
  FROM item o
  INNER JOIN notification_branch nb ON o.parent_id = nb.id
  WHERE o.name = 'Horn Only'
     OR (
       EXISTS (
         SELECT 1
         FROM part_item pi
         INNER JOIN manufacturer_part mp ON mp.id = pi.part_id
         WHERE pi.item_id = o.id
           AND mp.mpn = 'HRL'
       )
       AND o.name IN ('Horn Only', 'Horn', 'Speaker/Strobe')
     )
  ORDER BY CASE o.name WHEN 'Horn Only' THEN 0 ELSE 1 END, o.id
  LIMIT 1
)
UPDATE part_item pi
SET item_id = wh.id
FROM wall_horn wh, horn_only_orphan hoo
WHERE pi.item_id = hoo.id
  AND NOT EXISTS (
    SELECT 1
    FROM part_item existing
    WHERE existing.part_id = pi.part_id
      AND existing.item_id = wh.id
  );

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
wall_branch AS (
  SELECT w.id
  FROM item w
  INNER JOIN notification_branch nb ON w.parent_id = nb.id
  WHERE w.name = 'Wall'
  LIMIT 1
)
UPDATE part_item pi
SET item_id = keeper.id
FROM wall_branch wb
INNER JOIN item orphan
  ON orphan.parent_id = (SELECT id FROM notification_branch)
 AND orphan.name IN ('Horn Only', 'Horn', 'Strobe', 'Horn/Strobe', 'Speaker', 'Speaker/Strobe')
INNER JOIN item keeper
  ON keeper.parent_id = wb.id
 AND keeper.name = CASE orphan.name WHEN 'Horn Only' THEN 'Horn' ELSE orphan.name END
WHERE pi.item_id = orphan.id
  AND keeper.id <> orphan.id
  AND NOT EXISTS (
    SELECT 1
    FROM part_item existing
    WHERE existing.part_id = pi.part_id
      AND existing.item_id = keeper.id
  );

WITH fa_root AS (
  SELECT id FROM item WHERE name = 'Fire Alarm' AND parent_id IS NULL LIMIT 1
),
notification_branch AS (
  SELECT b.id
  FROM item b
  INNER JOIN fa_root r ON b.parent_id = r.id
  WHERE b.name = 'Notification Appliances'
  LIMIT 1
)
DELETE FROM item i
USING notification_branch nb
WHERE i.parent_id = nb.id
  AND i.name IN ('Horn Only', 'Horn', 'Strobe', 'Horn/Strobe', 'Speaker', 'Speaker/Strobe');

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
mount_branch AS (
  SELECT m.id
  FROM item m
  INNER JOIN notification_branch nb ON m.parent_id = nb.id
  WHERE m.name IN ('Ceiling', 'Wall', 'Outdoor')
)
DELETE FROM item dup
USING mount_branch mb
WHERE dup.parent_id = mb.id
  AND dup.name IN ('Horn', 'Strobe', 'Horn/Strobe', 'Speaker', 'Speaker/Strobe')
  AND dup.id <> (
    SELECT keep.id
    FROM item keep
    WHERE keep.parent_id = mb.id
      AND keep.name = dup.name
    ORDER BY (SELECT COUNT(*)::int FROM part_item pi WHERE pi.item_id = keep.id) DESC, keep.id
    LIMIT 1
  );

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
mount_branch AS (
  SELECT m.id
  FROM item m
  INNER JOIN notification_branch nb ON m.parent_id = nb.id
  WHERE m.name IN ('Ceiling', 'Wall', 'Outdoor')
)
UPDATE item i
SET node_type = 'item'
FROM mount_branch mb
WHERE i.parent_id = mb.id
  AND i.name IN ('Horn', 'Strobe', 'Horn/Strobe', 'Speaker', 'Speaker/Strobe');

COMMIT;

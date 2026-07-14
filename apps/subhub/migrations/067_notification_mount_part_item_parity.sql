-- Dev fixtures: copy Wall notification `part_item` links to Ceiling / Outdoor siblings.
-- Prerequisite: 059 (mount tree), 063 (Wall Horn/Strobe P2RL path).
-- Idempotent: skip existing (part_id, item_id) pairs. Does not touch vendor_part or part specs.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM item fa
    INNER JOIN item na ON na.parent_id = fa.id AND na.name = 'Notification Appliances'
    INNER JOIN item mount ON mount.parent_id = na.id AND mount.name = 'Wall'
    INNER JOIN item leaf ON leaf.parent_id = mount.id AND leaf.name = 'Horn/Strobe'
    INNER JOIN part_item pi ON pi.item_id = leaf.id
    INNER JOIN manufacturer_part mp ON mp.id = pi.part_id AND mp.mpn = 'P2RL'
    WHERE fa.name = 'Fire Alarm'
      AND fa.parent_id IS NULL
  ) THEN
    RAISE EXCEPTION '067_notification_mount_part_item_parity: Wall Horn/Strobe P2RL missing (run 059+063 first)';
  END IF;
END
$$;

-- For each Wall notification leaf that has part_item rows, ensure Ceiling and Outdoor
-- siblings with the same device name get the same part links (same sort_order).
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
mount_leaf AS (
  SELECT
    leaf.id AS item_id,
    mount.name AS mount_name,
    leaf.name AS leaf_name
  FROM item leaf
  INNER JOIN item mount ON mount.id = leaf.parent_id
  INNER JOIN notification_branch nb ON nb.id = mount.parent_id
  WHERE mount.name IN ('Ceiling', 'Wall', 'Outdoor')
),
wall_links AS (
  SELECT
    pi.part_id,
    pi.sort_order,
    wl.leaf_name
  FROM part_item pi
  INNER JOIN mount_leaf wl ON wl.item_id = pi.item_id AND wl.mount_name = 'Wall'
),
sibling_targets AS (
  SELECT
    wl.part_id,
    wl.sort_order,
    sibling.item_id
  FROM wall_links wl
  INNER JOIN mount_leaf sibling
    ON sibling.leaf_name = wl.leaf_name
   AND sibling.mount_name IN ('Ceiling', 'Outdoor')
)
INSERT INTO part_item (part_id, item_id, sort_order)
SELECT st.part_id, st.item_id, st.sort_order
FROM sibling_targets st
WHERE NOT EXISTS (
  SELECT 1
  FROM part_item existing
  WHERE existing.part_id = st.part_id
    AND existing.item_id = st.item_id
);

COMMIT;

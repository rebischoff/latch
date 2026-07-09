-- SubHub: remove non-leaf part_item rows (task 37u — leaf-only item links).
-- Prerequisite: 052 applied.
-- Scopes/categories on part_item never expanded the resolver pool or specs union.

BEGIN;

DELETE FROM part_item
WHERE item_id IN (
  SELECT id FROM item WHERE node_type <> 'item'
);

COMMIT;

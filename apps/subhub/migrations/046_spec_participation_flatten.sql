-- SubHub: flatten spec_def namespace to scope root + per-leaf item_spec_participation (task 37o).
-- Prerequisite: 038, 040a applied (spec_def.item_id + item_spec_exclude).

BEGIN;

-- ─── 1. Scope-root namespace column ─────────────────────────────────────────

ALTER TABLE spec_def ADD COLUMN IF NOT EXISTS scope_root_item_id text;

WITH RECURSIVE ancestry AS (
  SELECT id, id AS origin_id, parent_id FROM item
  UNION ALL
  SELECT i.id, a.origin_id, i.parent_id
  FROM item i
  JOIN ancestry a ON i.id = a.parent_id
)
UPDATE spec_def sd
SET scope_root_item_id = a.id
FROM ancestry a
WHERE a.origin_id = sd.item_id
  AND a.parent_id IS NULL
  AND sd.scope_root_item_id IS NULL;

ALTER TABLE spec_def ALTER COLUMN scope_root_item_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spec_def_scope_root_fk'
  ) THEN
    ALTER TABLE spec_def
      ADD CONSTRAINT spec_def_scope_root_fk
      FOREIGN KEY (scope_root_item_id) REFERENCES item (id) ON DELETE RESTRICT;
  END IF;
END
$$;

-- ─── 2. Flat participation table ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS item_spec_participation (
  item_id      text NOT NULL REFERENCES item (id) ON DELETE CASCADE,
  spec_def_id  uuid NOT NULL REFERENCES spec_def (id) ON DELETE CASCADE,
  sort_order   int NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, spec_def_id)
);

-- ─── 3. Backfill participation from legacy effective() semantics ────────────

CREATE OR REPLACE FUNCTION _37o_path_assign_to_leaf(p_assign text, p_leaf text)
RETURNS text[]
LANGUAGE plpgsql
AS $$
DECLARE
  v_current text := p_leaf;
  v_path text[] := ARRAY[]::text[];
BEGIN
  WHILE v_current IS NOT NULL LOOP
    v_path := v_path || v_current;
    IF v_current = p_assign THEN
      RETURN v_path;
    END IF;
    SELECT parent_id INTO v_current FROM item WHERE id = v_current;
  END LOOP;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION _37o_is_effective_legacy(
  p_leaf_id text,
  p_spec_def_id uuid,
  p_assign_item_id text
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_path text[];
  v_node text;
BEGIN
  v_path := _37o_path_assign_to_leaf(p_assign_item_id, p_leaf_id);
  IF v_path IS NULL THEN
    RETURN false;
  END IF;

  FOREACH v_node IN ARRAY v_path LOOP
    IF EXISTS (
      SELECT 1
      FROM item_spec_exclude e
      WHERE e.item_id = v_node
        AND e.spec_def_id = p_spec_def_id
    ) THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$$;

INSERT INTO item_spec_participation (item_id, spec_def_id, sort_order)
SELECT leaf.id, sd.id, sd.sort_order
FROM item leaf
CROSS JOIN spec_def sd
WHERE leaf.node_type = 'item'
  AND sd.item_id IS NOT NULL
  AND _37o_is_effective_legacy(leaf.id, sd.id, sd.item_id)
ON CONFLICT (item_id, spec_def_id) DO NOTHING;

DROP FUNCTION IF EXISTS _37o_is_effective_legacy(text, uuid, text);
DROP FUNCTION IF EXISTS _37o_path_assign_to_leaf(text, text);

-- ─── 4. Drop legacy ownership + exclude ─────────────────────────────────────

ALTER TABLE spec_def DROP COLUMN IF EXISTS item_id;
DROP TABLE IF EXISTS item_spec_exclude;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE item_spec_participation TO latch_app;
  END IF;
END
$$;

COMMIT;

-- SubHub: bind estimate root conditions to root site_zone (task 42b).
-- Prerequisite: 072 applied. Dev DB big-bang — no compat layer.

BEGIN;

-- ─── 1. Add site_zone_id (nullable until backfill) ───────────────────────────

ALTER TABLE estimate_condition
  ADD COLUMN IF NOT EXISTS site_zone_id TEXT;

-- ─── 2. Backfill root conditions ─────────────────────────────────────────────
-- Exact one matching root site_zone (same site + root_item_id) → link.
-- Zero matches → create proposed root site_zone (name from condition) → link.
-- Multiple matches → cannot auto-resolve (raise for manual review).

DO $$
DECLARE
  ambig RECORD;
  ambig_list TEXT := '';
  cond RECORD;
  match_count INT;
  matched_zone_id TEXT;
  new_zone_id TEXT;
BEGIN
  -- Flag ambiguous roots before mutating.
  FOR ambig IN
    SELECT
      ec.id AS condition_id,
      ec.estimate_id,
      e.site_id,
      ec.root_item_id,
      ec.name AS condition_name,
      COUNT(sz.id) AS match_count
    FROM estimate_condition ec
    INNER JOIN estimate e ON e.id = ec.estimate_id
    LEFT JOIN site_zone sz
      ON sz.site_id = e.site_id
     AND sz.parent_zone_id IS NULL
     AND sz.root_item_id = ec.root_item_id
    WHERE ec.parent_condition_id IS NULL
      AND ec.site_zone_id IS NULL
      AND ec.root_item_id IS NOT NULL
    GROUP BY ec.id, ec.estimate_id, e.site_id, ec.root_item_id, ec.name
    HAVING COUNT(sz.id) > 1
  LOOP
    ambig_list := ambig_list || format(
      E'\n  condition=%s estimate=%s site=%s root_item=%s name=%s matches=%s',
      ambig.condition_id,
      ambig.estimate_id,
      ambig.site_id,
      ambig.root_item_id,
      ambig.condition_name,
      ambig.match_count
    );
  END LOOP;

  IF ambig_list <> '' THEN
    RAISE EXCEPTION
      '073 backfill: multiple root site_zone matches for estimate_condition roots — resolve manually before re-running:%',
      ambig_list;
  END IF;

  FOR cond IN
    SELECT
      ec.id AS condition_id,
      ec.estimate_id,
      e.site_id,
      ec.root_item_id,
      ec.name AS condition_name,
      ec.sort_order
    FROM estimate_condition ec
    INNER JOIN estimate e ON e.id = ec.estimate_id
    WHERE ec.parent_condition_id IS NULL
      AND ec.site_zone_id IS NULL
  LOOP
    IF cond.root_item_id IS NULL THEN
      RAISE EXCEPTION
        '073 backfill: root condition % has null root_item_id — cannot link',
        cond.condition_id;
    END IF;

    SELECT COUNT(*), MIN(sz.id)
      INTO match_count, matched_zone_id
    FROM site_zone sz
    WHERE sz.site_id = cond.site_id
      AND sz.parent_zone_id IS NULL
      AND sz.root_item_id = cond.root_item_id;

    IF match_count = 1 THEN
      UPDATE estimate_condition
      SET site_zone_id = matched_zone_id
      WHERE id = cond.condition_id;
    ELSIF match_count = 0 THEN
      new_zone_id := gen_random_uuid()::text;
      INSERT INTO site_zone (
        id, site_id, parent_zone_id, root_item_id, name, sort_order, status
      ) VALUES (
        new_zone_id,
        cond.site_id,
        NULL,
        cond.root_item_id,
        cond.condition_name,
        cond.sort_order,
        'proposed'
      );
      UPDATE estimate_condition
      SET site_zone_id = new_zone_id
      WHERE id = cond.condition_id;
    ELSE
      RAISE EXCEPTION
        '073 backfill: unexpected match_count=% for condition %',
        match_count,
        cond.condition_id;
    END IF;
  END LOOP;
END $$;

-- ─── 3. Constraints ──────────────────────────────────────────────────────────

ALTER TABLE estimate_condition
  DROP CONSTRAINT IF EXISTS estimate_condition_root_requires_site_zone;

ALTER TABLE estimate_condition
  ADD CONSTRAINT estimate_condition_root_requires_site_zone
  CHECK (parent_condition_id IS NOT NULL OR site_zone_id IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS estimate_condition_estimate_site_zone_root_uidx
  ON estimate_condition (estimate_id, site_zone_id)
  WHERE parent_condition_id IS NULL AND site_zone_id IS NOT NULL;

ALTER TABLE estimate_condition
  DROP CONSTRAINT IF EXISTS estimate_condition_site_zone_id_fkey;

ALTER TABLE estimate_condition
  ADD CONSTRAINT estimate_condition_site_zone_id_fkey
  FOREIGN KEY (site_zone_id) REFERENCES site_zone (id) ON DELETE RESTRICT;

-- ─── 4. Drop stored root_item_id ─────────────────────────────────────────────

ALTER TABLE estimate_condition
  DROP CONSTRAINT IF EXISTS estimate_condition_root_item_id_fkey;

ALTER TABLE estimate_condition
  DROP COLUMN IF EXISTS root_item_id;

COMMIT;

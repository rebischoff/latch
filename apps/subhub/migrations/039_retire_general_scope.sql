-- SubHub: retire General scope bucket + estimate line costing columns (task 37f).
-- Plan: docs/migrations/039-retire-general-scope-plan.md

BEGIN;

-- ─── 1. Catalog root "General" for migrated site scopes ─────────────────────

INSERT INTO category (id, name, parent_id, sort_order)
SELECT gen_random_uuid()::text, 'General', NULL, 9999
WHERE NOT EXISTS (
  SELECT 1 FROM category WHERE parent_id IS NULL AND name = 'General'
);

-- ─── 2. Re-parent orphan site_zone rows ─────────────────────────────────────

DO $$
DECLARE
  site_rec RECORD;
  general_root_id TEXT;
  new_scope_id TEXT;
BEGIN
  SELECT id INTO general_root_id
  FROM category
  WHERE parent_id IS NULL AND name = 'General'
  LIMIT 1;

  FOR site_rec IN
    SELECT DISTINCT site_id
    FROM site_zone
    WHERE site_scope_id IS NULL
  LOOP
    new_scope_id := gen_random_uuid()::text;

    INSERT INTO site_scope (id, site_id, root_category_id, name, sort_order, status)
    VALUES (new_scope_id, site_rec.site_id, general_root_id, 'General', 9999, 'active');

    UPDATE site_zone
    SET site_scope_id = new_scope_id
    WHERE site_id = site_rec.site_id
      AND site_scope_id IS NULL;
  END LOOP;
END
$$;

-- ─── 3. Delete synthetic General estimate_scope rows ────────────────────────

DELETE FROM estimate_scope
WHERE site_scope_id IS NULL AND root_category_id IS NULL;

-- ─── 4. Re-home ROM estimate_line rows ────────────────────────────────────

DO $$
DECLARE
  est_rec RECORD;
  target_scope_id TEXT;
  site_rec RECORD;
  new_scope_id TEXT;
  orphan_count INTEGER;
BEGIN
  FOR est_rec IN
    SELECT DISTINCT e.id AS estimate_id, e.site_id
    FROM estimate e
    INNER JOIN estimate_line el ON el.estimate_id = e.id
    WHERE el.estimate_scope_id IS NULL
  LOOP
    SELECT id INTO target_scope_id
    FROM estimate_scope
    WHERE estimate_id = est_rec.estimate_id
      AND site_scope_id IS NOT NULL
      AND root_category_id IS NOT NULL
    ORDER BY sort_order ASC, id ASC
    LIMIT 1;

    IF target_scope_id IS NULL THEN
      SELECT ss.id INTO target_scope_id
      FROM site_scope ss
      WHERE ss.site_id = est_rec.site_id
      ORDER BY ss.sort_order ASC, ss.id ASC
      LIMIT 1;

      IF target_scope_id IS NOT NULL THEN
        new_scope_id := gen_random_uuid()::text;

        INSERT INTO estimate_scope (
          id,
          estimate_id,
          site_scope_id,
          root_category_id,
          sort_order
        )
        SELECT
          new_scope_id,
          est_rec.estimate_id,
          ss.id,
          ss.root_category_id,
          COALESCE(
            (SELECT MAX(sort_order) + 1 FROM estimate_scope WHERE estimate_id = est_rec.estimate_id),
            1
          )
        FROM site_scope ss
        WHERE ss.id = target_scope_id;

        target_scope_id := new_scope_id;
      END IF;
    END IF;

    IF target_scope_id IS NULL THEN
      SELECT COUNT(*)::int INTO orphan_count
      FROM estimate_line
      WHERE estimate_id = est_rec.estimate_id
        AND estimate_scope_id IS NULL;

      RAISE EXCEPTION 'Cannot backfill estimate % — % line(s) without scope and no site_scope',
        est_rec.estimate_id, orphan_count;
    END IF;

    UPDATE estimate_line
    SET estimate_scope_id = target_scope_id
    WHERE estimate_id = est_rec.estimate_id
      AND estimate_scope_id IS NULL;
  END LOOP;
END
$$;

-- ─── 5. Additive columns ────────────────────────────────────────────────────

ALTER TABLE item
  ADD COLUMN IF NOT EXISTS fallback_unit_cost NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE estimate_line
  ADD COLUMN IF NOT EXISTS part_locked BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE estimate_line
  ADD COLUMN IF NOT EXISTS unit_price_target NUMERIC;

-- ─── 6. NOT NULL constraints (after backfill) ───────────────────────────────

ALTER TABLE site_zone
  ALTER COLUMN site_scope_id SET NOT NULL;

ALTER TABLE estimate_line
  ALTER COLUMN estimate_scope_id SET NOT NULL;

ALTER TABLE estimate_scope
  ALTER COLUMN site_scope_id SET NOT NULL,
  ALTER COLUMN root_category_id SET NOT NULL;

ALTER TABLE estimate_scope
  DROP CONSTRAINT IF EXISTS estimate_scope_scoped_or_general_chk;

DROP INDEX IF EXISTS estimate_scope_general_per_estimate_idx;

COMMIT;

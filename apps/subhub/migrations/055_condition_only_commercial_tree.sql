-- SubHub: condition-only commercial tree (task 37y).
-- Migrates estimate_scope* → root estimate_condition; lines require condition.
-- Prerequisite: 054 applied. Decision: docs/decisions/estimate.md Y1–Y5.

BEGIN;

-- ─── 1. Amend estimate_condition for forest roots ────────────────────────────

ALTER TABLE estimate_condition
  ADD COLUMN IF NOT EXISTS estimate_id TEXT REFERENCES estimate (id) ON DELETE CASCADE;

ALTER TABLE estimate_condition
  ADD COLUMN IF NOT EXISTS root_item_id TEXT REFERENCES item (id) ON DELETE RESTRICT;

-- Y4 sentinel: true = own phase set (junction may be empty = explicit no phases);
-- false = inherit from ancestry (ignore junction rows).
ALTER TABLE estimate_condition
  ADD COLUMN IF NOT EXISTS labor_phases_explicit BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill estimate_id from parent scope for existing conditions.
UPDATE estimate_condition ec
SET estimate_id = es.estimate_id
FROM estimate_scope es
WHERE es.id = ec.estimate_scope_id
  AND ec.estimate_id IS NULL;

-- ─── 2. Migrate each estimate_scope → a root estimate_condition ──────────────

-- Map: old scope id → new root condition id (reuse scope id so line FKs stay stable
-- when we re-point; children keep their ids and reparent under the new root).
CREATE TEMP TABLE _scope_to_root (
  scope_id TEXT PRIMARY KEY,
  root_condition_id TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO _scope_to_root (scope_id, root_condition_id)
SELECT id, id FROM estimate_scope;

-- Insert root conditions using the former scope id as the condition id.
-- Temporarily drop the estimate_scope_id NOT NULL / FK so we can insert roots
-- that are not under a scope, then reparent children.
ALTER TABLE estimate_condition
  ALTER COLUMN estimate_scope_id DROP NOT NULL;

INSERT INTO estimate_condition (
  id,
  estimate_id,
  estimate_scope_id,
  parent_condition_id,
  root_item_id,
  name,
  complexity_factor_id,
  sort_order,
  labor_phases_explicit
)
SELECT
  es.id,
  es.estimate_id,
  NULL,
  NULL,
  es.root_item_id,
  es.name,
  NULL,
  es.sort_order,
  -- Explicit only when the scope had phase rows; empty scope = catalog default.
  EXISTS (
    SELECT 1
    FROM estimate_scope_labor_phase eslp
    WHERE eslp.estimate_scope_id = es.id
  )
FROM estimate_scope es
WHERE NOT EXISTS (
  SELECT 1 FROM estimate_condition ec WHERE ec.id = es.id
);

-- Copy scope specs → condition specs on the new roots.
INSERT INTO estimate_condition_spec (
  id,
  estimate_condition_id,
  spec_def_id,
  spec_option_id,
  value_boolean,
  value_number,
  value_number_max
)
SELECT
  gen_random_uuid()::text,
  s.scope_id,
  ess.spec_def_id,
  ess.spec_option_id,
  ess.value_boolean,
  ess.value_number,
  ess.value_number_max
FROM estimate_scope_spec ess
INNER JOIN _scope_to_root s ON s.scope_id = ess.estimate_scope_id
WHERE NOT EXISTS (
  SELECT 1
  FROM estimate_condition_spec ecs
  WHERE ecs.estimate_condition_id = s.scope_id
    AND ecs.spec_def_id = ess.spec_def_id
);

-- Copy scope labor phases → condition labor phases on the new roots.
INSERT INTO estimate_condition_labor_phase (
  estimate_condition_id,
  labor_phase_id,
  sort_order
)
SELECT
  s.scope_id,
  eslp.labor_phase_id,
  eslp.sort_order
FROM estimate_scope_labor_phase eslp
INNER JOIN _scope_to_root s ON s.scope_id = eslp.estimate_scope_id
ON CONFLICT (estimate_condition_id, labor_phase_id) DO NOTHING;

-- Reparent former top-level conditions (parent null under a scope) under the
-- migrated root; nested children keep their parent_condition_id.
UPDATE estimate_condition ec
SET
  parent_condition_id = s.root_condition_id,
  estimate_id = es.estimate_id,
  estimate_scope_id = NULL,
  root_item_id = NULL,
  labor_phases_explicit = CASE
    WHEN EXISTS (
      SELECT 1
      FROM estimate_condition_labor_phase eclp
      WHERE eclp.estimate_condition_id = ec.id
    ) THEN TRUE
    ELSE labor_phases_explicit
  END
FROM _scope_to_root s
INNER JOIN estimate_scope es ON es.id = s.scope_id
WHERE ec.estimate_scope_id = s.scope_id
  AND ec.id <> s.root_condition_id
  AND ec.parent_condition_id IS NULL;

-- Nested conditions: clear scope FK, set estimate_id, null root_item_id.
UPDATE estimate_condition ec
SET
  estimate_id = es.estimate_id,
  estimate_scope_id = NULL,
  root_item_id = NULL,
  labor_phases_explicit = CASE
    WHEN EXISTS (
      SELECT 1
      FROM estimate_condition_labor_phase eclp
      WHERE eclp.estimate_condition_id = ec.id
    ) THEN TRUE
    ELSE labor_phases_explicit
  END
FROM _scope_to_root s
INNER JOIN estimate_scope es ON es.id = s.scope_id
WHERE ec.estimate_scope_id = s.scope_id
  AND ec.id <> s.root_condition_id
  AND ec.parent_condition_id IS NOT NULL;

-- Any remaining conditions still pointing at a scope (safety).
UPDATE estimate_condition ec
SET
  estimate_id = COALESCE(ec.estimate_id, es.estimate_id),
  estimate_scope_id = NULL,
  root_item_id = CASE
    WHEN ec.parent_condition_id IS NULL THEN COALESCE(ec.root_item_id, es.root_item_id)
    ELSE NULL
  END
FROM estimate_scope es
WHERE es.id = ec.estimate_scope_id;

-- ─── 3. Re-point lines onto conditions ───────────────────────────────────────

-- Lines with a condition keep it; lines with only a scope → migrated root.
UPDATE estimate_line el
SET estimate_condition_id = el.estimate_scope_id
WHERE el.estimate_condition_id IS NULL
  AND el.estimate_scope_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM estimate_condition ec WHERE ec.id = el.estimate_scope_id
  );

-- Refuse incomplete data rather than inventing conditions.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM estimate_line WHERE estimate_condition_id IS NULL
  ) THEN
    RAISE EXCEPTION
      '055: estimate_line rows still missing estimate_condition_id after migrate';
  END IF;
END
$$;

ALTER TABLE estimate_line
  ALTER COLUMN estimate_condition_id SET NOT NULL;

-- Drop ON DELETE SET NULL; lines must hang on a condition (RESTRICT on delete
-- is enforced in app X1; DB cascade from condition delete would remove lines —
-- keep SET NULL briefly then switch to RESTRICT after drop of scope col).
ALTER TABLE estimate_line
  DROP CONSTRAINT IF EXISTS estimate_line_estimate_condition_id_fkey;

ALTER TABLE estimate_line
  ADD CONSTRAINT estimate_line_estimate_condition_id_fkey
  FOREIGN KEY (estimate_condition_id)
  REFERENCES estimate_condition (id)
  ON DELETE RESTRICT;

ALTER TABLE estimate_line
  DROP COLUMN IF EXISTS estimate_scope_id;

-- ─── 4. Finalize estimate_condition shape ────────────────────────────────────

ALTER TABLE estimate_condition
  DROP COLUMN IF EXISTS estimate_scope_id;

ALTER TABLE estimate_condition
  ALTER COLUMN estimate_id SET NOT NULL;

-- Roots must have root_item_id; children must not.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM estimate_condition
    WHERE parent_condition_id IS NULL
      AND root_item_id IS NULL
  ) THEN
    RAISE EXCEPTION '055: root estimate_condition missing root_item_id';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM estimate_condition
    WHERE parent_condition_id IS NOT NULL
      AND root_item_id IS NOT NULL
  ) THEN
    -- Clear child root_item_id (inherit from tree root in app).
    UPDATE estimate_condition
    SET root_item_id = NULL
    WHERE parent_condition_id IS NOT NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS estimate_condition_estimate_id_idx
  ON estimate_condition (estimate_id);

CREATE INDEX IF NOT EXISTS estimate_condition_parent_id_idx
  ON estimate_condition (parent_condition_id);

CREATE INDEX IF NOT EXISTS estimate_condition_root_item_id_idx
  ON estimate_condition (root_item_id);

-- ─── 5. Drop scope tables ────────────────────────────────────────────────────

DROP TABLE IF EXISTS estimate_scope_labor_phase;
DROP TABLE IF EXISTS estimate_scope_spec;
DROP TABLE IF EXISTS estimate_scope;

-- ─── 6. Grants ───────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      estimate_condition,
      estimate_condition_spec,
      estimate_condition_labor_phase
    TO latch_app;
  END IF;
END
$$;

COMMIT;

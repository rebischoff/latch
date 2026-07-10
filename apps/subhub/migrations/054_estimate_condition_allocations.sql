-- SubHub: estimate conditions + line allocations (task 37x).
-- Retires commercial estimate_zone* ; complexity moves to estimate_condition only.
-- Prerequisite: 045+ applied. Decision: docs/decisions/estimate.md G1–G5e / X1–X4.

BEGIN;

-- ─── 1. New tables ───────────────────────────────────────────────────────────

CREATE TABLE estimate_condition (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  estimate_scope_id    TEXT NOT NULL REFERENCES estimate_scope (id) ON DELETE CASCADE,
  parent_condition_id  TEXT REFERENCES estimate_condition (id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  complexity_factor_id TEXT REFERENCES complexity_factor (id) ON DELETE SET NULL,
  sort_order           INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX estimate_condition_scope_id_idx
  ON estimate_condition (estimate_scope_id);

CREATE INDEX estimate_condition_parent_id_idx
  ON estimate_condition (parent_condition_id);

CREATE TABLE estimate_condition_spec (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  estimate_condition_id TEXT NOT NULL REFERENCES estimate_condition (id) ON DELETE CASCADE,
  spec_def_id          UUID NOT NULL REFERENCES spec_def (id) ON DELETE RESTRICT,
  spec_option_id       UUID REFERENCES spec_option (id) ON DELETE SET NULL,
  value_boolean        BOOLEAN,
  value_number         NUMERIC,
  value_number_max     NUMERIC
);

CREATE INDEX estimate_condition_spec_condition_id_idx
  ON estimate_condition_spec (estimate_condition_id);

CREATE TABLE estimate_condition_labor_phase (
  estimate_condition_id TEXT NOT NULL REFERENCES estimate_condition (id) ON DELETE CASCADE,
  labor_phase_id        TEXT NOT NULL REFERENCES labor_phase (id) ON DELETE RESTRICT,
  sort_order            INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (estimate_condition_id, labor_phase_id)
);

CREATE TABLE estimate_line_allocation (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  estimate_line_id TEXT NOT NULL REFERENCES estimate_line (id) ON DELETE CASCADE,
  site_zone_id     TEXT NOT NULL REFERENCES site_zone (id) ON DELETE RESTRICT,
  quantity         NUMERIC NOT NULL DEFAULT 1,
  UNIQUE (estimate_line_id, site_zone_id)
);

CREATE INDEX estimate_line_allocation_line_id_idx
  ON estimate_line_allocation (estimate_line_id);

-- ─── 2. Amend estimate_scope / estimate_line ─────────────────────────────────

ALTER TABLE estimate_scope
  ADD COLUMN IF NOT EXISTS name TEXT;

UPDATE estimate_scope es
SET name = COALESCE(
  (SELECT ss.name FROM site_scope ss WHERE ss.id = es.site_scope_id),
  (SELECT i.name FROM item i WHERE i.id = es.root_item_id),
  'Scope'
)
WHERE es.name IS NULL;

ALTER TABLE estimate_scope
  ALTER COLUMN name SET NOT NULL;

-- 37x X2: commercial tree is estimate-owned; site_scope_id unused for quoting.
ALTER TABLE estimate_scope
  ALTER COLUMN site_scope_id DROP NOT NULL;

ALTER TABLE estimate_line
  ADD COLUMN IF NOT EXISTS estimate_condition_id TEXT
    REFERENCES estimate_condition (id) ON DELETE SET NULL;

ALTER TABLE estimate_line
  ADD COLUMN IF NOT EXISTS qty_manual BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── 3. Migrate line site_zone_id → one allocation row ───────────────────────

INSERT INTO estimate_line_allocation (id, estimate_line_id, site_zone_id, quantity)
SELECT gen_random_uuid()::text, el.id, el.site_zone_id, 1
FROM estimate_line el
WHERE el.site_zone_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM estimate_line_allocation ela
    WHERE ela.estimate_line_id = el.id AND ela.site_zone_id = el.site_zone_id
  );

ALTER TABLE estimate_line DROP COLUMN IF EXISTS site_zone_id;

-- ─── 4. Drop commercial estimate_zone* ───────────────────────────────────────

DROP TABLE IF EXISTS estimate_zone_labor_phase;
DROP TABLE IF EXISTS estimate_zone_spec;
DROP TABLE IF EXISTS estimate_zone;

ALTER TABLE estimate_scope DROP COLUMN IF EXISTS complexity_factor_id;

-- ─── 5. Grants ───────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      estimate_condition,
      estimate_condition_spec,
      estimate_condition_labor_phase,
      estimate_line_allocation
    TO latch_app;
  END IF;
END
$$;

COMMIT;

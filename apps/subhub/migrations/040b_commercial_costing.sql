-- SubHub business: commercial costing engine (task 37g / migration 040b).
-- Prerequisite: 040a applied.
-- Plan: docs/migrations/040-commercial-costing-plan.md

BEGIN;

-- ─── 1. New tables ───────────────────────────────────────────────────────────

CREATE TABLE labor_phase (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL UNIQUE,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE item_labor_phase (
  item_id             TEXT NOT NULL REFERENCES item (id) ON DELETE CASCADE,
  labor_phase_id      TEXT NOT NULL REFERENCES labor_phase (id) ON DELETE RESTRICT,
  labor_rate_type_id  TEXT NOT NULL REFERENCES labor_rate_type (id) ON DELETE RESTRICT,
  hours_per_unit      NUMERIC NOT NULL DEFAULT 0,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, labor_phase_id)
);

CREATE TABLE cost_add_on_type (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  kind          TEXT NOT NULL CHECK (kind IN ('freight', 'incidental')),
  name          TEXT NOT NULL,
  percent       NUMERIC NOT NULL DEFAULT 0,
  amount_cents  INTEGER NOT NULL DEFAULT 0,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  UNIQUE (kind, name),
  CHECK (percent > 0 OR amount_cents > 0)
);

CREATE TABLE complexity_factor (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name            TEXT NOT NULL UNIQUE,
  factor_percent  NUMERIC NOT NULL DEFAULT 100,
  sort_order      INTEGER NOT NULL DEFAULT 0
);

-- ─── 2. Amend existing tables ────────────────────────────────────────────────

ALTER TABLE markup_type
  ADD COLUMN IF NOT EXISTS material_markup_percent NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labor_markup_percent NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE markup_type DROP COLUMN IF EXISTS markup_percent;

ALTER TABLE labor_rate_type DROP COLUMN IF EXISTS labor_class_id;

ALTER TABLE item
  ADD COLUMN IF NOT EXISTS freight_rate_type_id TEXT REFERENCES cost_add_on_type (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS incidental_rate_type_id TEXT REFERENCES cost_add_on_type (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS markup_type_id TEXT REFERENCES markup_type (id) ON DELETE SET NULL;

ALTER TABLE item DROP COLUMN IF EXISTS default_phase_template_id;

ALTER TABLE estimate_scope
  ADD COLUMN IF NOT EXISTS complexity_factor_id TEXT REFERENCES complexity_factor (id) ON DELETE SET NULL;

ALTER TABLE estimate_zone
  ADD COLUMN IF NOT EXISTS complexity_factor_id TEXT REFERENCES complexity_factor (id) ON DELETE SET NULL;

ALTER TABLE estimate_line
  ADD COLUMN IF NOT EXISTS unit_freight NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE estimate_line
  ADD COLUMN IF NOT EXISTS lock TEXT NOT NULL DEFAULT 'none'
  CHECK (lock IN ('none', 'sell', 'line'));

UPDATE estimate_line SET lock = 'line' WHERE part_locked = true;

ALTER TABLE estimate_line DROP COLUMN IF EXISTS part_locked;
ALTER TABLE estimate_line DROP COLUMN IF EXISTS material_status;

-- ─── 3. Drop retired objects ─────────────────────────────────────────────────

DO $$
BEGIN
  IF to_regclass('public.scope_phase') IS NOT NULL THEN
    ALTER TABLE scope_phase DROP COLUMN IF EXISTS phase_template_step_id;
  END IF;
END
$$;

DROP TABLE IF EXISTS incidental_rate_type;
DROP TABLE IF EXISTS phase_template_step;
DROP TABLE IF EXISTS phase_template;

ALTER TABLE estimate_scope
  DROP COLUMN IF EXISTS markup_type_id,
  DROP COLUMN IF EXISTS labor_context_type_id;

DROP TABLE IF EXISTS labor_context_type;

-- ─── 4. Grants ───────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      labor_phase,
      item_labor_phase,
      cost_add_on_type,
      complexity_factor
    TO latch_app;
  END IF;
END
$$;

-- Codegen DDL anchors — IF NOT EXISTS / no-op when columns already exist from steps above.
CREATE TABLE IF NOT EXISTS labor_phase (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS item_labor_phase (
  item_id             TEXT NOT NULL,
  labor_phase_id      TEXT NOT NULL,
  labor_rate_type_id  TEXT NOT NULL,
  hours_per_unit      NUMERIC NOT NULL DEFAULT 0,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, labor_phase_id)
);

CREATE TABLE IF NOT EXISTS cost_add_on_type (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL,
  name          TEXT NOT NULL,
  percent       NUMERIC NOT NULL DEFAULT 0,
  amount_cents  INTEGER NOT NULL DEFAULT 0,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS complexity_factor (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  factor_percent  NUMERIC NOT NULL DEFAULT 100,
  sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS item (
  id                      TEXT PRIMARY KEY,
  name                    TEXT NOT NULL,
  parent_id               TEXT,
  sort_order              INTEGER NOT NULL DEFAULT 0,
  csi_code                TEXT,
  freight_rate_type_id    TEXT,
  incidental_rate_type_id TEXT,
  markup_type_id          TEXT
);

CREATE TABLE IF NOT EXISTS estimate_scope (
  id                    TEXT PRIMARY KEY,
  complexity_factor_id  TEXT
);

CREATE TABLE IF NOT EXISTS estimate_zone (
  id                    TEXT PRIMARY KEY,
  complexity_factor_id  TEXT
);

CREATE TABLE IF NOT EXISTS estimate_line (
  id            TEXT PRIMARY KEY,
  unit_freight  NUMERIC NOT NULL DEFAULT 0,
  lock          TEXT NOT NULL DEFAULT 'none'
);

CREATE TABLE IF NOT EXISTS markup_type (
  id                      TEXT PRIMARY KEY,
  name                    TEXT NOT NULL,
  material_markup_percent NUMERIC NOT NULL DEFAULT 0,
  labor_markup_percent    NUMERIC NOT NULL DEFAULT 0,
  sort_order              INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS labor_rate_type (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  rate_cents  INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

COMMIT;

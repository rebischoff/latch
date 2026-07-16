-- SubHub: estimate win → job copy schema (task 46 / wave 5b).
-- Adds catalog_scope_item_id, job_condition*, job_line_allocation, sold snapshots,
-- live cost buckets on job_line, and job_line_spec (spec_def_id).
-- Prerequisite: 075 applied.

BEGIN;

-- ─── 1. job.catalog_scope_item_id + UNIQUE (estimate, catalog scope) ─────────

ALTER TABLE job
  ADD COLUMN IF NOT EXISTS catalog_scope_item_id TEXT;

DO $$
BEGIN
  IF to_regclass('public.item') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'job_catalog_scope_item_id_fkey'
     ) THEN
    ALTER TABLE job
      ADD CONSTRAINT job_catalog_scope_item_id_fkey
      FOREIGN KEY (catalog_scope_item_id) REFERENCES item (id) ON DELETE RESTRICT;
  END IF;
END
$$;

-- One live job per (estimate, catalog scope) when estimate_id is set (W1a / S2a).
CREATE UNIQUE INDEX IF NOT EXISTS job_estimate_catalog_scope_unique
  ON job (estimate_id, catalog_scope_item_id)
  WHERE estimate_id IS NOT NULL AND catalog_scope_item_id IS NOT NULL;

COMMENT ON COLUMN job.catalog_scope_item_id IS
  'FK → item (node_type = scope) — catalog system root for this engagement (task 46 W1a).';

-- ─── 2. job_condition* (mirror estimate_condition*) ──────────────────────────

CREATE TABLE IF NOT EXISTS job_condition (
  id                            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_id                        TEXT NOT NULL REFERENCES job (id) ON DELETE CASCADE,
  parent_condition_id           TEXT REFERENCES job_condition (id) ON DELETE CASCADE,
  site_zone_id                  TEXT,
  name                          TEXT NOT NULL,
  complexity_factor_id          TEXT,
  labor_phases_explicit         BOOLEAN NOT NULL DEFAULT false,
  labor_only                    BOOLEAN NOT NULL DEFAULT false,
  labor_only_explicit           BOOLEAN NOT NULL DEFAULT false,
  include_discontinued          BOOLEAN NOT NULL DEFAULT false,
  include_discontinued_explicit BOOLEAN NOT NULL DEFAULT false,
  sort_order                    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS job_condition_job_id_idx
  ON job_condition (job_id);

CREATE INDEX IF NOT EXISTS job_condition_parent_id_idx
  ON job_condition (parent_condition_id);

DO $$
BEGIN
  IF to_regclass('public.site_zone') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'job_condition_site_zone_id_fkey'
     ) THEN
    ALTER TABLE job_condition
      ADD CONSTRAINT job_condition_site_zone_id_fkey
      FOREIGN KEY (site_zone_id) REFERENCES site_zone (id) ON DELETE RESTRICT;
  END IF;
  IF to_regclass('public.complexity_factor') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'job_condition_complexity_factor_id_fkey'
     ) THEN
    ALTER TABLE job_condition
      ADD CONSTRAINT job_condition_complexity_factor_id_fkey
      FOREIGN KEY (complexity_factor_id) REFERENCES complexity_factor (id) ON DELETE SET NULL;
  END IF;
END
$$;

-- Roots: one job condition per root site zone (mirrors estimate partial unique).
CREATE UNIQUE INDEX IF NOT EXISTS job_condition_root_zone_unique
  ON job_condition (job_id, site_zone_id)
  WHERE parent_condition_id IS NULL AND site_zone_id IS NOT NULL;

COMMENT ON TABLE job_condition IS
  'Job-owned commercial node copied from estimate_condition on win (task 46 W3). Editable; no write-back to estimate.';

CREATE TABLE IF NOT EXISTS job_condition_spec (
  id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_condition_id   TEXT NOT NULL REFERENCES job_condition (id) ON DELETE CASCADE,
  spec_def_id        UUID NOT NULL,
  spec_option_id     UUID,
  value_boolean      BOOLEAN,
  value_number       NUMERIC,
  value_number_max   NUMERIC
);

CREATE INDEX IF NOT EXISTS job_condition_spec_condition_id_idx
  ON job_condition_spec (job_condition_id);

DO $$
BEGIN
  IF to_regclass('public.spec_def') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'job_condition_spec_spec_def_id_fkey'
     ) THEN
    ALTER TABLE job_condition_spec
      ADD CONSTRAINT job_condition_spec_spec_def_id_fkey
      FOREIGN KEY (spec_def_id) REFERENCES spec_def (id) ON DELETE RESTRICT;
  END IF;
  IF to_regclass('public.spec_option') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'job_condition_spec_spec_option_id_fkey'
     ) THEN
    ALTER TABLE job_condition_spec
      ADD CONSTRAINT job_condition_spec_spec_option_id_fkey
      FOREIGN KEY (spec_option_id) REFERENCES spec_option (id) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS job_condition_labor_phase (
  job_condition_id TEXT NOT NULL REFERENCES job_condition (id) ON DELETE CASCADE,
  labor_phase_id   TEXT NOT NULL,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (job_condition_id, labor_phase_id)
);

DO $$
BEGIN
  IF to_regclass('public.labor_phase') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'job_condition_labor_phase_labor_phase_id_fkey'
     ) THEN
    ALTER TABLE job_condition_labor_phase
      ADD CONSTRAINT job_condition_labor_phase_labor_phase_id_fkey
      FOREIGN KEY (labor_phase_id) REFERENCES labor_phase (id) ON DELETE RESTRICT;
  END IF;
END
$$;

-- ─── 3. job_line sold snapshots + live cost buckets + condition bind ─────────

ALTER TABLE job_line
  ADD COLUMN IF NOT EXISTS job_condition_id TEXT,
  ADD COLUMN IF NOT EXISTS qty_manual BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unit_material NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_labor NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_freight NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_incidental NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_price_target NUMERIC,
  ADD COLUMN IF NOT EXISTS sales_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS material_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sold_unit_price NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sold_unit_cost NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sold_unit_material NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sold_unit_labor NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sold_unit_freight NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sold_unit_incidental NUMERIC NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_line_job_condition_id_fkey'
  ) THEN
    ALTER TABLE job_line
      ADD CONSTRAINT job_line_job_condition_id_fkey
      FOREIGN KEY (job_condition_id) REFERENCES job_condition (id) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS job_line_job_condition_id_idx
  ON job_line (job_condition_id);

COMMENT ON COLUMN job_line.sold_unit_price IS
  'Contract unit price frozen at win; engineering recalc must not overwrite (task 46 W3 / Scope-F1).';
COMMENT ON COLUMN job_line.sold_unit_cost IS
  'Sold unit cost snapshot at win (sum of sold cost buckets).';
COMMENT ON COLUMN job_line.job_condition_id IS
  'FK → job_condition — commercial bind after win copy (task 46).';

-- ─── 4. job_line_allocation (mirror estimate_line_allocation) ────────────────

CREATE TABLE IF NOT EXISTS job_line_allocation (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_line_id  TEXT NOT NULL REFERENCES job_line (id) ON DELETE CASCADE,
  site_zone_id TEXT NOT NULL,
  quantity     NUMERIC NOT NULL DEFAULT 1,
  UNIQUE (job_line_id, site_zone_id)
);

CREATE INDEX IF NOT EXISTS job_line_allocation_line_id_idx
  ON job_line_allocation (job_line_id);

DO $$
BEGIN
  IF to_regclass('public.site_zone') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'job_line_allocation_site_zone_id_fkey'
     ) THEN
    ALTER TABLE job_line_allocation
      ADD CONSTRAINT job_line_allocation_site_zone_id_fkey
      FOREIGN KEY (site_zone_id) REFERENCES site_zone (id) ON DELETE RESTRICT;
  END IF;
END
$$;

COMMENT ON TABLE job_line_allocation IS
  'Place rows: site zone × qty-per-zone. Copied from estimate_line_allocation on win (task 46 W4).';

-- ─── 5. job_line_spec (align with estimate_line_spec / spec_def_id) ───────────

CREATE TABLE IF NOT EXISTS job_line_spec (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_line_id      TEXT NOT NULL REFERENCES job_line (id) ON DELETE CASCADE,
  spec_def_id      UUID NOT NULL,
  spec_option_id   UUID,
  value_boolean    BOOLEAN,
  value_number     NUMERIC,
  value_number_max NUMERIC
);

CREATE INDEX IF NOT EXISTS job_line_spec_line_id_idx
  ON job_line_spec (job_line_id);

DO $$
BEGIN
  IF to_regclass('public.spec_def') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'job_line_spec_spec_def_id_fkey'
     ) THEN
    ALTER TABLE job_line_spec
      ADD CONSTRAINT job_line_spec_spec_def_id_fkey
      FOREIGN KEY (spec_def_id) REFERENCES spec_def (id) ON DELETE RESTRICT;
  END IF;
  IF to_regclass('public.spec_option') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'job_line_spec_spec_option_id_fkey'
     ) THEN
    ALTER TABLE job_line_spec
      ADD CONSTRAINT job_line_spec_spec_option_id_fkey
      FOREIGN KEY (spec_option_id) REFERENCES spec_option (id) ON DELETE SET NULL;
  END IF;
END
$$;

COMMENT ON TABLE job_line_spec IS
  'Per-line spec snapshot on win — copied from estimate_line_spec (task 46 W2).';

-- ─── 6. Grants ───────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      job_condition,
      job_condition_spec,
      job_condition_labor_phase,
      job_line_allocation,
      job_line_spec
    TO latch_app;
  END IF;
END
$$;

COMMIT;

-- SubHub: item placement + mount axis override (task 37ab).
-- commercial_axis on spec_def; variant rows on item_labor_phase; item_cost_override;
-- item_placement browse edges; implies_spec_option_id on category nodes.
-- Prerequisite: 056 applied. Decisions: catalog.md M1–M7, L1–L6.

BEGIN;

-- ─── 1. spec_def.commercial_axis ─────────────────────────────────────────────

ALTER TABLE spec_def
  ADD COLUMN IF NOT EXISTS commercial_axis BOOLEAN NOT NULL DEFAULT false;

-- ─── 2. item_labor_phase.variant_spec_option_id + PK reshape ──────────────────
-- Multiple rows per (item, phase) are allowed: NULL = base, set = axis override.

ALTER TABLE item_labor_phase
  ADD COLUMN IF NOT EXISTS variant_spec_option_id UUID
    REFERENCES spec_option (id) ON DELETE RESTRICT;

ALTER TABLE item_labor_phase DROP CONSTRAINT IF EXISTS item_labor_phase_pkey;

CREATE UNIQUE INDEX IF NOT EXISTS item_labor_phase_base_unique
  ON item_labor_phase (item_id, labor_phase_id)
  WHERE variant_spec_option_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS item_labor_phase_variant_unique
  ON item_labor_phase (item_id, labor_phase_id, variant_spec_option_id)
  WHERE variant_spec_option_id IS NOT NULL;

-- ─── 3. item_cost_override (M7) ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS item_cost_override (
  item_id                 TEXT NOT NULL REFERENCES item (id) ON DELETE CASCADE,
  variant_spec_option_id  UUID REFERENCES spec_option (id) ON DELETE RESTRICT,
  freight_rate_type_id    TEXT REFERENCES cost_add_on_type (id) ON DELETE SET NULL,
  incidental_rate_type_id TEXT REFERENCES cost_add_on_type (id) ON DELETE SET NULL,
  markup_type_id          TEXT REFERENCES markup_type (id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS item_cost_override_base_unique
  ON item_cost_override (item_id)
  WHERE variant_spec_option_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS item_cost_override_variant_unique
  ON item_cost_override (item_id, variant_spec_option_id)
  WHERE variant_spec_option_id IS NOT NULL;

-- ─── 4. item_placement (L1) ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS item_placement (
  item_id   TEXT NOT NULL REFERENCES item (id) ON DELETE CASCADE,
  parent_id TEXT NOT NULL REFERENCES item (id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, parent_id),
  CHECK (item_id <> parent_id)
);

CREATE INDEX IF NOT EXISTS item_placement_parent_id_idx
  ON item_placement (parent_id);

-- ─── 5. item.implies_spec_option_id (L5) ─────────────────────────────────────

ALTER TABLE item
  ADD COLUMN IF NOT EXISTS implies_spec_option_id UUID
    REFERENCES spec_option (id) ON DELETE SET NULL;

-- ─── 6. Grants ───────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      item_cost_override,
      item_placement
    TO latch_app;
  END IF;
END
$$;

COMMIT;

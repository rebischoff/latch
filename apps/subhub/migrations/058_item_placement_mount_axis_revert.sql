-- SubHub: revert item placement + mount axis override (task 37ac).
-- Drops tables/columns added by 057. Restores item_labor_phase PK shape (040b).
-- Prerequisite: 057 applied. Decision: catalog.md R1–R6 (leaf duplication).

BEGIN;

-- ─── 1. Drop browse + override tables ────────────────────────────────────────

DROP TABLE IF EXISTS item_placement;
DROP TABLE IF EXISTS item_cost_override;

-- ─── 2. item — drop implies_spec_option_id ───────────────────────────────────

ALTER TABLE item DROP COLUMN IF EXISTS implies_spec_option_id;

-- ─── 3. item_labor_phase — drop variant column; restore PK ───────────────────
-- Delete any variant override rows first (base rows keep variant IS NULL).

DELETE FROM item_labor_phase WHERE variant_spec_option_id IS NOT NULL;

DROP INDEX IF EXISTS item_labor_phase_base_unique;
DROP INDEX IF EXISTS item_labor_phase_variant_unique;

ALTER TABLE item_labor_phase DROP COLUMN IF EXISTS variant_spec_option_id;

ALTER TABLE item_labor_phase DROP CONSTRAINT IF EXISTS item_labor_phase_pkey;

ALTER TABLE item_labor_phase
  ADD PRIMARY KEY (item_id, labor_phase_id);

-- ─── 4. spec_def — drop commercial_axis ──────────────────────────────────────

ALTER TABLE spec_def DROP COLUMN IF EXISTS commercial_axis;

COMMIT;

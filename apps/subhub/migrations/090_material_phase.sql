-- SubHub: item + job_line material_phase_id (task 61 MP1–MP2).
-- Prerequisite: 089 applied.

BEGIN;

ALTER TABLE item
  ADD COLUMN IF NOT EXISTS material_phase_id TEXT
  REFERENCES labor_phase (id) ON DELETE SET NULL;

COMMENT ON COLUMN item.material_phase_id IS
  'Nullable FK → labor_phase — default phase whose work consumes this leaf item''s material (task 61 MP1). Overridable per line via job_line.material_phase_id.';

ALTER TABLE job_line
  ADD COLUMN IF NOT EXISTS material_phase_id TEXT
  REFERENCES labor_phase (id) ON DELETE SET NULL;

COMMENT ON COLUMN job_line.material_phase_id IS
  'Nullable FK → labor_phase — per-line override of item.material_phase_id (task 61 MP2). Resolution: this → item default → line''s earliest scope_phase by sequence.';

CREATE INDEX IF NOT EXISTS item_material_phase_id_idx
  ON item (material_phase_id)
  WHERE material_phase_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS job_line_material_phase_id_idx
  ON job_line (material_phase_id)
  WHERE material_phase_id IS NOT NULL;

-- Codegen DDL anchor — no-op at apply time (columns added above).
CREATE TABLE IF NOT EXISTS item (
  id                      TEXT PRIMARY KEY,
  name                    TEXT NOT NULL,
  parent_id               TEXT,
  node_type               TEXT NOT NULL DEFAULT 'category',
  sort_order              INTEGER NOT NULL DEFAULT 0,
  csi_code                TEXT,
  freight_rate_type_id    TEXT,
  incidental_rate_type_id TEXT,
  markup_type_id          TEXT,
  fallback_unit_cost      NUMERIC NOT NULL DEFAULT 0,
  material_phase_id       TEXT
);

CREATE TABLE IF NOT EXISTS job_line (
  id                TEXT PRIMARY KEY,
  material_phase_id TEXT
);

COMMIT;

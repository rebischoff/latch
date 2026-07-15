-- SubHub: job_line_cost_revision + material_receipt_line.unit_cost (task 45).
-- Also creates change_order / job_line_part / scope_phase when missing so CO approve
-- reconciliation (C4–C6) and scope-phase seed have a home before waves 5d / procurement.
-- Prerequisite: 074 applied.

BEGIN;

-- ── Re-budget trail (task 45 C3) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_line_cost_revision (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_line_id         TEXT NOT NULL REFERENCES job_line (id) ON DELETE CASCADE,
  previous_unit_cost  NUMERIC NOT NULL,
  new_unit_cost       NUMERIC NOT NULL,
  reason              TEXT NOT NULL DEFAULT '',
  revised_by          TEXT,
  revised_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT job_line_cost_revision_reason_check CHECK (length(btrim(reason)) > 0)
);

CREATE INDEX IF NOT EXISTS job_line_cost_revision_line_at_idx
  ON job_line_cost_revision (job_line_id, revised_at);

COMMENT ON TABLE job_line_cost_revision IS
  'Internal re-budget of job_line.unit_cost — distinct from change_order (task 45).';

-- ── Change order ledger (needed for approve reconciliation; Surfaces = 5d) ───

CREATE TABLE IF NOT EXISTS change_order (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_id       TEXT NOT NULL REFERENCES job (id) ON DELETE CASCADE,
  estimate_id  TEXT REFERENCES estimate (id) ON DELETE SET NULL,
  title        TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'draft',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT change_order_status_check CHECK (status IN ('draft', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS change_order_job_id_idx ON change_order (job_id);

CREATE TABLE IF NOT EXISTS change_order_line (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  change_order_id     TEXT NOT NULL REFERENCES change_order (id) ON DELETE CASCADE,
  line_number         INTEGER NOT NULL,
  line_action         TEXT NOT NULL DEFAULT 'add',
  target_job_line_id  TEXT REFERENCES job_line (id) ON DELETE SET NULL,
  description         TEXT NOT NULL DEFAULT '',
  quantity            NUMERIC NOT NULL DEFAULT 1,
  unit                TEXT NOT NULL DEFAULT 'ea',
  unit_price          NUMERIC NOT NULL DEFAULT 0,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT change_order_line_number_unique UNIQUE (change_order_id, line_number),
  CONSTRAINT change_order_line_action_check CHECK (line_action IN ('add', 'deduct', 'revise'))
);

CREATE INDEX IF NOT EXISTS change_order_line_co_id_idx ON change_order_line (change_order_id);

-- ── Engineering BOM (seed / void on CO approve) ──────────────────────────────

CREATE TABLE IF NOT EXISTS job_line_part (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_line_id     TEXT NOT NULL REFERENCES job_line (id) ON DELETE CASCADE,
  part_id         TEXT NOT NULL,
  vendor_part_id  TEXT,
  site_area_id    TEXT,
  site_asset_id   TEXT,
  description     TEXT NOT NULL DEFAULT '',
  quantity        NUMERIC NOT NULL DEFAULT 1,
  unit            TEXT NOT NULL DEFAULT 'ea',
  unit_cost       NUMERIC NOT NULL DEFAULT 0,
  sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS job_line_part_job_line_id_idx ON job_line_part (job_line_id);

DO $$
BEGIN
  IF to_regclass('public.manufacturer_part') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'job_line_part_part_id_fkey'
     ) THEN
    ALTER TABLE job_line_part
      ADD CONSTRAINT job_line_part_part_id_fkey
      FOREIGN KEY (part_id) REFERENCES manufacturer_part (id) ON DELETE RESTRICT;
  END IF;
END
$$;

-- ── Field progress phases (seed / carry-forward on CO approve) ───────────────

CREATE TABLE IF NOT EXISTS scope_phase (
  id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_line_id             TEXT NOT NULL REFERENCES job_line (id) ON DELETE CASCADE,
  labor_phase_id          TEXT,
  name                    TEXT NOT NULL,
  sequence                INTEGER NOT NULL,
  planned_qty             NUMERIC NOT NULL DEFAULT 0,
  completed_qty           NUMERIC NOT NULL DEFAULT 0,
  progress_weight         NUMERIC NOT NULL DEFAULT 1,
  billing_weight          NUMERIC NOT NULL DEFAULT 1,
  requires_previous_phase BOOLEAN NOT NULL DEFAULT false,
  target_date             DATE,
  sort_order              INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS scope_phase_job_line_id_idx ON scope_phase (job_line_id);

DO $$
BEGIN
  IF to_regclass('public.labor_phase') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'scope_phase_labor_phase_id_fkey'
     ) THEN
    ALTER TABLE scope_phase
      ADD CONSTRAINT scope_phase_labor_phase_id_fkey
      FOREIGN KEY (labor_phase_id) REFERENCES labor_phase (id) ON DELETE RESTRICT;
  END IF;
END
$$;

-- ── Material actual cost (task 45 C2) — column only when receipt table exists ─

DO $$
BEGIN
  IF to_regclass('public.material_receipt_line') IS NOT NULL THEN
    ALTER TABLE material_receipt_line
      ADD COLUMN IF NOT EXISTS unit_cost NUMERIC NOT NULL DEFAULT 0;

    -- Prefer PO line cost when linked; else leave 0 (known inaccurate for history).
    IF to_regclass('public.purchase_order_line') IS NOT NULL THEN
      EXECUTE $sql$
        UPDATE material_receipt_line mrl
        SET unit_cost = pol.unit_cost
        FROM purchase_order_line pol
        WHERE mrl.purchase_order_line_id = pol.id
          AND mrl.unit_cost = 0
          AND pol.unit_cost IS NOT NULL
      $sql$;
    END IF;

    COMMENT ON COLUMN material_receipt_line.unit_cost IS
      'Material actual cost snapshotted at receive — feeds job actual(material) rollup (task 45).';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      job_line_cost_revision,
      change_order,
      change_order_line,
      job_line_part,
      scope_phase
    TO latch_app;
  END IF;
END
$$;

COMMIT;

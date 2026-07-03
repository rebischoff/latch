-- SubHub business: category-only scope model (task 37a / migration 033).
-- BREAKING — replaces catalog `system`, renames site geography + estimate scope
-- tables to category-root model. Big-bang; no backward compatibility.
-- Plan: docs/migrations/033-category-scope-plan.md
-- Prerequisite: 028–032 applied.

BEGIN;

-- ─── 0. Prerequisite stubs (category / item not in 001–032 migrations) ───────

CREATE TABLE IF NOT EXISTS category (
  id                          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name                        TEXT NOT NULL,
  parent_id                   TEXT REFERENCES category (id) ON DELETE SET NULL,
  csi_code                    TEXT,
  sort_order                  INTEGER NOT NULL DEFAULT 0,
  default_phase_template_id   TEXT REFERENCES phase_template (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS category_parent_id_idx ON category (parent_id);

CREATE TABLE IF NOT EXISTS item (
  id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name                    TEXT NOT NULL,
  description             TEXT NOT NULL DEFAULT '',
  kind                    TEXT NOT NULL DEFAULT 'product',
  category_id             TEXT,
  labor_class_id          TEXT,
  default_part_id         TEXT REFERENCES manufacturer_part (id) ON DELETE SET NULL,
  default_vendor_part_id  TEXT,
  phase_template_id       TEXT REFERENCES phase_template (id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 1. Extend category (scope roots + nested nodes) ─────────────────────────

ALTER TABLE category
  ADD COLUMN IF NOT EXISTS default_phase_template_id TEXT
    REFERENCES phase_template (id) ON DELETE SET NULL;

-- Roots = parent_id IS NULL. Preserve system.id when migrating roots.

INSERT INTO category (id, name, parent_id, sort_order, default_phase_template_id)
SELECT s.id, s.name, NULL, s.sort_order, s.default_phase_template_id
FROM system s
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      sort_order = EXCLUDED.sort_order,
      default_phase_template_id = EXCLUDED.default_phase_template_id,
      parent_id = NULL;

-- ─── 2. Spec defs — system → root category namespace ───────────────────────

ALTER TABLE system_spec_def RENAME TO spec_def;

ALTER TABLE spec_def RENAME COLUMN system_id TO root_category_id;

ALTER TABLE spec_def
  DROP CONSTRAINT IF EXISTS system_spec_def_system_id_fkey;

ALTER TABLE spec_def
  ADD CONSTRAINT spec_def_root_category_id_fkey
  FOREIGN KEY (root_category_id) REFERENCES category (id) ON DELETE CASCADE;

ALTER INDEX IF EXISTS system_spec_def_system_id_idx RENAME TO spec_def_root_category_id_idx;

ALTER TABLE system_spec_option RENAME TO spec_option;

ALTER TABLE spec_option
  RENAME COLUMN system_spec_def_id TO spec_def_id;

ALTER INDEX IF EXISTS system_spec_option_system_spec_def_id_idx
  RENAME TO spec_option_spec_def_id_idx;

ALTER TABLE manufacturer_part_spec
  RENAME COLUMN system_spec_def_id TO spec_def_id;

ALTER TABLE manufacturer_part_spec
  RENAME COLUMN system_spec_option_id TO spec_option_id;

ALTER INDEX IF EXISTS manufacturer_part_spec_def_id_idx
  RENAME TO manufacturer_part_spec_spec_def_id_idx;

-- ─── 3. Category ↔ spec participation + catalog M:N ────────────────────────

CREATE TABLE category_spec_def (
  category_id   TEXT NOT NULL REFERENCES category (id) ON DELETE CASCADE,
  spec_def_id   UUID NOT NULL REFERENCES spec_def (id) ON DELETE CASCADE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (category_id, spec_def_id)
);

CREATE TABLE item_category (
  item_id       TEXT NOT NULL REFERENCES item (id) ON DELETE CASCADE,
  category_id   TEXT NOT NULL REFERENCES category (id) ON DELETE CASCADE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, category_id)
);

CREATE TABLE part_category (
  part_id       TEXT NOT NULL REFERENCES manufacturer_part (id) ON DELETE CASCADE,
  category_id   TEXT NOT NULL REFERENCES category (id) ON DELETE CASCADE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (part_id, category_id)
);

INSERT INTO item_category (item_id, category_id, sort_order)
SELECT i.id, i.category_id, 0
FROM item i
WHERE i.category_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- item.category_id kept nullable for v1; prefer item_category in new code.

-- ─── 4. Site — site_system → site_scope, site_area → site_zone ─────────────

ALTER TABLE site_system RENAME TO site_scope;

ALTER TABLE site_scope RENAME COLUMN system_id TO root_category_id;

ALTER TABLE site_scope
  DROP CONSTRAINT IF EXISTS site_system_system_id_fkey;

ALTER TABLE site_scope
  ADD CONSTRAINT site_scope_root_category_id_fkey
  FOREIGN KEY (root_category_id) REFERENCES category (id) ON DELETE RESTRICT;

ALTER INDEX IF EXISTS site_system_site_id_idx RENAME TO site_scope_site_id_idx;

ALTER TABLE site_area RENAME TO site_zone;

ALTER TABLE site_zone RENAME COLUMN site_system_id TO site_scope_id;
ALTER TABLE site_zone RENAME COLUMN parent_area_id TO parent_zone_id;

ALTER TABLE site_asset RENAME COLUMN site_system_id TO site_scope_id;
ALTER TABLE site_asset RENAME COLUMN site_area_id TO site_zone_id;

-- ─── 5. Estimate scope ───────────────────────────────────────────────────────

ALTER TABLE estimate_system RENAME TO estimate_scope;

ALTER TABLE estimate_scope RENAME COLUMN system_id TO root_category_id;
ALTER TABLE estimate_scope RENAME COLUMN site_system_id TO site_scope_id;

ALTER TABLE estimate_scope
  DROP CONSTRAINT IF EXISTS estimate_system_system_id_fkey;

ALTER TABLE estimate_scope
  ADD CONSTRAINT estimate_scope_root_category_id_fkey
  FOREIGN KEY (root_category_id) REFERENCES category (id) ON DELETE RESTRICT;

ALTER INDEX IF EXISTS estimate_system_estimate_id_idx
  RENAME TO estimate_scope_estimate_id_idx;

ALTER TABLE estimate_system_spec RENAME TO estimate_scope_spec;

ALTER TABLE estimate_scope_spec
  RENAME COLUMN estimate_system_id TO estimate_scope_id;

ALTER TABLE estimate_scope_spec
  RENAME COLUMN system_spec_def_id TO spec_def_id;

ALTER TABLE estimate_scope_spec
  RENAME COLUMN system_spec_option_id TO spec_option_id;

ALTER INDEX IF EXISTS estimate_system_spec_estimate_system_id_idx
  RENAME TO estimate_scope_spec_estimate_scope_id_idx;

ALTER TABLE estimate_area_spec RENAME TO estimate_zone_spec;

ALTER TABLE estimate_zone_spec
  RENAME COLUMN estimate_system_id TO estimate_scope_id;

ALTER TABLE estimate_zone_spec
  RENAME COLUMN site_area_id TO site_zone_id;

ALTER TABLE estimate_zone_spec
  RENAME COLUMN system_spec_def_id TO spec_def_id;

ALTER TABLE estimate_zone_spec
  RENAME COLUMN system_spec_option_id TO spec_option_id;

ALTER INDEX IF EXISTS estimate_area_spec_estimate_system_id_idx
  RENAME TO estimate_zone_spec_estimate_scope_id_idx;

ALTER TABLE estimate_line_spec
  RENAME COLUMN system_spec_def_id TO spec_def_id;

ALTER TABLE estimate_line_spec
  RENAME COLUMN system_spec_option_id TO spec_option_id;

ALTER TABLE estimate_line
  RENAME COLUMN estimate_system_id TO estimate_scope_id;

ALTER TABLE estimate_line
  RENAME COLUMN site_area_id TO site_zone_id;

ALTER INDEX IF EXISTS estimate_line_estimate_system_id_idx
  RENAME TO estimate_line_estimate_scope_id_idx;

ALTER TABLE estimate_line
  ADD COLUMN IF NOT EXISTS unit_material NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_labor NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_incidental NUMERIC NOT NULL DEFAULT 0;

-- ─── 6. Job line geography FK column rename ──────────────────────────────────

ALTER TABLE job_line
  RENAME COLUMN site_area_id TO site_zone_id;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'job_scope_group') THEN
    ALTER TABLE job_scope_group RENAME COLUMN system_id TO root_category_id;
    ALTER TABLE job_scope_group RENAME COLUMN site_system_id TO site_scope_id;
    ALTER TABLE job_scope_group RENAME COLUMN site_area_id TO site_zone_id;
  END IF;
END
$$;

-- ─── 7. Commercial type catalog (DDL only — surfaces in 37g) ─────────────────

CREATE TABLE labor_context_type (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE labor_rate_type (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name            TEXT NOT NULL,
  rate_cents      INTEGER NOT NULL DEFAULT 0,
  labor_class_id  TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE incidental_rate_type (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name          TEXT NOT NULL,
  amount_cents  INTEGER NOT NULL DEFAULT 0,
  unit          TEXT NOT NULL DEFAULT 'ea',
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE markup_type (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name            TEXT NOT NULL,
  markup_percent  NUMERIC NOT NULL DEFAULT 0,
  sort_order      INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE estimate_scope
  ADD COLUMN labor_context_type_id TEXT REFERENCES labor_context_type (id) ON DELETE SET NULL,
  ADD COLUMN markup_type_id TEXT REFERENCES markup_type (id) ON DELETE SET NULL;

-- ─── 8. Drop retired catalog table ───────────────────────────────────────────

DROP TABLE system;

-- trade table retained (job/labor TBD); not used on scope path v1.

-- ─── 9. Grants ───────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      category,
      item,
      category_spec_def,
      item_category,
      part_category,
      labor_context_type,
      labor_rate_type,
      incidental_rate_type,
      markup_type
    TO latch_app;
  END IF;
END
$$;

COMMIT;

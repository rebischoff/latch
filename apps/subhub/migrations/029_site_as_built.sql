-- SubHub business: site as-built backbone (task 31 batch B / estimate backbone).
-- BREAKING — replaces site_section / site_location with site_system / site_area /
-- site_asset, backfills legacy rows, retargets estimate_line / job_line geography
-- FKs, then drops the legacy tables. Must run after 028 (site_system.system_id).

BEGIN;

-- ─── New as-built tables ─────────────────────────────────────────────────────

CREATE TABLE site_system (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  site_id     TEXT NOT NULL REFERENCES site (id) ON DELETE CASCADE,
  system_id   TEXT NOT NULL REFERENCES system (id) ON DELETE RESTRICT,
  name        TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'proposed',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT site_system_status_check CHECK (
    status IN ('proposed', 'active', 'removed', 'cancelled')
  )
);

CREATE INDEX site_system_site_id_idx ON site_system (site_id);

CREATE TABLE site_area (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  site_id         TEXT NOT NULL REFERENCES site (id) ON DELETE CASCADE,
  site_system_id  TEXT REFERENCES site_system (id) ON DELETE SET NULL,
  parent_area_id  TEXT REFERENCES site_area (id) ON DELETE SET NULL,
  area_type       TEXT NOT NULL DEFAULT '',
  name            TEXT NOT NULL DEFAULT '',
  code            TEXT NOT NULL DEFAULT '',
  sort_order      INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'proposed',
  CONSTRAINT site_area_status_check CHECK (
    status IN ('proposed', 'active', 'removed', 'cancelled')
  )
);

CREATE INDEX site_area_site_id_idx ON site_area (site_id);

CREATE TABLE site_asset (
  id                          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  site_id                     TEXT NOT NULL REFERENCES site (id) ON DELETE CASCADE,
  site_system_id              TEXT REFERENCES site_system (id) ON DELETE SET NULL,
  site_area_id                TEXT REFERENCES site_area (id) ON DELETE SET NULL,
  asset_type                  TEXT NOT NULL DEFAULT '',
  tag_label                   TEXT NOT NULL DEFAULT '',
  part_id                     TEXT REFERENCES manufacturer_part (id) ON DELETE SET NULL,
  manufacturer                TEXT NOT NULL DEFAULT '',
  model                       TEXT NOT NULL DEFAULT '',
  serial_number               TEXT NOT NULL DEFAULT '',
  sort_order                  INTEGER NOT NULL DEFAULT 0,
  status                      TEXT NOT NULL DEFAULT 'planned',
  replaced_by_site_asset_id   TEXT REFERENCES site_asset (id) ON DELETE SET NULL,
  serviceable                 BOOLEAN NOT NULL DEFAULT true,
  installed_by_job_id         TEXT REFERENCES job (id) ON DELETE SET NULL,
  CONSTRAINT site_asset_status_check CHECK (
    status IN ('planned', 'installed', 'active', 'removed', 'replaced')
  )
);

CREATE INDEX site_asset_site_id_idx ON site_asset (site_id);
CREATE INDEX site_asset_site_area_id_idx ON site_asset (site_area_id);

-- ─── Backfill legacy → backbone (S1: every legacy location → an asset row) ────
-- Pre-assign ids so legacy → new mappings survive across the line FK retarget.

CREATE TEMP TABLE section_area_map (section_id TEXT PRIMARY KEY, area_id TEXT NOT NULL)
  ON COMMIT DROP;
INSERT INTO section_area_map (section_id, area_id)
SELECT id, gen_random_uuid()::text FROM site_section;

CREATE TEMP TABLE location_asset_map (location_id TEXT PRIMARY KEY, asset_id TEXT NOT NULL)
  ON COMMIT DROP;
INSERT INTO location_asset_map (location_id, asset_id)
SELECT id, gen_random_uuid()::text FROM site_location;

INSERT INTO site_area (id, site_id, site_system_id, parent_area_id, area_type, name, code, sort_order, status)
SELECT m.area_id, s.site_id, NULL, NULL, '', s.title, '', s.sort_order, s.status
FROM site_section s
INNER JOIN section_area_map m ON m.section_id = s.id;

INSERT INTO site_asset (
  id, site_id, site_system_id, site_area_id, asset_type, tag_label,
  part_id, manufacturer, model, serial_number, sort_order, status, serviceable
)
SELECT
  m.asset_id,
  l.site_id,
  NULL,
  sam.area_id,
  '',
  l.label,
  NULL, '', '', '',
  l.sort_order,
  CASE l.status
    WHEN 'proposed'  THEN 'planned'
    WHEN 'active'    THEN 'active'
    WHEN 'relocated' THEN 'replaced'
    WHEN 'removed'   THEN 'removed'
    WHEN 'cancelled' THEN 'removed'
    ELSE 'planned'
  END,
  true
FROM site_location l
INNER JOIN location_asset_map m ON m.location_id = l.id
LEFT JOIN section_area_map sam ON sam.section_id = l.site_section_id;

-- Remap the replacement chain after all asset rows exist.
UPDATE site_asset a
SET replaced_by_site_asset_id = ram.asset_id
FROM site_location l
INNER JOIN location_asset_map m ON m.location_id = l.id
INNER JOIN location_asset_map ram ON ram.location_id = l.replaced_by_site_location_id
WHERE a.id = m.asset_id;

-- ─── Line FK retarget (estimate_line + job_line) ─────────────────────────────

ALTER TABLE estimate_line ADD COLUMN site_area_id TEXT REFERENCES site_area (id) ON DELETE SET NULL;
ALTER TABLE estimate_line ADD COLUMN site_asset_id TEXT REFERENCES site_asset (id) ON DELETE SET NULL;

UPDATE estimate_line el
SET site_asset_id = lam.asset_id
FROM location_asset_map lam
WHERE el.site_location_id = lam.location_id;

UPDATE estimate_line el
SET site_area_id = sa.site_area_id
FROM site_asset sa
WHERE el.site_asset_id = sa.id;

ALTER TABLE estimate_line DROP COLUMN site_location_id;

ALTER TABLE job_line ADD COLUMN site_area_id TEXT REFERENCES site_area (id) ON DELETE SET NULL;
ALTER TABLE job_line ADD COLUMN site_asset_id TEXT REFERENCES site_asset (id) ON DELETE SET NULL;

UPDATE job_line jl
SET site_asset_id = lam.asset_id
FROM location_asset_map lam
WHERE jl.site_location_id = lam.location_id;

UPDATE job_line jl
SET site_area_id = sa.site_area_id
FROM site_asset sa
WHERE jl.site_asset_id = sa.id;

ALTER TABLE job_line DROP COLUMN site_location_id;

-- ─── Drop legacy geography ───────────────────────────────────────────────────

DROP TABLE site_location;
DROP TABLE site_section;

-- Align polymorphic note allowlist with the rename.
ALTER TABLE note DROP CONSTRAINT note_entity_type_check;
ALTER TABLE note ADD CONSTRAINT note_entity_type_check CHECK (
  entity_type IN (
    'party',
    'site',
    'site_area',
    'site_asset',
    'estimate',
    'job',
    'requested_order',
    'purchase_order',
    'material_receipt',
    'invoice',
    'change_order'
  )
);

-- ─── Audit note (row counts migrated) ────────────────────────────────────────

DO $$
DECLARE
  area_count  BIGINT;
  asset_count BIGINT;
BEGIN
  SELECT count(*) INTO area_count FROM site_area;
  SELECT count(*) INTO asset_count FROM site_asset;
  RAISE NOTICE 'site as-built backfill: % area rows, % asset rows migrated', area_count, asset_count;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      site_system,
      site_area,
      site_asset
    TO latch_app;
  END IF;
END
$$;

COMMIT;

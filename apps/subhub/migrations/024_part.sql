-- SubHub business: part catalog slice (task 24 / wave 3a).
-- DDL only — manufacturer_part + vendor_part; estimate_line / job_line FK ALTERs deferred to 3e / 4d′.

BEGIN;

CREATE TABLE manufacturer_part (
  id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  manufacturer_party_id   TEXT NOT NULL REFERENCES party (id) ON DELETE RESTRICT,
  mpn                     TEXT NOT NULL,
  description             TEXT NOT NULL DEFAULT '',
  specs                   TEXT NOT NULL DEFAULT '',
  unit                    TEXT NOT NULL DEFAULT 'ea',
  purchase_unit           TEXT,
  units_per_purchase      NUMERIC NOT NULL DEFAULT 1,
  cut_sheet_url           TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT manufacturer_part_mpn_unique UNIQUE (manufacturer_party_id, mpn)
);

CREATE INDEX manufacturer_part_manufacturer_party_id_idx ON manufacturer_part (manufacturer_party_id);

CREATE TABLE vendor_part (
  id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vendor_party_id         TEXT NOT NULL REFERENCES party (id) ON DELETE CASCADE,
  manufacturer_part_id    TEXT NOT NULL REFERENCES manufacturer_part (id) ON DELETE CASCADE,
  vendor_pn               TEXT NOT NULL,
  vendor_description      TEXT NOT NULL DEFAULT '',
  unit_price              NUMERIC NOT NULL,
  currency                TEXT NOT NULL DEFAULT 'USD',
  is_preferred            BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT vendor_part_vendor_pn_unique UNIQUE (vendor_party_id, vendor_pn)
);

CREATE INDEX vendor_part_vendor_party_id_idx ON vendor_part (vendor_party_id);
CREATE INDEX vendor_part_manufacturer_part_id_idx ON vendor_part (manufacturer_part_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      manufacturer_part,
      vendor_part
    TO latch_app;
  END IF;
END
$$;

COMMIT;

-- SubHub business: postal address, site geography, standing contacts (task 20 / wave 1).
-- DDL only — no business INSERTs; relation catalog seed is 020.

BEGIN;

CREATE TABLE address (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  label         TEXT NOT NULL DEFAULT '',
  line1         TEXT NOT NULL DEFAULT '',
  line2         TEXT NOT NULL DEFAULT '',
  city          TEXT NOT NULL DEFAULT '',
  state         TEXT NOT NULL DEFAULT '',
  postal_code   TEXT NOT NULL DEFAULT '',
  country       TEXT NOT NULL DEFAULT 'US',
  lat           NUMERIC,
  lng           NUMERIC,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE site (
  id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name                    TEXT NOT NULL,
  customer_party_id       TEXT REFERENCES party (id) ON DELETE SET NULL,
  property_owner_party_id TEXT REFERENCES party (id) ON DELETE SET NULL,
  parent_site_id          TEXT REFERENCES site (id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX site_customer_party_id_idx ON site (customer_party_id);
CREATE INDEX site_property_owner_party_id_idx ON site (property_owner_party_id);
CREATE INDEX site_parent_site_id_idx ON site (parent_site_id);

CREATE TABLE site_section (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  site_id     TEXT NOT NULL REFERENCES site (id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'proposed',
  CONSTRAINT site_section_status_check CHECK (
    status IN ('proposed', 'active', 'removed', 'cancelled')
  )
);

CREATE INDEX site_section_site_id_idx ON site_section (site_id);

CREATE TABLE site_location (
  id                            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  site_id                       TEXT NOT NULL REFERENCES site (id) ON DELETE CASCADE,
  site_section_id               TEXT REFERENCES site_section (id) ON DELETE SET NULL,
  label                         TEXT NOT NULL DEFAULT '',
  sort_order                    INTEGER NOT NULL DEFAULT 0,
  status                        TEXT NOT NULL DEFAULT 'proposed',
  replaced_by_site_location_id  TEXT REFERENCES site_location (id) ON DELETE SET NULL,
  CONSTRAINT site_location_status_check CHECK (
    status IN ('proposed', 'active', 'relocated', 'removed', 'cancelled')
  )
);

CREATE INDEX site_location_site_id_idx ON site_location (site_id);

CREATE TABLE party_address (
  party_id    TEXT NOT NULL REFERENCES party (id) ON DELETE CASCADE,
  address_id  TEXT NOT NULL REFERENCES address (id) ON DELETE CASCADE,
  purpose     TEXT NOT NULL,
  PRIMARY KEY (party_id, address_id, purpose),
  CONSTRAINT party_address_purpose_check CHECK (
    purpose IN ('billing', 'remit_to', 'hq', 'mailing', 'other')
  )
);

CREATE TABLE site_contact_relation (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  display_name  TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT site_contact_relation_display_name_unique UNIQUE (display_name)
);

CREATE TABLE site_contact (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  site_id       TEXT NOT NULL REFERENCES site (id) ON DELETE CASCADE,
  party_id      TEXT NOT NULL REFERENCES party (id) ON DELETE CASCADE,
  relation_id   TEXT NOT NULL REFERENCES site_contact_relation (id) ON DELETE RESTRICT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT site_contact_site_party_relation_unique UNIQUE (site_id, party_id, relation_id)
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      address,
      site,
      site_section,
      site_location,
      party_address,
      site_contact_relation,
      site_contact
    TO latch_app;
  END IF;
END
$$;

COMMIT;

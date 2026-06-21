-- SubHub business: party kind extensions + polymorphic notes (task 20 / wave 1).
-- Backfill from 016_party; retarget employee → party_person; drop inline party.notes.

BEGIN;

CREATE TABLE party_person (
  party_id        TEXT PRIMARY KEY REFERENCES party (id) ON DELETE CASCADE,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL DEFAULT '',
  nick_name       TEXT,
  display_name    TEXT,
  avatar_url      TEXT,
  latch_user_id   TEXT UNIQUE REFERENCES latch_users (id) ON DELETE SET NULL
);

CREATE TABLE party_organization (
  party_id          TEXT PRIMARY KEY REFERENCES party (id) ON DELETE CASCADE,
  parent_party_id   TEXT REFERENCES party (id) ON DELETE SET NULL,
  dba_name          TEXT
);

CREATE INDEX party_organization_parent_party_id_idx
  ON party_organization (parent_party_id);

CREATE TABLE note (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  entity_type   TEXT NOT NULL,
  entity_id     TEXT NOT NULL,
  body          TEXT NOT NULL DEFAULT '',
  format        TEXT NOT NULL DEFAULT 'plain',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT note_entity_type_check CHECK (
    entity_type IN (
      'party',
      'site',
      'site_section',
      'site_location',
      'estimate',
      'job',
      'requested_order',
      'purchase_order',
      'material_receipt',
      'invoice',
      'change_order'
    )
  ),
  CONSTRAINT note_format_check CHECK (format IN ('plain', 'rich'))
);

CREATE INDEX note_entity_sort_idx ON note (entity_type, entity_id, sort_order);

-- Backfill kind extensions from shipped 016 rows.
INSERT INTO party_person (party_id, first_name, last_name)
SELECT p.id, p.display_name, ''
FROM party p
WHERE p.kind = 'person';

INSERT INTO party_organization (party_id, dba_name)
SELECT
  p.id,
  CASE
    WHEN p.legal_name IS NOT NULL AND p.display_name <> p.legal_name THEN p.display_name
    ELSE NULL
  END
FROM party p
WHERE p.kind = 'organization';

INSERT INTO note (entity_type, entity_id, body)
SELECT 'party', p.id, p.notes
FROM party p
WHERE p.notes IS NOT NULL AND btrim(p.notes) <> '';

-- Move login link from employee to party_person before retargeting employee FK.
UPDATE party_person pp
SET latch_user_id = e.latch_user_id
FROM employee e
WHERE e.party_id = pp.party_id
  AND e.latch_user_id IS NOT NULL;

ALTER TABLE employee DROP CONSTRAINT employee_party_id_fkey;
ALTER TABLE employee DROP COLUMN latch_user_id;
ALTER TABLE employee
  ADD CONSTRAINT employee_party_id_fkey
  FOREIGN KEY (party_id) REFERENCES party_person (party_id) ON DELETE CASCADE;

ALTER TABLE party DROP COLUMN notes;

ALTER TABLE party_role DROP CONSTRAINT party_role_role_check;
ALTER TABLE party_role
  ADD CONSTRAINT party_role_role_check CHECK (
    role IN (
      'customer',
      'vendor',
      'manufacturer',
      'employee',
      'property_owner',
      'other'
    )
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      party_person,
      party_organization,
      note
    TO latch_app;
  END IF;
END
$$;

COMMIT;

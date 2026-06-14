-- SubHub business: party spine + employee link (task 10).
-- Platform migrations occupy 014–015; business DDL starts at 016.

BEGIN;

CREATE TABLE party (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  kind          TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  legal_name    TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT party_kind_check CHECK (kind IN ('person', 'organization'))
);

CREATE TABLE party_role (
  party_id  TEXT NOT NULL REFERENCES party (id) ON DELETE CASCADE,
  role      TEXT NOT NULL,
  PRIMARY KEY (party_id, role),
  CONSTRAINT party_role_role_check CHECK (
    role IN ('customer', 'vendor', 'manufacturer', 'employee')
  )
);

CREATE TABLE party_phone (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  party_id    TEXT NOT NULL REFERENCES party (id) ON DELETE CASCADE,
  label       TEXT NOT NULL DEFAULT '',
  number      TEXT NOT NULL,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX party_phone_party_id_sort_idx ON party_phone (party_id, sort_order);

CREATE TABLE party_email (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  party_id    TEXT NOT NULL REFERENCES party (id) ON DELETE CASCADE,
  label       TEXT NOT NULL DEFAULT '',
  address     TEXT NOT NULL,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX party_email_party_id_sort_idx ON party_email (party_id, sort_order);

CREATE TABLE employee (
  party_id        TEXT PRIMARY KEY REFERENCES party (id) ON DELETE CASCADE,
  latch_user_id   TEXT UNIQUE REFERENCES latch_users (id) ON DELETE SET NULL
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      party,
      party_role,
      party_phone,
      party_email,
      employee
    TO latch_app;
  END IF;
END
$$;

COMMIT;

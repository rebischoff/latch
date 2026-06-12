-- Business tables for job_list / job_detail surfaces (codegen DDL cross-check + future Postgres store).

BEGIN;

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  billing_notes TEXT
);

CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  description TEXT,
  contract_amount TEXT,
  customer_id TEXT NOT NULL REFERENCES customers (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assignments (
  job_id TEXT NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES latch_users (id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, user_id)
);

COMMIT;

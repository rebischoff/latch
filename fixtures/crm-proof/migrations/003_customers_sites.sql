-- Phase 02 task 04: customers, sites, jobs.customer_id
--
-- Apply after 001_init.sql (and 002 if needed):
--   psql "$DATABASE_URL" -f apps/crm/migrations/003_customers_sites.sql
--   # or from repo root when DATABASE_URL is in apps/crm/.env.local:
--   npm run db:migrate   # 001 only; apply 003 via psql as above
--
-- Inserts pilot seed rows (same ids as apps/crm/db/seed.ts) for manual QA.

BEGIN;

CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  billing_notes TEXT
);

CREATE TABLE sites (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  label TEXT NOT NULL
);

INSERT INTO customers (id, name, phone, billing_notes) VALUES
  ('seed-customer-acme', 'Acme Electric', '555-0100', 'Net 30; PO required on invoices over $5k.'),
  ('seed-customer-oak', 'Oak Properties', '555-0200', 'Send statements to property mgmt portal.');

INSERT INTO sites (id, customer_id, label) VALUES
  ('seed-site-acme-main', 'seed-customer-acme', '123 Main St'),
  ('seed-site-oak-ave', 'seed-customer-oak', '456 Oak Ave');

ALTER TABLE jobs
  ADD COLUMN customer_id TEXT REFERENCES customers (id);

UPDATE jobs SET customer_id = 'seed-customer-acme' WHERE id = 'seed-job-owned';
UPDATE jobs SET customer_id = 'seed-customer-oak' WHERE id = 'seed-job-other';

ALTER TABLE jobs
  ALTER COLUMN customer_id SET NOT NULL;

COMMIT;

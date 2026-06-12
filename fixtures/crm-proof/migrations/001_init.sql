-- Latch pilot schema (Step 3 job_detail)
--
-- Apply on Neon (optional; tests use MemoryJobStore):
--   npm run db:migrate
--   # or: psql "$DATABASE_URL" -f apps/crm/migrations/001_init.sql
--
-- DATABASE_URL: Neon direct connection from apps/crm/.env.local

BEGIN;

CREATE TABLE latch_users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  description TEXT,
  contract_amount NUMERIC(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE assignments (
  job_id TEXT NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES latch_users (id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, user_id)
);

CREATE TABLE latch_audit (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  module_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  field_ids TEXT[],
  before JSONB,
  after JSONB,
  patch JSONB,
  request_id TEXT,
  approval_id TEXT
);

-- Append-only audit: deny UPDATE/DELETE (invariant §6).
CREATE OR REPLACE FUNCTION latch_audit_deny_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'latch_audit rows are immutable';
END;
$$;

DROP TRIGGER IF EXISTS latch_audit_no_update ON latch_audit;
DROP TRIGGER IF EXISTS latch_audit_no_delete ON latch_audit;

CREATE TRIGGER latch_audit_no_mutation
  BEFORE UPDATE OR DELETE ON latch_audit
  FOR EACH ROW
  EXECUTE FUNCTION latch_audit_deny_mutation();

-- Decision (task 17, v1 pilot): mutation audit for `jobs` comes from DAL `writeAudit`
-- (apps/crm/src/lib/audit-db-writer.ts when DATABASE_URL is set). No AFTER UPDATE
-- trigger on `jobs` — avoids duplicate rows on the normal app path. Direct SQL
-- bypass remains a Phase 4 hardening item (session-gated trigger or RLS).

COMMIT;

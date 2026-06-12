-- Platform template: append-only audit log (Phase 04).
-- App path: DAL writeAudit → INSERT via @latch/adapter-pg-audit.

BEGIN;

CREATE TABLE IF NOT EXISTS latch_audit (
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

CREATE OR REPLACE FUNCTION latch_audit_deny_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'latch_audit rows are immutable';
END;
$$;

DROP TRIGGER IF EXISTS latch_audit_no_mutation ON latch_audit;

CREATE TRIGGER latch_audit_no_mutation
  BEFORE UPDATE OR DELETE ON latch_audit
  FOR EACH ROW
  EXECUTE FUNCTION latch_audit_deny_mutation();

-- latch_app: INSERT-only on audit (T6 defense in depth).
REVOKE ALL ON TABLE latch_audit FROM latch_app;
GRANT INSERT ON TABLE latch_audit TO latch_app;
GRANT USAGE, SELECT ON SEQUENCE latch_audit_id_seq TO latch_app;

COMMIT;

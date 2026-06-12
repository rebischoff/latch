-- Platform template: verification / approval queue (Phase 05).
-- One open `submitted` row per (surface_id, entity_id) — partial unique index.
-- Terminal rows are immutable at the DAL; app role has no DELETE.

BEGIN;

CREATE TABLE IF NOT EXISTS latch_pending_changes (
  id UUID PRIMARY KEY,
  surface_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  field_ids TEXT[] NOT NULL,
  patch JSONB NOT NULL,
  status TEXT NOT NULL,
  submitted_by TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL,
  decided_by TEXT,
  decided_at TIMESTAMPTZ,
  comment TEXT,
  batch_id UUID,
  supersedes_id UUID REFERENCES latch_pending_changes (id),
  CONSTRAINT latch_pending_changes_status_check CHECK (
    status IN ('submitted', 'accepted', 'rejected', 'withdrawn')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS latch_pending_changes_one_submitted_per_entity
  ON latch_pending_changes (surface_id, entity_id)
  WHERE status = 'submitted';

CREATE INDEX IF NOT EXISTS latch_pending_changes_surface_entity_status_idx
  ON latch_pending_changes (surface_id, entity_id, status);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE ON TABLE latch_pending_changes TO latch_app;
  END IF;
END
$$;

COMMIT;

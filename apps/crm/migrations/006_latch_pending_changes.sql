-- Phase 05 task 04: latch_pending_changes (verification / approval queue)
--
-- Apply after 001–005 (as migration owner):
--   psql "$DATABASE_URL" -f apps/crm/migrations/006_latch_pending_changes.sql
--
-- One open `submitted` row per (surface_id, entity_id) — enforced by partial unique index.
-- Terminal rows are immutable in v1 at the DAL (task 08); app role has no DELETE.

BEGIN;

CREATE TABLE latch_pending_changes (
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

CREATE UNIQUE INDEX latch_pending_changes_one_submitted_per_entity
  ON latch_pending_changes (surface_id, entity_id)
  WHERE status = 'submitted';

CREATE INDEX latch_pending_changes_surface_entity_status_idx
  ON latch_pending_changes (surface_id, entity_id, status);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT, INSERT, UPDATE ON TABLE latch_pending_changes TO latch_app;
  END IF;
END
$$;

COMMIT;

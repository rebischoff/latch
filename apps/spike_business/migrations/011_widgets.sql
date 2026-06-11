-- Business table for scoped row-filter proof (Phase 08 task 04).
-- Nullable scope_id FK → latch_scopes (platform chain 010).

BEGIN;

CREATE TABLE IF NOT EXISTS widgets (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label     TEXT NOT NULL,
  status    TEXT NOT NULL DEFAULT 'open',
  scope_id  UUID REFERENCES latch_scopes (id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE widgets TO latch_app;

COMMIT;

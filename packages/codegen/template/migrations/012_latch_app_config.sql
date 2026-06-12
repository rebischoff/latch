-- Platform template: single-row app config (audit mode + future platform knobs).
-- `audit_mode` is chosen at `latch new --audit-mode` and immutable at runtime.
-- Upgrade-only: recovery → standard → full via operator migration (no UI toggle).

BEGIN;

CREATE TABLE IF NOT EXISTS latch_app_config (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  audit_mode TEXT NOT NULL DEFAULT 'full',
  CONSTRAINT latch_app_config_audit_mode_check CHECK (
    audit_mode IN ('full', 'standard', 'recovery')
  )
);

INSERT INTO latch_app_config (id, audit_mode) VALUES (1, 'full')
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app') THEN
    GRANT SELECT ON TABLE latch_app_config TO latch_app;
  END IF;
END
$$;

COMMIT;

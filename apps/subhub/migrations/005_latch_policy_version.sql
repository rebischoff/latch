-- Platform template: manifest cache invalidation counter (Phase 06).

BEGIN;

CREATE TABLE IF NOT EXISTS latch_policy_version (
  id      SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  version BIGINT NOT NULL DEFAULT 1
);

INSERT INTO latch_policy_version (id, version)
VALUES (1, 1)
ON CONFLICT (id) DO NOTHING;

COMMIT;

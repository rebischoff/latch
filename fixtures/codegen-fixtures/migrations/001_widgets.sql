BEGIN;

CREATE TABLE widgets (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  status TEXT NOT NULL,
  scope_id TEXT NOT NULL
);

COMMIT;

-- Remove soft-delete columns (hard-delete-only model, 2026-05-30).
-- Apply after 001_init.sql if that migration was already applied with deleted_* columns:
--   psql "$DATABASE_URL" -f apps/web/migrations/002_drop_soft_delete_columns.sql

BEGIN;

ALTER TABLE jobs DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE jobs DROP COLUMN IF EXISTS deleted_by;

COMMIT;

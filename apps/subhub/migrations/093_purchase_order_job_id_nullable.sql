-- SubHub: general-bucket purchase orders (task 64 / RP9).
-- `purchase_order.job_id` nullable — NULL = job-less general bucket (overhead,
-- shop-stock, incidentals). Existing job-assigned rows unchanged.
-- Prerequisite: 092 applied.

BEGIN;

ALTER TABLE purchase_order
  ALTER COLUMN job_id DROP NOT NULL;

COMMENT ON COLUMN purchase_order.job_id IS
  'Nullable — NULL = general/job-less bucket (task 64 RP9): overhead, shop-stock, incidentals. Never job-tagged once null; never appears on a job cost report.';

COMMENT ON TABLE purchase_order IS
  'Job-assigned: vendor commitment from the /requisitions pool (task 61–63) — part frozen, qty editable, line deletable, no direct ad-hoc add (RP7–RP8). General bucket (job_id IS NULL, task 64 RP9–RP10): freeform ad-hoc lines; strictly job-less.';

COMMIT;

-- SubHub: job_line dual qty — sold_quantity (contract) + quantity (working) (task 47 / JLI).
-- Prerequisite: 076 applied.

BEGIN;

ALTER TABLE job_line
  ADD COLUMN IF NOT EXISTS sold_quantity NUMERIC NOT NULL DEFAULT 0;

-- Backfill: sold lines keep contract qty = current quantity; engineering $0 lines stay 0.
UPDATE job_line
SET sold_quantity = quantity
WHERE sold_quantity = 0
  AND (sold_unit_price > 0 OR source = 'estimate');

COMMENT ON COLUMN job_line.sold_quantity IS
  'Contract qty frozen at win; Scope-E1 new lines = 0; change → CO (task 47 JLI). Working install qty is `quantity`.';

COMMENT ON COLUMN job_line.quantity IS
  'Working/install qty — editable without CO; places may drive; current cost driver (task 47 JLI).';

COMMIT;

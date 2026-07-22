-- SubHub: estimate.status vocabulary (task 65 / ST1).
-- Rename: sent→submitted, won→accepted, lost→rejected, expired→rejected.
-- Prerequisite: 091 applied.

BEGIN;

-- Drop old CHECK before renaming values (new labels are not in the old set).
ALTER TABLE estimate DROP CONSTRAINT IF EXISTS estimate_status_check;

UPDATE estimate SET status = 'submitted' WHERE status = 'sent';
UPDATE estimate SET status = 'accepted' WHERE status = 'won';
UPDATE estimate SET status = 'rejected' WHERE status IN ('lost', 'expired');

ALTER TABLE estimate
  ADD CONSTRAINT estimate_status_check
  CHECK (status IN ('draft', 'submitted', 'accepted', 'rejected'));

ALTER TABLE estimate
  ALTER COLUMN status SET DEFAULT 'draft';

COMMENT ON COLUMN estimate.status IS
  'Lifecycle: draft | submitted | accepted | rejected (task 65 ST1). Transitions via dedicated actions, not PATCH.';

COMMIT;

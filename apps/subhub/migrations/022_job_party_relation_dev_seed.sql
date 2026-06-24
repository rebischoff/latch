-- Optional dev fixtures for job_party_relation catalog (task 22 / wave 4a).
-- Suggested defaults per current.dbml — local QA for estimate_detail stakeholders; skip in production if undesired.
-- Idempotent: no hard-coded ids; skip rows when display_name already exists.

BEGIN;

INSERT INTO job_party_relation (display_name, sort_order)
SELECT v.display_name, v.sort_order
FROM (
  VALUES
    ('Customer', 10),
    ('Property owner', 20),
    ('Bill to', 30),
    ('Sold to', 40),
    ('General contractor', 50),
    ('Subcontractor', 60),
    ('Subcontract through', 70)
) AS v (display_name, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM job_party_relation jpr
  WHERE jpr.display_name = v.display_name
);

COMMIT;

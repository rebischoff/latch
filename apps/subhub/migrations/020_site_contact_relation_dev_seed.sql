-- Optional dev fixtures for site_contact_relation catalog (task 17).
-- Approved 2026-06-16 — local QA for site_detail standing contacts; skip in production if undesired.
-- Idempotent: no hard-coded ids; skip rows when display_name already exists.

BEGIN;

INSERT INTO site_contact_relation (display_name, sort_order)
SELECT v.display_name, v.sort_order
FROM (
  VALUES
    ('Property owner', 10),
    ('Property manager', 20),
    ('Site superintendent', 30),
    ('Other', 40)
) AS v (display_name, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM site_contact_relation scr
  WHERE scr.display_name = v.display_name
);

COMMIT;

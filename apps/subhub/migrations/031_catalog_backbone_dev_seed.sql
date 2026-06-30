-- Optional dev fixtures for catalog backbone (task 31 batch D).
-- Agreed rows only (task 32): system, phase_template + steps. Idempotent — no
-- hard-coded ids; match by name; Postgres-assigned ids. system_spec_def /
-- system_spec_option, site_system, trade are intentionally NOT seeded.

BEGIN;

-- ─── system — Fire Alarm / Access Control / CCTV (1-based sort_order) ─────────

INSERT INTO system (name, sort_order)
SELECT v.name, v.sort_order
FROM (
  VALUES
    ('Fire Alarm', 1),
    ('Access Control', 2),
    ('CCTV', 3)
) AS v (name, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM system s WHERE s.name = v.name);

-- ─── phase_template — Standard Install ───────────────────────────────────────

INSERT INTO phase_template (name, sort_order)
SELECT 'Standard Install', 1
WHERE NOT EXISTS (SELECT 1 FROM phase_template pt WHERE pt.name = 'Standard Install');

-- ─── phase_template_step — Install / Program / Test (equal weights) ──────────

INSERT INTO phase_template_step (
  phase_template_id, name, sequence, progress_weight, billing_weight, sort_order
)
SELECT pt.id, v.name, v.sequence, 1, 1, v.sequence
FROM phase_template pt
CROSS JOIN (
  VALUES
    ('Install', 1),
    ('Program', 2),
    ('Test', 3)
) AS v (name, sequence)
WHERE pt.name = 'Standard Install'
  AND NOT EXISTS (
    SELECT 1
    FROM phase_template_step s
    WHERE s.phase_template_id = pt.id
      AND s.name = v.name
  );

-- ─── Link Fire Alarm → Standard Install (Fire Alarm only) ────────────────────

UPDATE system
SET default_phase_template_id = (
  SELECT id FROM phase_template WHERE name = 'Standard Install'
)
WHERE name = 'Fire Alarm'
  AND default_phase_template_id IS NULL;

COMMIT;

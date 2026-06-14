-- Optional dev fixtures for party spine (task 10). Skip in production if undesired.
-- Idempotent: fixed ids + ON CONFLICT DO NOTHING.

BEGIN;

INSERT INTO party (id, kind, display_name, legal_name, notes) VALUES
  (
    'seed-party-acme',
    'organization',
    'Acme Electric',
    'Acme Electric LLC',
    'Net 30; PO required on invoices over $5k.'
  ),
  (
    'seed-party-oak',
    'organization',
    'Oak Properties',
    'Oak Properties Management Inc.',
    'Property management portfolio.'
  ),
  (
    'seed-party-schneider',
    'organization',
    'Schneider Supply',
    'Schneider Supply Co.',
    NULL
  ),
  (
    'seed-party-leviton',
    'organization',
    'Leviton Manufacturing',
    'Leviton Manufacturing Co., Inc.',
    NULL
  ),
  (
    'seed-party-admin',
    'person',
    'System Administrator',
    NULL,
    'Employee record for the setup user when present.'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO party_role (party_id, role) VALUES
  ('seed-party-acme', 'customer'),
  ('seed-party-oak', 'customer'),
  ('seed-party-schneider', 'vendor'),
  ('seed-party-leviton', 'manufacturer'),
  ('seed-party-admin', 'employee')
ON CONFLICT (party_id, role) DO NOTHING;

INSERT INTO party_phone (id, party_id, label, number, is_primary, sort_order) VALUES
  ('seed-phone-acme-main', 'seed-party-acme', 'main', '555-0100', true, 0),
  ('seed-phone-oak-main', 'seed-party-oak', 'main', '555-0200', true, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO party_email (id, party_id, label, address, is_primary, sort_order) VALUES
  ('seed-email-acme-billing', 'seed-party-acme', 'billing', 'billing@acme-electric.example', true, 0),
  ('seed-email-oak-main', 'seed-party-oak', 'main', 'ops@oak-properties.example', true, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO employee (party_id, latch_user_id)
SELECT 'seed-party-admin', u.id
FROM latch_users u
ORDER BY u.created_at
LIMIT 1
ON CONFLICT (party_id) DO NOTHING;

COMMIT;

-- Optional dev fixtures: Oahu portfolio sites with customers, contacts, scopes & zones.
-- Local QA only — skip in production if undesired.
-- Prerequisite: 020 (site_contact_relation), 031 (root items), 039+, 040a, 041.
-- Idempotent: Postgres-assigned ids; skip rows matched by display_name / site + customer / scope + zone name.

BEGIN;

-- ─── 1. Customer organizations ──────────────────────────────────────────────

INSERT INTO party (id, kind, display_name, legal_name)
SELECT gen_random_uuid()::text, 'organization', v.display_name, v.legal_name
FROM (
  VALUES
    ('Alexander & Baldwin', 'Alexander & Baldwin, Inc.'),
    ('Brookfield Properties Hawaii', 'Brookfield Properties Retail Inc.'),
    ('Howard Hughes Corporation', 'Howard Hughes Corporation'),
    ('Colliers Hawaii', 'Colliers International Hawaii'),
    ('State of Hawaii — DAGS', 'State of Hawaii Department of Accounting and General Services'),
    ('State of Hawaii — DOT', 'State of Hawaii Department of Transportation'),
    ('Hawaii Pacific Health', 'Hawaii Pacific Health'),
    ('University of Hawaiʻi System', 'University of Hawaiʻi'),
    ('GGP Hawaii', 'Brookfield Properties Retail Inc.')
) AS v (display_name, legal_name)
WHERE NOT EXISTS (
  SELECT 1 FROM party p WHERE p.display_name = v.display_name AND p.kind = 'organization'
);

INSERT INTO party_role (party_id, role)
SELECT p.id, 'customer'
FROM party p
WHERE p.kind = 'organization'
  AND p.display_name IN (
    'Alexander & Baldwin',
    'Brookfield Properties Hawaii',
    'Howard Hughes Corporation',
    'Colliers Hawaii',
    'State of Hawaii — DAGS',
    'State of Hawaii — DOT',
    'Hawaii Pacific Health',
    'University of Hawaiʻi System',
    'GGP Hawaii'
  )
  AND NOT EXISTS (
    SELECT 1 FROM party_role pr WHERE pr.party_id = p.id AND pr.role = 'customer'
  );

INSERT INTO party_organization (party_id, dba_name)
SELECT p.id, NULL
FROM party p
WHERE p.kind = 'organization'
  AND p.display_name IN (
    'Alexander & Baldwin',
    'Brookfield Properties Hawaii',
    'Howard Hughes Corporation',
    'Colliers Hawaii',
    'State of Hawaii — DAGS',
    'State of Hawaii — DOT',
    'Hawaii Pacific Health',
    'University of Hawaiʻi System',
    'GGP Hawaii'
  )
  AND NOT EXISTS (SELECT 1 FROM party_organization po WHERE po.party_id = p.id);

-- ─── 2. Standing contact persons ────────────────────────────────────────────

INSERT INTO party (id, kind, display_name)
SELECT gen_random_uuid()::text, 'person', v.display_name
FROM (
  VALUES
    ('Leilani Cruz'),
    ('Marcus Ho'),
    ('David Okada'),
    ('Sarah Kim'),
    ('Noelani Peters'),
    ('James Watanabe'),
    ('Amy Lau'),
    ('Ken Ito'),
    ('Tyler Nakamura'),
    ('Rita Chang'),
    ('Paul Mendoza'),
    ('Maya Fontaine'),
    ('Jordan Lee')
) AS v (display_name)
WHERE NOT EXISTS (
  SELECT 1 FROM party p WHERE p.display_name = v.display_name AND p.kind = 'person'
);

INSERT INTO party_person (party_id, first_name, last_name)
SELECT
  p.id,
  split_part(p.display_name, ' ', 1),
  COALESCE(
    NULLIF(substring(p.display_name FROM position(' ' IN p.display_name) + 1), ''),
    ''
  )
FROM party p
WHERE p.kind = 'person'
  AND p.display_name IN (
    'Leilani Cruz',
    'Marcus Ho',
    'David Okada',
    'Sarah Kim',
    'Noelani Peters',
    'James Watanabe',
    'Amy Lau',
    'Ken Ito',
    'Tyler Nakamura',
    'Rita Chang',
    'Paul Mendoza',
    'Maya Fontaine',
    'Jordan Lee'
  )
  AND NOT EXISTS (SELECT 1 FROM party_person pp WHERE pp.party_id = p.id);

-- ─── 3. Sites (top-level, then children) ────────────────────────────────────

INSERT INTO site (id, name, customer_party_id, parent_site_id)
SELECT gen_random_uuid()::text, v.site_name, cust.id, NULL
FROM (
  VALUES
    ('Ala Moana Center', 'Brookfield Properties Hawaii'),
    ('First Hawaiian Center', 'Alexander & Baldwin'),
    ('Pacific Guardian Center', 'Colliers Hawaii'),
    ('SALT at Our Kakaʻako', 'Howard Hughes Corporation'),
    ('Hawaii Convention Center', 'State of Hawaii — DAGS'),
    ('Straub Medical Center', 'Hawaii Pacific Health'),
    ('Windward Mall', 'GGP Hawaii'),
    ('Daniel K. Inouye Intl Airport — Terminal 1', 'State of Hawaii — DOT'),
    ('UH Mānoa Campus', 'University of Hawaiʻi System')
) AS v (site_name, customer_name)
INNER JOIN party cust ON cust.display_name = v.customer_name AND cust.kind = 'organization'
WHERE NOT EXISTS (
  SELECT 1
  FROM site s
  WHERE s.name = v.site_name
    AND s.customer_party_id = cust.id
);

INSERT INTO site (id, name, customer_party_id, parent_site_id)
SELECT gen_random_uuid()::text, v.site_name, cust.id, parent.id
FROM (
  VALUES
    ('Hamilton Library', 'University of Hawaiʻi System', 'UH Mānoa Campus'),
    ('Campus Center', 'University of Hawaiʻi System', 'UH Mānoa Campus')
) AS v (site_name, customer_name, parent_name)
INNER JOIN party cust ON cust.display_name = v.customer_name AND cust.kind = 'organization'
INNER JOIN site parent ON parent.name = v.parent_name AND parent.customer_party_id = cust.id
WHERE NOT EXISTS (
  SELECT 1
  FROM site s
  WHERE s.name = v.site_name
    AND s.customer_party_id = cust.id
);

-- ─── 4. Standing contacts ───────────────────────────────────────────────────

INSERT INTO site_contact (id, site_id, party_id, relation_id, sort_order)
SELECT gen_random_uuid()::text, s.id, contact.id, rel.id, v.sort_order
FROM (
  VALUES
    ('Ala Moana Center', 'Brookfield Properties Hawaii', 'Leilani Cruz', 'Property manager', 10),
    ('Ala Moana Center', 'Brookfield Properties Hawaii', 'Marcus Ho', 'Site superintendent', 20),
    ('First Hawaiian Center', 'Alexander & Baldwin', 'David Okada', 'Property manager', 10),
    ('Pacific Guardian Center', 'Colliers Hawaii', 'Sarah Kim', 'Property manager', 10),
    ('SALT at Our Kakaʻako', 'Howard Hughes Corporation', 'Noelani Peters', 'Property manager', 10),
    ('SALT at Our Kakaʻako', 'Howard Hughes Corporation', 'Howard Hughes Corporation', 'Property owner', 20),
    ('Hawaii Convention Center', 'State of Hawaii — DAGS', 'James Watanabe', 'Site superintendent', 10),
    ('Straub Medical Center', 'Hawaii Pacific Health', 'Amy Lau', 'Property manager', 10),
    ('Straub Medical Center', 'Hawaii Pacific Health', 'Ken Ito', 'Site superintendent', 20),
    ('Windward Mall', 'GGP Hawaii', 'Tyler Nakamura', 'Property manager', 10),
    ('Daniel K. Inouye Intl Airport — Terminal 1', 'State of Hawaii — DOT', 'Rita Chang', 'Property manager', 10),
    ('Daniel K. Inouye Intl Airport — Terminal 1', 'State of Hawaii — DOT', 'Paul Mendoza', 'Site superintendent', 20),
    ('Hamilton Library', 'University of Hawaiʻi System', 'Maya Fontaine', 'Site superintendent', 10),
    ('Campus Center', 'University of Hawaiʻi System', 'Jordan Lee', 'Property manager', 10)
) AS v (site_name, customer_name, contact_name, relation_name, sort_order)
INNER JOIN party cust ON cust.display_name = v.customer_name AND cust.kind = 'organization'
INNER JOIN site s ON s.name = v.site_name AND s.customer_party_id = cust.id
INNER JOIN party contact ON contact.display_name = v.contact_name
INNER JOIN site_contact_relation rel ON rel.display_name = v.relation_name
WHERE NOT EXISTS (
  SELECT 1
  FROM site_contact sc
  WHERE sc.site_id = s.id
    AND sc.party_id = contact.id
    AND sc.relation_id = rel.id
);

-- ─── 5. Scopes (root items from 031 dev seed) ───────────────────────────────

INSERT INTO site_scope (id, site_id, root_item_id, name, sort_order, status)
SELECT gen_random_uuid()::text, s.id, root.id, v.scope_name, v.sort_order, 'active'
FROM (
  VALUES
    ('Ala Moana Center', 'Brookfield Properties Hawaii', 'Fire Alarm', 'Fire Alarm', 1),
    ('Ala Moana Center', 'Brookfield Properties Hawaii', 'CCTV', 'CCTV', 2),
    ('First Hawaiian Center', 'Alexander & Baldwin', 'Fire Alarm', 'Fire Alarm', 1),
    ('First Hawaiian Center', 'Alexander & Baldwin', 'Access Control', 'Access Control', 2),
    ('SALT at Our Kakaʻako', 'Howard Hughes Corporation', 'Access Control', 'Access Control', 1),
    ('SALT at Our Kakaʻako', 'Howard Hughes Corporation', 'CCTV', 'CCTV', 2),
    ('Hawaii Convention Center', 'State of Hawaii — DAGS', 'Fire Alarm', 'Fire Alarm', 1),
    ('Straub Medical Center', 'Hawaii Pacific Health', 'Fire Alarm', 'Fire Alarm', 1),
    ('Straub Medical Center', 'Hawaii Pacific Health', 'Access Control', 'Access Control', 2),
    ('Windward Mall', 'GGP Hawaii', 'CCTV', 'CCTV', 1),
    ('Daniel K. Inouye Intl Airport — Terminal 1', 'State of Hawaii — DOT', 'Fire Alarm', 'Fire Alarm', 1),
    ('Daniel K. Inouye Intl Airport — Terminal 1', 'State of Hawaii — DOT', 'Access Control', 'Access Control', 2),
    ('Daniel K. Inouye Intl Airport — Terminal 1', 'State of Hawaii — DOT', 'CCTV', 'CCTV', 3),
    ('Hamilton Library', 'University of Hawaiʻi System', 'Fire Alarm', 'Fire Alarm', 1),
    ('Campus Center', 'University of Hawaiʻi System', 'Access Control', 'Access Control', 1)
) AS v (site_name, customer_name, root_name, scope_name, sort_order)
INNER JOIN party cust ON cust.display_name = v.customer_name AND cust.kind = 'organization'
INNER JOIN site s ON s.name = v.site_name AND s.customer_party_id = cust.id
INNER JOIN item root ON root.name = v.root_name AND root.parent_id IS NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM site_scope ss
  WHERE ss.site_id = s.id
    AND ss.name = v.scope_name
);

-- ─── 6. Zones (top-level under each scope) ──────────────────────────────────

INSERT INTO site_zone (id, site_id, site_scope_id, parent_zone_id, name, sort_order, status)
SELECT gen_random_uuid()::text, ss.site_id, ss.id, NULL, v.zone_name, v.sort_order, 'active'
FROM (
  VALUES
    ('Ala Moana Center', 'Brookfield Properties Hawaii', 'Fire Alarm', 'Mauka Wing', 1),
    ('Ala Moana Center', 'Brookfield Properties Hawaii', 'Fire Alarm', 'Makai Wing', 2),
    ('Ala Moana Center', 'Brookfield Properties Hawaii', 'CCTV', 'Parking Structure', 1),
    ('First Hawaiian Center', 'Alexander & Baldwin', 'Fire Alarm', 'Floors 10–20', 1),
    ('First Hawaiian Center', 'Alexander & Baldwin', 'Fire Alarm', 'Floors 21–30', 2),
    ('First Hawaiian Center', 'Alexander & Baldwin', 'Access Control', 'Lobby', 1),
    ('First Hawaiian Center', 'Alexander & Baldwin', 'Access Control', 'Garage', 2),
    ('SALT at Our Kakaʻako', 'Howard Hughes Corporation', 'Access Control', 'Block A', 1),
    ('SALT at Our Kakaʻako', 'Howard Hughes Corporation', 'Access Control', 'Block B', 2),
    ('SALT at Our Kakaʻako', 'Howard Hughes Corporation', 'CCTV', 'Courtyard', 1),
    ('Hawaii Convention Center', 'State of Hawaii — DAGS', 'Fire Alarm', 'Exhibition Hall', 1),
    ('Hawaii Convention Center', 'State of Hawaii — DAGS', 'Fire Alarm', 'Meeting Rooms', 2),
    ('Hawaii Convention Center', 'State of Hawaii — DAGS', 'Fire Alarm', 'Loading Dock', 3),
    ('Straub Medical Center', 'Hawaii Pacific Health', 'Fire Alarm', 'Tower A', 1),
    ('Straub Medical Center', 'Hawaii Pacific Health', 'Fire Alarm', 'Tower B', 2),
    ('Straub Medical Center', 'Hawaii Pacific Health', 'Access Control', 'Emergency Department', 1),
    ('Straub Medical Center', 'Hawaii Pacific Health', 'Access Control', 'Staff Entrances', 2),
    ('Windward Mall', 'GGP Hawaii', 'CCTV', 'Main Concourse', 1),
    ('Windward Mall', 'GGP Hawaii', 'CCTV', 'Food Court', 2),
    ('Daniel K. Inouye Intl Airport — Terminal 1', 'State of Hawaii — DOT', 'Fire Alarm', 'Gates 1–14', 1),
    ('Daniel K. Inouye Intl Airport — Terminal 1', 'State of Hawaii — DOT', 'Fire Alarm', 'Bag Claim', 2),
    ('Daniel K. Inouye Intl Airport — Terminal 1', 'State of Hawaii — DOT', 'Access Control', 'Sterile Corridor', 1),
    ('Daniel K. Inouye Intl Airport — Terminal 1', 'State of Hawaii — DOT', 'CCTV', 'Curb Front', 1),
    ('Hamilton Library', 'University of Hawaiʻi System', 'Fire Alarm', 'Basement', 1),
    ('Hamilton Library', 'University of Hawaiʻi System', 'Fire Alarm', 'Floors 1–5', 2),
    ('Campus Center', 'University of Hawaiʻi System', 'Access Control', 'Main Entrance', 1),
    ('Campus Center', 'University of Hawaiʻi System', 'Access Control', 'Loading Dock', 2)
) AS v (site_name, customer_name, scope_name, zone_name, sort_order)
INNER JOIN party cust ON cust.display_name = v.customer_name AND cust.kind = 'organization'
INNER JOIN site s ON s.name = v.site_name AND s.customer_party_id = cust.id
INNER JOIN site_scope ss ON ss.site_id = s.id AND ss.name = v.scope_name
WHERE NOT EXISTS (
  SELECT 1
  FROM site_zone sz
  WHERE sz.site_id = s.id
    AND sz.site_scope_id = ss.id
    AND sz.parent_zone_id IS NULL
    AND sz.name = v.zone_name
);

COMMIT;

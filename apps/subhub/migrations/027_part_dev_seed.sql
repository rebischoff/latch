-- Optional dev fixtures for part catalog (wave 3a QA).
-- Fire alarm + plumbing manufacturers, vendors, MPNs, and multi-vendor pricing.
-- Idempotent: no hard-coded ids; skip rows when display_name / mpn / vendor_pn already exists.
-- Reuses Schneider Supply vendor from 017_party_dev_seed.sql when present.

BEGIN;

-- ─── Manufacturers ───────────────────────────────────────────────────────────

WITH mfr_seed AS (
  SELECT *
  FROM (
    VALUES
      ('System Sensor', 'System Sensor, a Honeywell company'),
      ('Fire-Lite Alarms', 'Fire-Lite Alarms, a Honeywell company'),
      ('NOTIFIER', 'NOTIFIER by Honeywell'),
      ('Edwards Signaling', 'Edwards Signaling & Security'),
      ('Potter Electric Signal', 'Potter Electric Signal Co.'),
      ('West Penn Wire', 'West Penn Wire (Belden)'),
      ('Viega', 'Viega LLC'),
      ('NIBCO', 'NIBCO Inc.'),
      ('Watts', 'Watts Regulator Co.'),
      ('Uponor', 'Uponor North America'),
      ('Charlotte Pipe', 'Charlotte Pipe and Foundry Co.'),
      ('SharkBite', 'SharkBite (Reliance Worldwide)')
  ) AS v (display_name, legal_name)
),
mfr_inserted AS (
  INSERT INTO party (kind, display_name, legal_name)
  SELECT 'organization', ms.display_name, ms.legal_name
  FROM mfr_seed ms
  WHERE NOT EXISTS (
    SELECT 1
    FROM party p
    INNER JOIN party_role pr ON pr.party_id = p.id AND pr.role = 'manufacturer'
    WHERE p.display_name = ms.display_name
  )
  RETURNING id
)
INSERT INTO party_role (party_id, role)
SELECT mi.id, 'manufacturer'
FROM mfr_inserted mi
ON CONFLICT (party_id, role) DO NOTHING;

INSERT INTO party_organization (party_id, dba_name)
SELECT p.id, NULL
FROM party p
INNER JOIN party_role pr ON pr.party_id = p.id AND pr.role = 'manufacturer'
WHERE p.kind = 'organization'
  AND p.display_name IN (
    'System Sensor',
    'Fire-Lite Alarms',
    'NOTIFIER',
    'Edwards Signaling',
    'Potter Electric Signal',
    'West Penn Wire',
    'Viega',
    'NIBCO',
    'Watts',
    'Uponor',
    'Charlotte Pipe',
    'SharkBite'
  )
ON CONFLICT (party_id) DO NOTHING;

-- ─── Vendors (new; Schneider Supply may already exist from 017) ───────────────

WITH vendor_seed AS (
  SELECT *
  FROM (
    VALUES
      ('Graybar', 'Graybar Electric Company, Inc.'),
      ('ADI Global Distribution', 'ADI Global Distribution'),
      ('Ferguson Enterprises', 'Ferguson Enterprises, LLC'),
      ('WESCO International', 'WESCO International, Inc.'),
      ('Johnstone Supply', 'Johnstone Supply')
  ) AS v (display_name, legal_name)
),
vendor_inserted AS (
  INSERT INTO party (kind, display_name, legal_name)
  SELECT 'organization', vs.display_name, vs.legal_name
  FROM vendor_seed vs
  WHERE NOT EXISTS (
    SELECT 1
    FROM party p
    INNER JOIN party_role pr ON pr.party_id = p.id AND pr.role = 'vendor'
    WHERE p.display_name = vs.display_name
  )
  RETURNING id
)
INSERT INTO party_role (party_id, role)
SELECT vi.id, 'vendor'
FROM vendor_inserted vi
ON CONFLICT (party_id, role) DO NOTHING;

INSERT INTO party_organization (party_id, dba_name)
SELECT p.id, NULL
FROM party p
INNER JOIN party_role pr ON pr.party_id = p.id AND pr.role = 'vendor'
WHERE p.kind = 'organization'
  AND p.display_name IN (
    'Graybar',
    'ADI Global Distribution',
    'Ferguson Enterprises',
    'WESCO International',
    'Johnstone Supply'
  )
ON CONFLICT (party_id) DO NOTHING;

-- ─── Manufacturer parts (40) ─────────────────────────────────────────────────

WITH part_seed AS (
  SELECT *
  FROM (
    VALUES
      -- Fire alarm — detectors & initiation
      ('System Sensor', '2W-B', 'i3 series 2-wire photoelectric smoke detector', 'ea', NULL::text, 1::numeric),
      ('System Sensor', '4W-B', 'i3 series 4-wire photoelectric smoke detector', 'ea', NULL, 1),
      ('System Sensor', '2WT-B', 'i3 series 2-wire smoke detector with 135°F thermal', 'ea', NULL, 1),
      ('System Sensor', 'B200S', 'Intelligent addressable sounder base', 'ea', NULL, 1),
      ('System Sensor', 'B200S-LF', 'Low-frequency intelligent sounder base (520 Hz)', 'ea', NULL, 1),
      ('System Sensor', 'B501', 'Standard 4-inch detector mounting base', 'ea', NULL, 1),
      ('Fire-Lite Alarms', 'SD365', 'Addressable photoelectric smoke detector (CLIP/LiteSpeed)', 'ea', NULL, 1),
      ('Fire-Lite Alarms', 'SD365T', 'Addressable smoke detector with 135°F thermal', 'ea', NULL, 1),
      ('Fire-Lite Alarms', 'B300-6', 'Addressable detector mounting base', 'ea', NULL, 1),
      ('NOTIFIER', 'FSP-951', 'Intelligent photoelectric smoke detector (ONYX)', 'ea', NULL, 1),
      ('Edwards Signaling', '278B-1420', 'Double-action pull station, double-pole, key reset', 'ea', NULL, 1),
      ('Edwards Signaling', '276B-RSB', 'Surface back box for 278B/279B pull stations', 'ea', NULL, 1),
      -- Fire alarm — notification
      ('System Sensor', 'P2RL', 'L-Series 2-wire horn/strobe, wall mount, red', 'ea', NULL, 1),
      ('System Sensor', 'P2RL-LF', 'L-Series low-frequency sounder/strobe, wall mount', 'ea', NULL, 1),
      ('System Sensor', 'P2RLED', 'L-Series LED horn/strobe, wall mount, red', 'ea', NULL, 1),
      ('System Sensor', 'HRL', 'L-Series horn only, wall mount, red', 'ea', NULL, 1),
      ('NOTIFIER', 'NBG-12LX', 'Intelligent addressable manual pull station', 'ea', NULL, 1),
      ('NOTIFIER', 'NAC-3-40', '40W NAC power supply module', 'ea', NULL, 1),
      -- Fire alarm — modules & specialty
      ('Potter Electric Signal', 'PAD300-DUCT', 'Addressable duct smoke detector housing', 'ea', NULL, 1),
      ('Potter Electric Signal', 'PAD300-DUCTR', 'Addressable duct smoke detector with relay', 'ea', NULL, 1),
      ('Potter Electric Signal', 'PAD300-IM', 'Intelligent monitor module', 'ea', NULL, 1),
      ('Potter Electric Signal', 'PAD300-RM', 'Intelligent relay module', 'ea', NULL, 1),
      -- Fire alarm — cable
      ('West Penn Wire', '980', '18/2 FPLP plenum fire alarm cable, unshielded', 'ft', 'spool', 1000),
      ('West Penn Wire', '975', '18/2 FPLR riser fire alarm cable, unshielded', 'ft', 'spool', 1000),
      ('West Penn Wire', '970', '18/2 FPL general-purpose fire alarm cable, unshielded', 'ft', 'spool', 1000),
      ('West Penn Wire', '982', '18/4 FPLP plenum fire alarm cable, unshielded', 'ft', 'spool', 1000),
      ('West Penn Wire', 'D980', '18/2 FPLP plenum fire alarm cable, shielded', 'ft', 'spool', 1000),
      ('West Penn Wire', 'D975', '18/2 FPLR riser fire alarm cable, shielded', 'ft', 'spool', 1000),
      -- Plumbing — press fittings
      ('Viega', '78172', 'ProPress 1/2-inch copper coupling, no stop', 'ea', NULL, 1),
      ('Viega', '77150', 'ProPress 1/2-inch copper 90° elbow', 'ea', NULL, 1),
      ('Viega', '78105', 'ProPress 1/2-inch copper tee', 'ea', NULL, 1),
      ('Viega', '29105', 'ProPress 3/4-inch copper coupling with stop', 'ea', NULL, 1),
      ('NIBCO', 'PC607-4', 'Press 1/2 x 3/4-inch 90° elbow, press x MNPT', 'ea', NULL, 1),
      ('NIBCO', 'PC610-4', 'Press 1/2-inch coupling, no stop', 'ea', NULL, 1),
      ('NIBCO', 'PC611-4', 'Press 1/2-inch tee', 'ea', NULL, 1),
      ('NIBCO', 'PC620-4', 'Press 1/2 x 3/4-inch reducing coupling', 'ea', NULL, 1),
      -- Plumbing — valves & safety
      ('Watts', 'LFN45BM1', '3/4-inch LF reduced-pressure backflow preventer', 'ea', NULL, 1),
      ('Watts', '40XL-4', '3/4-inch T&P relief valve, 100K BTU', 'ea', NULL, 1),
      ('Watts', '40XL-5', '3/4-inch T&P relief valve, 105–150K BTU', 'ea', NULL, 1),
      ('Watts', '0559093', '1/2-inch LF ball valve, threaded', 'ea', NULL, 1),
      -- Plumbing — pipe & tubing
      ('Uponor', 'A1220500', '1/2-inch AquaPEX tubing, red (hot)', 'ft', 'coil', 300),
      ('Uponor', 'A1220501', '1/2-inch AquaPEX tubing, blue (cold)', 'ft', 'coil', 300),
      ('Uponor', 'A1220750', '3/4-inch AquaPEX tubing, white', 'ft', 'coil', 300),
      ('Uponor', 'Q4690500', 'ProPEX 1/2-inch expansion ring', 'ea', NULL, 1),
      ('Charlotte Pipe', 'PVC 04006 0600', '1/2-inch Schedule 40 PVC pipe', 'ft', 'stick', 10),
      ('Charlotte Pipe', 'PVC 04006 1000', '1-inch Schedule 40 PVC pipe', 'ft', 'stick', 10),
      -- Plumbing — flex & connectors
      ('Watts', 'U248C', '3/4-inch x 18-inch stainless water heater connector', 'ea', NULL, 1),
      ('Watts', 'U248D', '3/4-inch x 24-inch stainless water heater connector', 'ea', NULL, 1),
      ('SharkBite', 'SB2', '1/2-inch push-to-connect coupling', 'ea', NULL, 1),
      ('Watts', 'U362C', '3/4-inch washing machine hose, 6 ft', 'ea', NULL, 1)
  ) AS v (
    mfr_name,
    mpn,
    description,
    unit,
    purchase_unit,
    units_per_purchase
  )
)
INSERT INTO manufacturer_part (
  manufacturer_party_id,
  mpn,
  description,
  unit,
  purchase_unit,
  units_per_purchase
)
SELECT
  p.id,
  ps.mpn,
  ps.description,
  ps.unit,
  ps.purchase_unit,
  ps.units_per_purchase
FROM part_seed ps
INNER JOIN party p ON p.display_name = ps.mfr_name
INNER JOIN party_role pr ON pr.party_id = p.id AND pr.role = 'manufacturer'
WHERE NOT EXISTS (
  SELECT 1
  FROM manufacturer_part mp
  WHERE mp.manufacturer_party_id = p.id
    AND mp.mpn = ps.mpn
);

-- ─── Vendor pricing (~60 rows) ───────────────────────────────────────────────

WITH pricing_seed AS (
  SELECT *
  FROM (
    VALUES
      -- Fire alarm detectors
      ('System Sensor', '2W-B', 'ADI Global Distribution', 'ADI-SS-2WB', 'System Sensor 2W-B smoke detector', 28.50, true),
      ('System Sensor', '2W-B', 'Graybar', 'GRY-2W-B', '2W-B photoelectric smoke detector', 31.00, false),
      ('System Sensor', '4W-B', 'ADI Global Distribution', 'ADI-SS-4WB', 'System Sensor 4W-B smoke detector', 32.00, true),
      ('System Sensor', '2WT-B', 'ADI Global Distribution', 'ADI-SS-2WTB', '2WT-B smoke + thermal detector', 38.50, true),
      ('System Sensor', 'B200S', 'ADI Global Distribution', 'ADI-B200S', 'Intelligent sounder base', 68.00, true),
      ('System Sensor', 'B200S-LF', 'ADI Global Distribution', 'ADI-B200S-LF', 'Low-frequency sounder base', 92.00, true),
      ('System Sensor', 'B501', 'Graybar', 'GRY-B501', '4-inch mounting base', 8.25, true),
      ('System Sensor', 'B501', 'WESCO International', 'WES-B501', 'Detector mounting base B501', 9.10, false),
      ('Fire-Lite Alarms', 'SD365', 'ADI Global Distribution', 'ADI-FL-SD365', 'Addressable smoke detector SD365', 142.00, true),
      ('Fire-Lite Alarms', 'SD365T', 'ADI Global Distribution', 'ADI-FL-SD365T', 'Addressable smoke + thermal SD365T', 158.00, true),
      ('Fire-Lite Alarms', 'B300-6', 'ADI Global Distribution', 'ADI-FL-B300-6', 'Addressable detector base B300-6', 24.50, true),
      ('NOTIFIER', 'FSP-951', 'ADI Global Distribution', 'ADI-NOT-FSP951', 'ONYX intelligent smoke FSP-951', 168.00, true),
      ('Edwards Signaling', '278B-1420', 'ADI Global Distribution', 'ED-K278B1420', 'Double-action pull station 278B-1420', 62.00, true),
      ('Edwards Signaling', '278B-1420', 'Graybar', 'GRY-278B-1420', 'Edwards 278B-1420 pull station', 65.75, false),
      ('Edwards Signaling', '276B-RSB', 'ADI Global Distribution', 'ADI-ED-276B-RSB', 'Surface back box 276B-RSB', 18.50, true),
      -- Fire alarm notification
      ('System Sensor', 'P2RL', 'ADI Global Distribution', 'ADI-P2RL', 'L-Series horn/strobe P2RL', 72.00, true),
      ('System Sensor', 'P2RL', 'WESCO International', 'WES-P2RL', 'Horn/strobe wall red P2RL', 76.50, false),
      ('System Sensor', 'P2RL-LF', 'ADI Global Distribution', 'ADI-P2RL-LF', 'Low-frequency sounder/strobe P2RL-LF', 89.00, true),
      ('System Sensor', 'P2RL-LF', 'WESCO International', 'WES-P2RL-LF', 'LF sounder/strobe P2RL-LF', 94.50, false),
      ('System Sensor', 'P2RLED', 'Graybar', 'GRY-P2RLED', 'LED horn/strobe P2RLED', 78.00, true),
      ('System Sensor', 'HRL', 'ADI Global Distribution', 'ADI-HRL', 'L-Series horn HRL', 42.00, true),
      ('NOTIFIER', 'NBG-12LX', 'ADI Global Distribution', 'ADI-NOT-NBG12LX', 'Addressable pull station NBG-12LX', 185.00, true),
      ('NOTIFIER', 'NAC-3-40', 'ADI Global Distribution', 'ADI-NOT-NAC340', '40W NAC power supply', 245.00, true),
      -- Fire alarm modules
      ('Potter Electric Signal', 'PAD300-DUCT', 'ADI Global Distribution', 'ADI-POT-DUCT', 'Duct smoke housing PAD300-DUCT', 165.00, true),
      ('Potter Electric Signal', 'PAD300-DUCTR', 'ADI Global Distribution', 'ADI-POT-DUCTR', 'Duct smoke with relay PAD300-DUCTR', 198.00, true),
      ('Potter Electric Signal', 'PAD300-IM', 'ADI Global Distribution', 'ADI-POT-IM', 'Monitor module PAD300-IM', 52.00, true),
      ('Potter Electric Signal', 'PAD300-RM', 'ADI Global Distribution', 'ADI-POT-RM', 'Relay module PAD300-RM', 58.00, true),
      -- Fire alarm cable (multi-vendor)
      ('West Penn Wire', '980', 'Graybar', 'WPW-980-1000', '18/2 FPLP plenum cable, 1000 ft spool', 0.42, true),
      ('West Penn Wire', '980', 'WESCO International', 'WES-980-18-2-FPLP', '18/2 FPLP fire alarm cable', 0.45, false),
      ('West Penn Wire', '980', 'Schneider Supply', 'SCH-FA-980', 'FPLP 18/2 fire alarm wire', 0.48, false),
      ('West Penn Wire', '975', 'Graybar', 'WPW-975-1000', '18/2 FPLR riser cable, 1000 ft spool', 0.35, true),
      ('West Penn Wire', '975', 'ADI Global Distribution', 'ADI-WPW-975', '18/2 FPLR riser cable', 0.38, false),
      ('West Penn Wire', '970', 'Graybar', 'WPW-970-1000', '18/2 FPL general cable, 1000 ft spool', 0.28, true),
      ('West Penn Wire', '982', 'Graybar', 'WPW-982-1000', '18/4 FPLP plenum cable, 1000 ft spool', 0.55, true),
      ('West Penn Wire', 'D980', 'Graybar', 'WPW-D980-1000', '18/2 shielded FPLP cable, 1000 ft spool', 0.58, true),
      ('West Penn Wire', 'D980', 'WESCO International', 'WES-D980', 'Shielded FPLP 18/2 cable', 0.62, false),
      ('West Penn Wire', 'D975', 'Graybar', 'WPW-D975-1000', '18/2 shielded FPLR cable, 1000 ft spool', 0.48, true),
      -- Plumbing press fittings
      ('Viega', '78172', 'Ferguson Enterprises', 'FER-78172', 'ProPress 1/2-inch coupling no stop', 4.85, true),
      ('Viega', '78172', 'Johnstone Supply', 'JOH-VIE-78172', 'Viega 78172 ProPress coupling', 5.20, false),
      ('Viega', '77150', 'Ferguson Enterprises', 'FER-77150', 'ProPress 1/2-inch 90° elbow', 6.10, true),
      ('Viega', '78105', 'Ferguson Enterprises', 'FER-78105', 'ProPress 1/2-inch tee', 8.45, true),
      ('Viega', '29105', 'Ferguson Enterprises', 'FER-29105', 'ProPress 3/4-inch coupling with stop', 7.20, true),
      ('NIBCO', 'PC607-4', 'Ferguson Enterprises', 'FER-PC607-4', 'NIBCO press 1/2 x 3/4 elbow', 5.65, true),
      ('NIBCO', 'PC610-4', 'Ferguson Enterprises', 'FER-PC610-4', 'NIBCO press 1/2-inch coupling', 3.95, true),
      ('NIBCO', 'PC610-4', 'Johnstone Supply', 'JOH-NIB-PC610', 'NIBCO PC610-4 press coupling', 4.25, false),
      ('NIBCO', 'PC611-4', 'Ferguson Enterprises', 'FER-PC611-4', 'NIBCO press 1/2-inch tee', 6.80, true),
      ('NIBCO', 'PC620-4', 'Ferguson Enterprises', 'FER-PC620-4', 'NIBCO press reducing coupling', 5.10, true),
      -- Plumbing valves
      ('Watts', 'LFN45BM1', 'Ferguson Enterprises', 'FER-LFN45BM1', '3/4-inch RP backflow preventer', 285.00, true),
      ('Watts', '40XL-4', 'Ferguson Enterprises', 'FER-40XL-4', '3/4-inch T&P relief valve 100K BTU', 38.00, true),
      ('Watts', '40XL-4', 'Schneider Supply', 'SCH-40XL-4', 'Watts 40XL-4 T&P valve', 41.50, false),
      ('Watts', '40XL-5', 'Ferguson Enterprises', 'FER-40XL-5', '3/4-inch T&P relief valve 150K BTU', 42.00, true),
      ('Watts', '0559093', 'Ferguson Enterprises', 'FER-0559093', '1/2-inch LF ball valve', 12.50, true),
      -- Plumbing pipe & tubing
      ('Uponor', 'A1220500', 'Ferguson Enterprises', 'FER-A1220500', '1/2-inch AquaPEX red, per ft', 0.38, true),
      ('Uponor', 'A1220500', 'Johnstone Supply', 'JOH-PEX-0500R', 'Uponor 1/2-inch red PEX', 0.42, false),
      ('Uponor', 'A1220501', 'Ferguson Enterprises', 'FER-A1220501', '1/2-inch AquaPEX blue, per ft', 0.38, true),
      ('Uponor', 'A1220750', 'Ferguson Enterprises', 'FER-A1220750', '3/4-inch AquaPEX white, per ft', 0.52, true),
      ('Uponor', 'Q4690500', 'Ferguson Enterprises', 'FER-Q4690500', 'ProPEX 1/2-inch expansion ring', 0.85, true),
      ('Charlotte Pipe', 'PVC 04006 0600', 'Ferguson Enterprises', 'FER-PVC-050-S40', '1/2-inch Sch 40 PVC, per ft', 0.52, true),
      ('Charlotte Pipe', 'PVC 04006 1000', 'Ferguson Enterprises', 'FER-PVC-100-S40', '1-inch Sch 40 PVC, per ft', 0.78, true),
      -- Plumbing flex & connectors
      ('Watts', 'U248C', 'Ferguson Enterprises', 'FER-U248C', '3/4 x 18-inch WH connector', 22.00, true),
      ('Watts', 'U248D', 'Ferguson Enterprises', 'FER-U248D', '3/4 x 24-inch WH connector', 24.50, true),
      ('SharkBite', 'SB2', 'Ferguson Enterprises', 'FER-SB2', '1/2-inch push coupling SB2', 6.75, true),
      ('SharkBite', 'SB2', 'Johnstone Supply', 'JOH-SB2', 'SharkBite 1/2-inch coupling', 7.25, false),
      ('Watts', 'U362C', 'Ferguson Enterprises', 'FER-U362C', '3/4-inch washer hose 6 ft', 14.00, true)
  ) AS v (
    mfr_name,
    mpn,
    vendor_name,
    vendor_pn,
    vendor_description,
    unit_price,
    is_preferred
  )
)
INSERT INTO vendor_part (
  vendor_party_id,
  manufacturer_part_id,
  vendor_pn,
  vendor_description,
  unit_price,
  is_preferred
)
SELECT
  vp.id,
  mp.id,
  ps.vendor_pn,
  ps.vendor_description,
  ps.unit_price,
  ps.is_preferred
FROM pricing_seed ps
INNER JOIN party mfr ON mfr.display_name = ps.mfr_name
INNER JOIN party_role mfr_role ON mfr_role.party_id = mfr.id AND mfr_role.role = 'manufacturer'
INNER JOIN manufacturer_part mp
  ON mp.manufacturer_party_id = mfr.id
 AND mp.mpn = ps.mpn
INNER JOIN party vp ON vp.display_name = ps.vendor_name
INNER JOIN party_role v_role ON v_role.party_id = vp.id AND v_role.role = 'vendor'
WHERE NOT EXISTS (
  SELECT 1
  FROM vendor_part existing
  WHERE existing.vendor_party_id = vp.id
    AND existing.vendor_pn = ps.vendor_pn
);

COMMIT;

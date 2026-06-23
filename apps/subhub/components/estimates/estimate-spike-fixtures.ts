import type { Manifest } from "@latch/contracts";

export type LineKind = "product" | "labor" | "expense";
export type LineRole = "standalone" | "kit_header" | "kit_component";
export type LineEditorMode = "flat" | "grouped";

export type EstimateLineRow = {
  client_key?: string;
  description: string;
  id?: string;
  item_id: string | null;
  line_kind: LineKind;
  line_number: number;
  line_role: LineRole;
  parent_line_id: string | null;
  part_id: string | null;
  phase_id: string | null;
  quantity: number;
  site_location_id: string | null;
  sort_order: number;
  unit: string;
  unit_cost: number;
  unit_price: number;
};

export type SiteLocationFixture = {
  id: string;
  name: string;
  section_name: string;
};

export type EstimateSpikeFixture = {
  estimate_date: string;
  id: string;
  line_items: EstimateLineRow[];
  site_locations: SiteLocationFixture[];
  site_name: string;
  title: string;
};

/** Fixture manifest — full write grants for spike exploration. */
export const SPIKE_MANIFEST: Manifest = {
  surface: "estimate_detail",
  actions: ["read", "write", "delete"],
  fields: {
    profile: ["read", "write"],
    line_items: ["read", "write"],
  },
};

export const PHASE_OPTIONS = [
  { value: "phase-prewire", label: "Prewire" },
  { value: "phase-install", label: "Installation" },
  { value: "phase-program", label: "Programming" },
  { value: "phase-test", label: "Testing" },
] as const;

/** Static catalog stand-ins until wave 3 part/item pickers ship. */
export const PART_OPTIONS = [
  { value: "part-horn-strobe", label: "System Sensor P2RL — Horn/Strobe" },
  { value: "part-pull-station", label: "Edwards 276-131 — Pull Station" },
  { value: "part-facp", label: "Notifier NFS2-3030 — FACP" },
  { value: "part-cable", label: "18/2 FPLP Fire Alarm Cable" },
  { value: "part-smoke", label: "System Sensor 2WTA-B — Photo Smoke" },
] as const;

export const ITEM_OPTIONS = [
  { value: "item-horn-strobe", label: "Horn/Strobe — addressable" },
  { value: "item-pull", label: "Manual pull station" },
  { value: "item-facp", label: "Fire alarm control panel" },
  { value: "item-cable", label: "Fire-rated cable run" },
  { value: "item-labor-prewire", label: "Labor — prewire" },
  { value: "item-labor-install", label: "Labor — device install" },
] as const;

const loc = {
  firstFloor: "loc-first-floor",
  secondFloor: "loc-second-floor",
  basement: "loc-basement",
  exterior: "loc-exterior",
} as const;

export const DEMO_SITE_LOCATIONS: SiteLocationFixture[] = [
  { id: loc.firstFloor, name: "1st floor — open office", section_name: "Building A" },
  { id: loc.secondFloor, name: "2nd floor — executive suite", section_name: "Building A" },
  { id: loc.basement, name: "Basement — mechanical", section_name: "Building A" },
  { id: loc.exterior, name: "Exterior — north canopy", section_name: "Site" },
];

const kitHeaderId = "line-kit-facp";
const kitComponentCableId = "line-kit-cable";
const kitComponentLaborId = "line-kit-labor";

export const DEMO_ESTIMATE_LINES: EstimateLineRow[] = [
  {
    id: "line-1",
    line_number: 1,
    line_role: "standalone",
    line_kind: "product",
    description: "Addressable horn/strobe — open office corridor",
    quantity: 12,
    unit: "ea",
    unit_cost: 48.5,
    unit_price: 72,
    site_location_id: loc.firstFloor,
    phase_id: null,
    item_id: "item-horn-strobe",
    part_id: "part-horn-strobe",
    parent_line_id: null,
    sort_order: 1,
  },
  {
    id: "line-2",
    line_number: 2,
    line_role: "standalone",
    line_kind: "product",
    description: "Manual pull station — stairwell B",
    quantity: 4,
    unit: "ea",
    unit_cost: 62,
    unit_price: 95,
    site_location_id: loc.secondFloor,
    phase_id: null,
    item_id: "item-pull",
    part_id: "part-pull-station",
    parent_line_id: null,
    sort_order: 2,
  },
  {
    id: kitHeaderId,
    line_number: 3,
    line_role: "kit_header",
    line_kind: "product",
    description: "FACP kit — basement mechanical room",
    quantity: 1,
    unit: "kit",
    unit_cost: 4200,
    unit_price: 5800,
    site_location_id: loc.basement,
    phase_id: null,
    item_id: "item-facp",
    part_id: "part-facp",
    parent_line_id: null,
    sort_order: 3,
  },
  {
    id: kitComponentCableId,
    line_number: 4,
    line_role: "kit_component",
    line_kind: "product",
    description: "FPLP homerun to FACP",
    quantity: 250,
    unit: "ft",
    unit_cost: 0.85,
    unit_price: 1.25,
    site_location_id: loc.basement,
    phase_id: null,
    item_id: "item-cable",
    part_id: "part-cable",
    parent_line_id: kitHeaderId,
    sort_order: 4,
  },
  {
    id: kitComponentLaborId,
    line_number: 5,
    line_role: "kit_component",
    line_kind: "labor",
    description: "FACP install & programming",
    quantity: 16,
    unit: "hr",
    unit_cost: 65,
    unit_price: 95,
    site_location_id: loc.basement,
    phase_id: "phase-program",
    item_id: "item-labor-install",
    part_id: null,
    parent_line_id: kitHeaderId,
    sort_order: 5,
  },
  {
    id: "line-6",
    line_number: 6,
    line_role: "standalone",
    line_kind: "labor",
    description: "Prewire — 1st floor device homeruns",
    quantity: 24,
    unit: "hr",
    unit_cost: 58,
    unit_price: 85,
    site_location_id: loc.firstFloor,
    phase_id: "phase-prewire",
    item_id: "item-labor-prewire",
    part_id: null,
    parent_line_id: null,
    sort_order: 6,
  },
  {
    id: "line-7",
    line_number: 7,
    line_role: "standalone",
    line_kind: "product",
    description: "Photo smoke — exterior canopy",
    quantity: 2,
    unit: "ea",
    unit_cost: 38,
    unit_price: 58,
    site_location_id: loc.exterior,
    phase_id: null,
    item_id: "item-horn-strobe",
    part_id: "part-smoke",
    parent_line_id: null,
    sort_order: 7,
  },
];

export const DEMO_ESTIMATE: EstimateSpikeFixture = {
  id: "demo",
  title: "Fire alarm — Building A tenant improvement",
  site_name: "1200 Commerce Dr — Building A",
  estimate_date: "2026-06-15",
  site_locations: DEMO_SITE_LOCATIONS,
  line_items: DEMO_ESTIMATE_LINES,
};

export const locationLabel = (
  locations: SiteLocationFixture[],
  locationId: string | null,
): string => {
  if (!locationId) {
    return "Unassigned";
  }
  return locations.find((row) => row.id === locationId)?.name ?? locationId;
};

export const extSell = (row: Pick<EstimateLineRow, "quantity" | "unit_price">): number =>
  row.quantity * row.unit_price;

export const createStandaloneLine = (
  lines: EstimateLineRow[],
  overrides?: Partial<EstimateLineRow>,
): EstimateLineRow => {
  const nextNumber = lines.reduce((max, row) => Math.max(max, row.line_number), 0) + 1;
  const nextSort = lines.reduce((max, row) => Math.max(max, row.sort_order), 0) + 1;

  return {
    client_key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    line_number: nextNumber,
    line_role: "standalone",
    line_kind: "product",
    description: "",
    quantity: 1,
    unit: "ea",
    unit_cost: 0,
    unit_price: 0,
    site_location_id: null,
    phase_id: null,
    item_id: null,
    part_id: null,
    parent_line_id: null,
    sort_order: nextSort,
    ...overrides,
  };
};

export const createKitBundle = (
  lines: EstimateLineRow[],
  siteLocationId: string | null,
): EstimateLineRow[] => {
  const header = createStandaloneLine(lines, {
    line_role: "kit_header",
    line_kind: "product",
    description: "New kit",
    quantity: 1,
    unit: "kit",
    site_location_id: siteLocationId,
    item_id: "item-facp",
    part_id: "part-facp",
  });
  const headerId = header.client_key!;

  const cable = createStandaloneLine([...lines, header], {
    line_role: "kit_component",
    line_kind: "product",
    description: "Kit component — cable",
    quantity: 100,
    unit: "ft",
    site_location_id: siteLocationId,
    parent_line_id: headerId,
    item_id: "item-cable",
    part_id: "part-cable",
  });

  const labor = createStandaloneLine([...lines, header, cable], {
    line_role: "kit_component",
    line_kind: "labor",
    description: "Kit component — labor",
    quantity: 8,
    unit: "hr",
    site_location_id: siteLocationId,
    phase_id: "phase-install",
    parent_line_id: headerId,
    item_id: "item-labor-install",
  });

  return [header, cable, labor];
};

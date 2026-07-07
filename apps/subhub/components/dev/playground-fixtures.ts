import { fieldAllows, type FieldAction, type Manifest } from "@latch/contracts";
import type { SelectProps, TreeSelectProps, TransferProps } from "antd";
import { z } from "zod";

export const PLAYGROUND_SCALAR_FIELD_IDS = [
  "display_name",
  "kind",
  "kind_alt",
  "notes",
  "customer_party",
  "property_owner_party",
  "sort_order",
  "is_active",
  "effective_date",
  "start_time",
  "address_line",
  "item_id",
  "priority",
  "body",
  "assignee_ids",
  "attachment",
] as const;

export const PLAYGROUND_FIELD_IDS = [
  ...PLAYGROUND_SCALAR_FIELD_IDS,
  "phones",
] as const;

export type PlaygroundFieldId = (typeof PLAYGROUND_FIELD_IDS)[number];
export type PlaygroundScalarFieldId = (typeof PLAYGROUND_SCALAR_FIELD_IDS)[number];

export type FieldGrant = "write" | "read" | "none";

export const grantToFieldActions = (grant: FieldGrant): FieldAction[] | null => {
  if (grant === "write") {
    return ["read", "write"];
  }
  if (grant === "read") {
    return ["read"];
  }
  return null;
};

export const fieldActionsToGrant = (
  actions: FieldAction[] | undefined,
): FieldGrant => {
  if (!actions || actions.length === 0) {
    return "none";
  }
  if (actions.includes("write")) {
    return "write";
  }
  if (actions.includes("read")) {
    return "read";
  }
  return "none";
};

const allFieldsGrant = (grant: FieldGrant): Manifest["fields"] => {
  const actions = grantToFieldActions(grant);
  if (!actions) {
    return {};
  }
  return Object.fromEntries(
    PLAYGROUND_FIELD_IDS.map((fieldId) => [fieldId, actions]),
  );
};

export const ADMIN_MANIFEST: Manifest = {
  surface: "playground_detail",
  actions: ["read", "write", "delete"],
  fields: allFieldsGrant("write"),
};

export const READONLY_VIEWER_MANIFEST: Manifest = {
  surface: "playground_detail",
  actions: ["read"],
  fields: allFieldsGrant("read"),
};

export const PROFILE_EDITOR_MANIFEST: Manifest = {
  surface: "playground_detail",
  actions: ["read", "write", "delete"],
  fields: {
    display_name: ["read", "write"],
    kind: ["read", "write"],
    kind_alt: ["read"],
    notes: ["read"],
    customer_party: ["read", "write"],
    property_owner_party: ["read"],
    sort_order: ["read", "write"],
    is_active: ["read"],
    effective_date: ["read", "write"],
    start_time: ["read"],
    address_line: ["read", "write"],
    item_id: ["read"],
    priority: ["read", "write"],
    body: ["read"],
    assignee_ids: ["read", "write"],
    attachment: ["read"],
    phones: ["read", "write"],
  },
};

export type PlaygroundPresetId =
  | "admin"
  | "readonly-viewer"
  | "profile-editor"
  | "loading"
  | "saving";

export const PLAYGROUND_PRESETS: Record<PlaygroundPresetId, Manifest> = {
  admin: ADMIN_MANIFEST,
  "readonly-viewer": READONLY_VIEWER_MANIFEST,
  "profile-editor": PROFILE_EDITOR_MANIFEST,
  loading: ADMIN_MANIFEST,
  saving: ADMIN_MANIFEST,
};

export const PLAYGROUND_SURFACE_ACTIONS = ["read", "write", "delete"] as const;

export type PlaygroundUiState = {
  loading: boolean;
  saving: boolean;
  canCreate: boolean;
  slowNetwork: boolean;
};

export const applyPresetUi = (preset: PlaygroundPresetId): PlaygroundUiState => ({
  loading: preset === "loading",
  saving: preset === "saving",
  canCreate: preset !== "readonly-viewer",
  slowNetwork: false,
});

/** Simulated record load when `slowNetwork` is on (overlay testing). */
export const PLAYGROUND_SLOW_NETWORK_MS = 800;

/** Fast record load — completes before the overlay delay threshold. */
export const PLAYGROUND_FAST_NETWORK_MS = 150;

/** Mock save — long enough to verify write-mode controls stay disabled. */
export const PLAYGROUND_SAVE_MS = 2500;

/** Mock save when `slowNetwork` is on. */
export const PLAYGROUND_SLOW_SAVE_MS = 3500;

export const PLAYGROUND_PRESET_ALIASES: Record<string, PlaygroundPresetId> = {
  "readonly-notes": "profile-editor",
  "no-write-surface": "readonly-viewer",
};

export type PlaygroundAttachment = {
  uid: string;
  name: string;
  url?: string;
};

export type PlaygroundPhoneRow = {
  label: string;
  number: string;
  is_primary: boolean;
};

export type PlaygroundDto = {
  display_name: string;
  kind: string;
  kind_alt: string;
  notes: string;
  customer_party: string;
  property_owner_party: string;
  sort_order: number | null;
  is_active: boolean;
  effective_date: string | null;
  start_time: string | null;
  address_line: string;
  item_id: string;
  priority: number;
  body: string;
  assignee_ids: string[];
  attachment: PlaygroundAttachment[];
  phones: PlaygroundPhoneRow[];
};

export const FIXTURE_DTO: PlaygroundDto = {
  display_name: "Acme Playground",
  kind: "organization",
  kind_alt: "organization",
  notes: "Fixture notes for playground testing.",
  customer_party: "party-acme",
  property_owner_party: "party-owner",
  sort_order: 10,
  is_active: true,
  effective_date: "2026-06-01",
  start_time: "09:30:00",
  address_line: "123 Main St",
  item_id: "cat-electrical",
  priority: 65,
  body: "Hello @team — playground mention sample.",
  assignee_ids: ["user-alice", "user-bob"],
  attachment: [{ uid: "file-1", name: "scope.pdf", url: "#" }],
  phones: [
    { label: "Office", number: "+1 555 0100", is_primary: true },
    { label: "Mobile", number: "+1 555 0101", is_primary: false },
  ],
};

export type PlaygroundRecordId = "rec-acme" | "rec-beta" | "rec-person";

export const PLAYGROUND_RECORD_IDS: PlaygroundRecordId[] = [
  "rec-acme",
  "rec-beta",
  "rec-person",
];

export const PLAYGROUND_RECORDS: Record<PlaygroundRecordId, PlaygroundDto> = {
  "rec-acme": FIXTURE_DTO,
  "rec-beta": {
    ...FIXTURE_DTO,
    display_name: "Beta Industries",
    kind: "organization",
    kind_alt: "organization",
    notes: "Second fixture record for transition loading.",
    customer_party: "party-vendor",
    sort_order: 20,
    priority: 40,
    body: "Beta record — transfer and tree samples.",
    assignee_ids: ["user-cara"],
    phones: [{ label: "Main", number: "+1 555 0200", is_primary: true }],
  },
  "rec-person": {
    ...FIXTURE_DTO,
    display_name: "Jane Doe",
    kind: "person",
    kind_alt: "person",
    notes: "Person-shaped fixture for kind controls.",
    customer_party: "party-acme",
    property_owner_party: "party-vendor",
    sort_order: 5,
    is_active: false,
    effective_date: "2026-05-15",
    start_time: "14:00:00",
    address_line: "456 Oak Ave",
    item_id: "cat-plumbing",
    priority: 30,
    body: "Person record @alice",
    assignee_ids: ["user-alice"],
    attachment: [],
    phones: [{ label: "Mobile", number: "+1 555 0300", is_primary: true }],
  },
};

export const EMPTY_PLAYGROUND_DTO: PlaygroundDto = {
  display_name: "",
  kind: "organization",
  kind_alt: "organization",
  notes: "",
  customer_party: "party-acme",
  property_owner_party: "party-owner",
  sort_order: null,
  is_active: true,
  effective_date: null,
  start_time: null,
  address_line: "",
  item_id: "cat-electrical",
  priority: 50,
  body: "",
  assignee_ids: [],
  attachment: [],
  phones: [],
};

export const parsePlaygroundRecordId = (
  value: string | null,
): PlaygroundRecordId => {
  if (value && value in PLAYGROUND_RECORDS) {
    return value as PlaygroundRecordId;
  }
  return "rec-acme";
};

export type PlaygroundFormValues = PlaygroundDto;

export const PlaygroundPatchSchema = z
  .object({
    display_name: z.string(),
    kind: z.string(),
    kind_alt: z.string(),
    notes: z.string(),
    customer_party: z.string(),
    property_owner_party: z.string(),
    sort_order: z.number().nullable(),
    is_active: z.boolean(),
    effective_date: z.string().nullable(),
    start_time: z.string().nullable(),
    address_line: z.string(),
    item_id: z.string(),
    priority: z.number(),
    body: z.string(),
    assignee_ids: z.array(z.string()),
    attachment: z.array(
      z.object({
        uid: z.string(),
        name: z.string(),
        url: z.string().optional(),
      }),
    ),
    phones: z.array(
      z.object({
        label: z.string(),
        number: z.string(),
        is_primary: z.boolean(),
      }),
    ),
  })
  .partial()
  .strict();

export const buildDefaultValues = (dto: PlaygroundDto): PlaygroundFormValues => ({
  ...dto,
  phones: dto.phones.map((row) => ({ ...row })),
  assignee_ids: [...dto.assignee_ids],
  attachment: dto.attachment.map((file) => ({ ...file })),
});

export const buildPatchBody = (
  values: PlaygroundFormValues,
  manifest: Manifest,
): Record<string, unknown> => {
  const body: Record<string, unknown> = {};

  for (const fieldId of PLAYGROUND_SCALAR_FIELD_IDS) {
    if (fieldAllows(manifest, fieldId, "write")) {
      body[fieldId] = values[fieldId];
    }
  }

  if (fieldAllows(manifest, "phones", "write")) {
    body.phones = values.phones;
  }

  return body;
};

export const KIND_OPTIONS: SelectProps["options"] = [
  { value: "organization", label: "Organization" },
  { value: "person", label: "Person" },
  { value: "site", label: "Site" },
];

export const KIND_ALT_OPTIONS = [
  { value: "organization", label: "Organization" },
  { value: "person", label: "Person" },
  { value: "site", label: "Site" },
];

export const PARTY_OPTIONS: SelectProps["options"] = [
  { value: "party-acme", label: "Acme Corp" },
  { value: "party-owner", label: "Owner Holdings" },
  { value: "party-vendor", label: "Vendor LLC" },
];

export const ADDRESS_SUGGESTIONS = [
  { value: "123 Main St" },
  { value: "456 Oak Ave" },
  { value: "789 Pine Rd" },
];

export const CATEGORY_TREE: TreeSelectProps["treeData"] = [
  {
    value: "cat-root",
    title: "All categories",
    children: [
      { value: "cat-electrical", title: "Electrical" },
      { value: "cat-plumbing", title: "Plumbing" },
      { value: "cat-hvac", title: "HVAC" },
    ],
  },
];

export const ASSIGNEE_TRANSFER_DATA: TransferProps["dataSource"] = [
  { key: "user-alice", title: "Alice Admin" },
  { key: "user-bob", title: "Bob Builder" },
  { key: "user-cara", title: "Cara Coordinator" },
  { key: "user-dan", title: "Dan Dispatcher" },
];

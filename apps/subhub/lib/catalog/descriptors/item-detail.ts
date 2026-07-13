import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

const SpecOptionPatchElementSchema = z
  .object({
    id: z.string().optional(),
    display_name: z.string(),
    sort_order: z.number().optional(),
  })
  .strict();

const SpecThresholdPresetPatchElementSchema = z
  .object({
    id: z.string().optional(),
    label: z.string(),
    sort_order: z.number().optional(),
    value_number: z.number().nullable().optional(),
    value_number_max: z.number().nullable().optional(),
    option_ids: z.array(z.string()).optional(),
  })
  .strict();

const SpecDefinitionPatchElementSchema = z
  .object({
    id: z.string().optional(),
    display_name: z.string(),
    value_type: z.enum(["enum", "boolean", "number"]),
    unit_id: z.string().nullable().optional(),
    decimal_places: z.number().int().nullable().optional(),
    sort_order: z.number().optional(),
    options: z.array(SpecOptionPatchElementSchema),
    presets: z.array(SpecThresholdPresetPatchElementSchema),
  })
  .strict();

const ItemLaborPhasePatchElementSchema = z
  .object({
    labor_phase_id: z.string(),
    labor_rate_type_id: z.string(),
    hours_per_unit: z.number(),
    sort_order: z.number().optional(),
  })
  .strict();

/** Hand-written — codegen stubs collections with placeholder `user_id`. */
export const ItemDetailPatchSchema = z
  .object({
    profile: z
      .object({
        id: z.string().optional(),
        name: z.string().optional(),
        parent_id: z.string().nullable().optional(),
        node_type: z.enum(["scope", "category", "item"]).optional(),
        sort_order: z.number().optional(),
        csi_code: z.string().nullable().optional(),
      })
      .strict()
      .optional(),
    commercial: z
      .object({
        freight_rate_type_id: z.string().nullable().optional(),
        incidental_rate_type_id: z.string().nullable().optional(),
        markup_type_id: z.string().nullable().optional(),
        fallback_unit_cost: z.number().optional(),
      })
      .strict()
      .optional(),
    item_labor_phase: z.array(ItemLaborPhasePatchElementSchema).optional(),
    spec_definitions: z.array(SpecDefinitionPatchElementSchema).optional(),
  })
  .strict();

/** POST body — `profile.name` required; optional `parent_id` for child create. */
export const ItemDetailCreateSchema = z
  .object({
    profile: z
      .object({
        name: z.string().min(1),
        parent_id: z.string().nullable().optional(),
        node_type: z.enum(["scope", "category", "item"]).optional(),
        sort_order: z.number().optional(),
        csi_code: z.string().nullable().optional(),
      })
      .strict(),
    commercial: z
      .object({
        freight_rate_type_id: z.string().nullable().optional(),
        incidental_rate_type_id: z.string().nullable().optional(),
        markup_type_id: z.string().nullable().optional(),
        fallback_unit_cost: z.number().optional(),
      })
      .strict()
      .optional(),
    item_labor_phase: z.array(ItemLaborPhasePatchElementSchema).optional(),
    spec_definitions: z.array(SpecDefinitionPatchElementSchema).optional(),
  })
  .strict();

export type ItemDetailRow = {
  csi_code: string | null;
  fallback_unit_cost: number;
  freight_rate_type_id: string | null;
  has_children: boolean;
  id: string;
  in_use: boolean;
  incidental_rate_type_id: string | null;
  is_root: boolean;
  markup_type_id: string | null;
  name: string;
  node_type: "scope" | "category" | "item";
  parent_id: string | null;
  parent_name: string | null;
  root_item_id: string | null;
  root_item_name: string | null;
  sort_order: number;
};

export type SpecOptionRow = {
  display_name: string;
  id: string;
  sort_order: number;
};

export type SpecThresholdPresetRow = {
  id: string;
  label: string;
  option_ids: string[];
  sort_order: number;
  value_number: number | null;
  value_number_max: number | null;
};

export type SpecDefinitionRow = {
  decimal_places: number | null;
  display_name: string;
  id: string;
  in_use_part_count: number;
  options: SpecOptionRow[];
  presets: SpecThresholdPresetRow[];
  sort_order: number;
  unit_id: string | null;
  unit_symbol: string | null;
  value_type: "boolean" | "enum" | "number";
};

export type ResolvedLaborPhaseRow = {
  hours_per_unit: number;
  labor_phase_id: string;
  labor_phase_name: string;
  labor_rate_type_id: string;
  labor_rate_type_name: string;
  origin: "own" | "inherited";
  sort_order: number;
  source_item_id: string | null;
  source_item_name: string | null;
};

export type ItemDetailRelated = {
  item_labor_phase: Array<{
    hours_per_unit: number;
    labor_phase_id: string;
    labor_phase_name: string;
    labor_rate_type_id: string;
    labor_rate_type_name: string;
    sort_order: number;
  }>;
  resolved_labor_phase: ResolvedLaborPhaseRow[];
  spec_definitions: SpecDefinitionRow[];
};

export type SpecDefinitionPatchRow = z.infer<typeof SpecDefinitionPatchElementSchema>;
export type SpecThresholdPresetPatchRow = z.infer<typeof SpecThresholdPresetPatchElementSchema>;

export type ItemDetailRelatedPatch = {
  item_labor_phase?: Array<{
    hours_per_unit: number;
    labor_phase_id: string;
    labor_rate_type_id: string;
    sort_order?: number;
  }>;
  spec_definitions?: SpecDefinitionPatchRow[];
};

export type ItemDetailStoreRelated =
  | ItemDetailRelated
  | ItemDetailRelatedPatch;

export type ItemDetailWriteRow = Pick<
  ItemDetailRow,
  | "id"
  | "name"
  | "node_type"
  | "parent_id"
  | "sort_order"
  | "csi_code"
  | "fallback_unit_cost"
  | "freight_rate_type_id"
  | "incidental_rate_type_id"
  | "markup_type_id"
>;

const formatItemDetailRow = (row: ItemDetailRow): Record<string, unknown> => ({
  csi_code: row.csi_code,
  fallback_unit_cost: row.fallback_unit_cost,
  freight_rate_type_id: row.freight_rate_type_id,
  has_children: row.has_children,
  id: row.id,
  in_use: row.in_use,
  incidental_rate_type_id: row.incidental_rate_type_id,
  is_root: row.is_root,
  markup_type_id: row.markup_type_id,
  name: row.name,
  node_type: row.node_type,
  parent_id: row.parent_id,
  parent_name: row.parent_name,
  root_item_id: row.root_item_id,
  root_item_name: row.root_item_name,
  sort_order: row.sort_order,
});

const emptySpecDefinitions = (): SpecDefinitionRow[] => [];

const normalizeItemDetailRelated = (
  related: ItemDetailStoreRelated,
): ItemDetailRelated => ({
  item_labor_phase: (related.item_labor_phase ?? []) as ItemDetailRelated["item_labor_phase"],
  resolved_labor_phase: (related as ItemDetailRelated).resolved_labor_phase ?? [],
  spec_definitions: (related.spec_definitions ?? emptySpecDefinitions()) as SpecDefinitionRow[],
});

export const projectItemDetailRow = (
  row: ItemDetailRow,
  manifest: Manifest,
  related: ItemDetailStoreRelated,
): Record<string, unknown> => {
  const normalized = normalizeItemDetailRelated(related);
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.profile?.includes("read")) {
    dto.profile = {
      id: row.id,
      name: row.name,
      parent_id: row.parent_id,
      parent_name: row.parent_name,
      node_type: row.node_type,
      root_item_id: row.root_item_id,
      root_item_name: row.root_item_name,
      sort_order: row.sort_order,
      csi_code: row.csi_code,
      freight_rate_type_id: row.freight_rate_type_id,
      incidental_rate_type_id: row.incidental_rate_type_id,
      markup_type_id: row.markup_type_id,
      is_root: row.is_root,
      has_children: row.has_children,
      in_use: row.in_use,
    };
  }

  if (manifest.fields.commercial?.includes("read")) {
    dto.commercial = {
      freight_rate_type_id: row.freight_rate_type_id,
      incidental_rate_type_id: row.incidental_rate_type_id,
      markup_type_id: row.markup_type_id,
      fallback_unit_cost: row.fallback_unit_cost,
    };
  }

  if (manifest.fields.item_labor_phase?.includes("read")) {
    dto.item_labor_phase = normalized.item_labor_phase;
    dto.resolved_labor_phase = normalized.resolved_labor_phase;
  }

  if (manifest.fields.spec_definitions?.includes("read")) {
    dto.spec_definitions = normalized.spec_definitions;
  }

  return dto;
};

const applyItemDetailPatch = (
  row: ItemDetailRow,
  patch: Record<string, unknown>,
): ItemDetailRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof ItemDetailPatchSchema>;

  if (typed.profile?.id !== undefined) {
    next.id = typed.profile.id;
  }
  if (typed.profile?.name !== undefined) {
    next.name = typed.profile.name;
  }
  if (typed.profile?.parent_id !== undefined) {
    next.parent_id = typed.profile.parent_id;
  }
  if (typed.profile?.node_type !== undefined) {
    next.node_type = typed.profile.node_type;
  }
  if (typed.profile?.sort_order !== undefined) {
    next.sort_order = typed.profile.sort_order;
  }
  if (typed.profile?.csi_code !== undefined) {
    next.csi_code = typed.profile.csi_code;
  }
  if (typed.commercial?.freight_rate_type_id !== undefined) {
    next.freight_rate_type_id = typed.commercial.freight_rate_type_id;
  }
  if (typed.commercial?.incidental_rate_type_id !== undefined) {
    next.incidental_rate_type_id = typed.commercial.incidental_rate_type_id;
  }
  if (typed.commercial?.markup_type_id !== undefined) {
    next.markup_type_id = typed.commercial.markup_type_id;
  }
  if (typed.commercial?.fallback_unit_cost !== undefined) {
    next.fallback_unit_cost = typed.commercial.fallback_unit_cost;
  }

  return next;
};

export const itemDetailDescriptor: SurfaceDescriptor<
  ItemDetailRow,
  ItemDetailStoreRelated
> = {
  surfaceId: "item_detail",
  anchorTable: "item",
  capabilities: ["detail"],
  patchSchema: ItemDetailPatchSchema,
  deleteAuditFieldId: "profile",
  projectRow: projectItemDetailRow,
  applyPatch: applyItemDetailPatch,
  applyRelatedPatch: (_entityId, patch) => {
    const typed = patch as z.infer<typeof ItemDetailPatchSchema>;
    const related: ItemDetailRelatedPatch = {};

    if (typed.spec_definitions !== undefined) {
      related.spec_definitions = typed.spec_definitions;
    }

    if (typed.item_labor_phase !== undefined) {
      related.item_labor_phase = typed.item_labor_phase;
    }

    return Object.keys(related).length > 0 ? related : undefined;
  },
  auditSnapshot: formatItemDetailRow,
  deleteAuditSnapshot: (row, related) => ({
    ...formatItemDetailRow(row),
    spec_definitions: normalizeItemDetailRelated(related).spec_definitions,
  }),
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};

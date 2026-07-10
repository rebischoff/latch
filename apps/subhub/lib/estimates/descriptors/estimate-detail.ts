import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

const EstimateStakeholderPatchElementSchema = z
  .object({
    party_id: z.string(),
    relation_id: z.string(),
  })
  .strict();

const EstimateConditionLaborPhasePatchElementSchema = z
  .object({
    labor_phase_id: z.string(),
  })
  .strict();

const EstimateConditionSpecPatchElementSchema = z
  .object({
    spec_def_id: z.string(),
    spec_option_id: z.string().nullable().optional(),
    value_number: z.number().nullable().optional(),
    value_boolean: z.boolean().nullable().optional(),
  })
  .strict();

const EstimateConditionPatchElementSchema: z.ZodType<{
  complexity_factor_id?: string | null;
  conditions?: unknown[];
  id?: string;
  included_labor_phases?: Array<{ labor_phase_id: string }>;
  labor_phases_explicit?: boolean;
  name: string;
  parent_condition_id?: string | null;
  root_item_id?: string | null;
  sort_order: number;
  specs: Array<{
    spec_def_id: string;
    spec_option_id?: string | null;
    value_boolean?: boolean | null;
    value_number?: number | null;
  }>;
}> = z.lazy(() =>
  z
    .object({
      id: z.string().optional(),
      name: z.string().min(1),
      parent_condition_id: z.string().nullable().optional(),
      root_item_id: z.string().nullable().optional(),
      sort_order: z.number(),
      complexity_factor_id: z.string().nullable().optional(),
      labor_phases_explicit: z.boolean().optional(),
      included_labor_phases: z.array(EstimateConditionLaborPhasePatchElementSchema).optional(),
      specs: z.array(EstimateConditionSpecPatchElementSchema),
      conditions: z.array(EstimateConditionPatchElementSchema).optional(),
    })
    .strict(),
);

const EstimateLineAllocationPatchElementSchema = z
  .object({
    site_zone_id: z.string(),
    quantity: z.number().positive(),
  })
  .strict();

const EstimateLineItemPatchElementSchema = z
  .object({
    id: z.string().optional(),
    line_role: z.enum(["standalone", "kit_header", "kit_component"]),
    description: z.string(),
    quantity: z.number(),
    qty_manual: z.boolean().optional(),
    unit: z.string(),
    unit_cost: z.number(),
    unit_price: z.number(),
    unit_material: z.number().optional(),
    unit_labor: z.number().optional(),
    unit_incidental: z.number().optional(),
    unit_freight: z.number().optional(),
    unit_price_target: z.number().optional(),
    estimate_condition_id: z.string(),
    allocations: z.array(EstimateLineAllocationPatchElementSchema).optional(),
    lock: z.enum(["none", "sell", "line"]).optional(),
    phase_id: z.string().nullable().optional(),
    item_id: z.string().nullable().optional(),
    part_id: z.string().nullable().optional(),
    vendor_part_id: z.string().nullable().optional(),
    parent_line_id: z.string().nullable().optional(),
  })
  .strict();

/** Hand-written — codegen stubs collections with placeholder `user_id`. */
export const EstimateDetailPatchSchema = z
  .object({
    profile: z
      .object({
        id: z.string().optional(),
        title: z.string().optional(),
        site_id: z.string().optional(),
        estimate_date: z.string().nullable().optional(),
        valid_until: z.string().nullable().optional(),
        source_estimate_id: z.string().nullable().optional(),
        item_id: z.string().nullable().optional(),
      })
      .strict()
      .optional(),
    stakeholders: z.array(EstimateStakeholderPatchElementSchema).optional(),
    conditions: z.array(EstimateConditionPatchElementSchema).optional(),
    line_items: z.array(EstimateLineItemPatchElementSchema).optional(),
  })
  .strict();

/** POST body — `profile.title` and `profile.site_id` required; status defaults to `draft`. */
export const EstimateDetailCreateSchema = z
  .object({
    profile: z
      .object({
        title: z.string().min(1),
        site_id: z.string(),
        estimate_date: z.string().nullable().optional(),
        valid_until: z.string().nullable().optional(),
        source_estimate_id: z.string().nullable().optional(),
        item_id: z.string().nullable().optional(),
      })
      .strict(),
    stakeholders: z.array(EstimateStakeholderPatchElementSchema).optional(),
    conditions: z.array(EstimateConditionPatchElementSchema).optional(),
    line_items: z.array(EstimateLineItemPatchElementSchema).optional(),
  })
  .strict();

export type EstimateDetailRow = {
  item_id: string | null;
  estimate_date: string | null;
  id: string;
  site_display_name: string;
  site_id: string;
  source_estimate_id: string | null;
  status: string;
  title: string;
  valid_until: string | null;
};

export type EstimateStakeholderRow = {
  display_name: string;
  kind: string;
  party_id: string;
  relation_id: string;
  relation_label: string;
  sort_order: number;
};

export type EstimateSiteZoneTreeRow = {
  id: string;
  name: string;
  zones?: EstimateSiteZoneTreeRow[];
};

export type EstimateSiteScopeTreeRow = {
  id: string;
  name: string;
  root_item_id: string;
  zones: EstimateSiteZoneTreeRow[];
};

export type EstimateSiteTreeRow = {
  scopes: EstimateSiteScopeTreeRow[];
  spec_templates: Record<string, EstimateConditionSpecRow[]>;
};

export type EstimateConditionLaborPhaseRow = {
  labor_phase_id: string;
  labor_phase_name: string;
  sort_order: number;
};

export type EstimateConditionSpecRow = {
  decimal_places: number | null;
  def_display_name: string;
  option_display_name: string | null;
  options?: Array<{ display_name: string; id: string }>;
  spec_def_id: string;
  spec_option_id: string | null;
  to_canonical_factor: number;
  unit_symbol: string | null;
  value_boolean: boolean | null;
  value_number: number | null;
  value_type: "enum" | "boolean" | "number";
};

/** @deprecated Alias — prefer EstimateConditionSpecRow / EstimateConditionLaborPhaseRow. */
export type EstimateScopeSpecRow = EstimateConditionSpecRow;
/** @deprecated Alias — prefer EstimateConditionLaborPhaseRow. */
export type EstimateScopeLaborPhaseRow = EstimateConditionLaborPhaseRow;

export type EstimateConditionRow = {
  complexity_factor_id: string | null;
  conditions: EstimateConditionRow[];
  id: string;
  included_labor_phases: EstimateConditionLaborPhaseRow[];
  labor_phases_explicit: boolean;
  name: string;
  parent_condition_id: string | null;
  root_item_id: string | null;
  root_item_name: string | null;
  sort_order: number;
  specs: EstimateConditionSpecRow[];
};

export type EstimateLineAllocationRow = {
  quantity: number;
  site_zone_id: string;
  site_zone_name?: string | null;
};

export type EstimateLineItemRow = {
  allocations: EstimateLineAllocationRow[];
  description: string;
  estimate_condition_id: string;
  id: string;
  item_id: string | null;
  line_number: number;
  line_role: string;
  lock: "line" | "none" | "sell";
  parent_line_id: string | null;
  part_id: string | null;
  phase_id: string | null;
  qty_manual: boolean;
  quantity: number;
  sort_order: number;
  unit: string;
  unit_cost: number;
  unit_freight: number;
  unit_incidental: number;
  unit_labor: number;
  unit_material: number;
  unit_price: number;
  unit_price_target: number | null;
  vendor_part_id: string | null;
};

export type EstimateDetailRelated = {
  conditions: EstimateConditionRow[];
  line_items: EstimateLineItemRow[];
  site_tree: EstimateSiteTreeRow | null;
  stakeholders: EstimateStakeholderRow[];
};

export type EstimateStakeholderPatchRow = {
  party_id: string;
  relation_id: string;
};

export type EstimateConditionSpecPatchRow = z.infer<
  typeof EstimateConditionSpecPatchElementSchema
>;

/** @deprecated Prefer EstimateConditionSpecPatchRow. */
export type EstimateScopeSpecPatchRow = EstimateConditionSpecPatchRow;

export type EstimateConditionPatchRow = z.infer<
  typeof EstimateConditionPatchElementSchema
>;

export type EstimateLineAllocationPatchRow = z.infer<
  typeof EstimateLineAllocationPatchElementSchema
>;

export type EstimateLineItemPatchRow = z.infer<
  typeof EstimateLineItemPatchElementSchema
>;

export type EstimateDetailWriteRow = Pick<
  EstimateDetailRow,
  | "id"
  | "title"
  | "site_id"
  | "estimate_date"
  | "valid_until"
  | "source_estimate_id"
  | "item_id"
>;

export type EstimateDetailRelatedPatch = {
  conditions?: EstimateConditionPatchRow[];
  line_items?: EstimateLineItemPatchRow[];
  stakeholders?: EstimateStakeholderPatchRow[];
};

export type EstimateDetailStoreRelated =
  | EstimateDetailRelated
  | EstimateDetailRelatedPatch;

const formatEstimateDetailRow = (row: EstimateDetailRow): Record<string, unknown> => ({
  item_id: row.item_id,
  estimate_date: row.estimate_date,
  id: row.id,
  site_display_name: row.site_display_name,
  site_id: row.site_id,
  source_estimate_id: row.source_estimate_id,
  status: row.status,
  title: row.title,
  valid_until: row.valid_until,
});

const normalizeEstimateDetailRelated = (
  related: EstimateDetailStoreRelated,
): EstimateDetailRelated => ({
  stakeholders: (related.stakeholders ?? []) as EstimateStakeholderRow[],
  conditions: (related.conditions ?? []) as EstimateConditionRow[],
  site_tree: (related as EstimateDetailRelated).site_tree ?? null,
  line_items: (related.line_items ?? []) as EstimateLineItemRow[],
});

export const projectEstimateDetailRow = (
  row: EstimateDetailRow,
  manifest: Manifest,
  related: EstimateDetailStoreRelated,
): Record<string, unknown> => {
  const normalized = normalizeEstimateDetailRelated(related);
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.profile?.includes("read")) {
    dto.profile = {
      id: row.id,
      title: row.title,
      site_id: row.site_id,
      site_display_name: row.site_display_name,
      status: row.status,
      estimate_date: row.estimate_date,
      valid_until: row.valid_until,
      source_estimate_id: row.source_estimate_id,
      item_id: row.item_id,
    };
  }

  if (manifest.fields.stakeholders?.includes("read")) {
    dto.stakeholders = normalized.stakeholders;
  }

  if (manifest.fields.conditions?.includes("read")) {
    dto.conditions = normalized.conditions;
    if (normalized.site_tree) {
      dto.site_tree = normalized.site_tree;
    }
  }

  if (manifest.fields.line_items?.includes("read")) {
    dto.line_items = normalized.line_items;
  }

  return dto;
};

const applyEstimateDetailPatch = (
  row: EstimateDetailRow,
  patch: Record<string, unknown>,
): EstimateDetailRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof EstimateDetailPatchSchema>;

  if (typed.profile?.id !== undefined) {
    next.id = typed.profile.id;
  }
  if (typed.profile?.title !== undefined) {
    next.title = typed.profile.title;
  }
  if (typed.profile?.site_id !== undefined) {
    next.site_id = typed.profile.site_id;
  }
  if (typed.profile?.estimate_date !== undefined) {
    next.estimate_date = typed.profile.estimate_date;
  }
  if (typed.profile?.valid_until !== undefined) {
    next.valid_until = typed.profile.valid_until;
  }
  if (typed.profile?.source_estimate_id !== undefined) {
    next.source_estimate_id = typed.profile.source_estimate_id;
  }
  if (typed.profile?.item_id !== undefined) {
    next.item_id = typed.profile.item_id;
  }

  return next;
};

export const estimateDetailDescriptor: SurfaceDescriptor<
  EstimateDetailRow,
  EstimateDetailStoreRelated
> = {
  surfaceId: "estimate_detail",
  anchorTable: "estimate",
  capabilities: ["detail"],
  patchSchema: EstimateDetailPatchSchema,
  deleteAuditFieldId: "profile",
  projectRow: projectEstimateDetailRow,
  applyPatch: applyEstimateDetailPatch,
  applyRelatedPatch: (_entityId, patch) => {
    const typed = patch as z.infer<typeof EstimateDetailPatchSchema>;
    const related: EstimateDetailRelatedPatch = {};

    if (typed.stakeholders !== undefined) {
      related.stakeholders = typed.stakeholders;
    }
    if (typed.conditions !== undefined) {
      related.conditions = typed.conditions;
    }
    if (typed.line_items !== undefined) {
      related.line_items = typed.line_items;
    }

    return Object.keys(related).length > 0 ? related : undefined;
  },
  auditSnapshot: formatEstimateDetailRow,
  deleteAuditSnapshot: (row, related) => ({
    ...formatEstimateDetailRow(row),
    stakeholders: normalizeEstimateDetailRelated(related).stakeholders,
    conditions: normalizeEstimateDetailRelated(related).conditions,
    line_items: normalizeEstimateDetailRelated(related).line_items,
  }),
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};

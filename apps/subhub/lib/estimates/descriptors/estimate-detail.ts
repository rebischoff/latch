import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

const EstimateStakeholderPatchElementSchema = z
  .object({
    party_id: z.string(),
    relation_id: z.string(),
  })
  .strict();

const EstimateLineItemPatchElementSchema = z
  .object({
    id: z.string().optional(),
    line_role: z.enum(["standalone", "kit_header", "kit_component"]),
    line_kind: z.enum(["product", "labor", "expense"]),
    description: z.string(),
    quantity: z.number(),
    unit: z.string(),
    unit_cost: z.number(),
    unit_price: z.number(),
    estimate_section_id: z.string().nullable().optional(),
    site_location_id: z.string().nullable().optional(),
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
        category_id: z.string().nullable().optional(),
      })
      .strict()
      .optional(),
    stakeholders: z.array(EstimateStakeholderPatchElementSchema).optional(),
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
        category_id: z.string().nullable().optional(),
      })
      .strict(),
    stakeholders: z.array(EstimateStakeholderPatchElementSchema).optional(),
    line_items: z.array(EstimateLineItemPatchElementSchema).optional(),
  })
  .strict();

export type EstimateDetailRow = {
  category_id: string | null;
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

export type EstimateLineItemRow = {
  description: string;
  estimate_section_id: string | null;
  id: string;
  item_id: string | null;
  line_kind: string;
  line_number: number;
  line_role: string;
  parent_line_id: string | null;
  part_id: string | null;
  phase_id: string | null;
  quantity: number;
  site_location_id: string | null;
  sort_order: number;
  unit: string;
  unit_cost: number;
  unit_price: number;
  vendor_part_id: string | null;
};

export type EstimateDetailRelated = {
  line_items: EstimateLineItemRow[];
  stakeholders: EstimateStakeholderRow[];
};

export type EstimateStakeholderPatchRow = {
  party_id: string;
  relation_id: string;
};

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
  | "category_id"
>;

export type EstimateDetailRelatedPatch = {
  line_items?: EstimateLineItemPatchRow[];
  stakeholders?: EstimateStakeholderPatchRow[];
};

export type EstimateDetailStoreRelated =
  | EstimateDetailRelated
  | EstimateDetailRelatedPatch;

const formatEstimateDetailRow = (row: EstimateDetailRow): Record<string, unknown> => ({
  category_id: row.category_id,
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
      category_id: row.category_id,
    };
  }

  if (manifest.fields.stakeholders?.includes("read")) {
    dto.stakeholders = normalized.stakeholders;
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
  if (typed.profile?.category_id !== undefined) {
    next.category_id = typed.profile.category_id;
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
    if (typed.line_items !== undefined) {
      related.line_items = typed.line_items;
    }

    return Object.keys(related).length > 0 ? related : undefined;
  },
  auditSnapshot: formatEstimateDetailRow,
  deleteAuditSnapshot: (row, related) => ({
    ...formatEstimateDetailRow(row),
    stakeholders: normalizeEstimateDetailRelated(related).stakeholders,
    line_items: normalizeEstimateDetailRelated(related).line_items,
  }),
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};

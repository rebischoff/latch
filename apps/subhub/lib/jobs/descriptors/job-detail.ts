import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import type { JobCostSummary } from "../repository/job-cost-summary";

const JobStakeholderPatchElementSchema = z
  .object({
    party_id: z.string(),
    relation_id: z.string(),
  })
  .strict();

const JobLineItemPatchElementSchema = z
  .object({
    id: z.string().optional(),
    line_role: z.enum(["standalone", "kit_header", "kit_component"]),
    line_kind: z.enum(["product", "labor", "expense"]),
    description: z.string(),
    quantity: z.number(),
    unit: z.string(),
    unit_cost: z.number(),
    unit_price: z.number(),
    site_zone_id: z.string().nullable().optional(),
    site_asset_id: z.string().nullable().optional(),
    phase_id: z.string().nullable().optional(),
    item_id: z.string().nullable().optional(),
    part_id: z.string().nullable().optional(),
    vendor_part_id: z.string().nullable().optional(),
    parent_line_id: z.string().nullable().optional(),
    source: z.enum(["estimate", "change_order", "manual"]).optional(),
    status: z.enum(["active", "voided", "superseded"]).optional(),
    estimate_line_id: z.string().nullable().optional(),
    change_order_line_id: z.string().nullable().optional(),
    superseded_by_job_line_id: z.string().nullable().optional(),
  })
  .strict();

/** Hand-written — codegen stubs collections with placeholder `user_id`. */
export const JobDetailPatchSchema = z
  .object({
    profile: z
      .object({
        id: z.string().optional(),
        title: z.string().optional(),
        site_id: z.string().optional(),
        job_kind: z.string().optional(),
        status: z.string().optional(),
      })
      .strict()
      .optional(),
    stakeholders: z.array(JobStakeholderPatchElementSchema).optional(),
  })
  .strict();

/** POST body — `profile.title` and `profile.site_id` required; defaults `job_kind = project`, `status = planned`. */
export const JobDetailCreateSchema = z
  .object({
    profile: z
      .object({
        title: z.string().min(1),
        site_id: z.string(),
      })
      .strict(),
    stakeholders: z.array(JobStakeholderPatchElementSchema).optional(),
  })
  .strict();

export type JobDetailRow = {
  estimate_display_title: string | null;
  estimate_id: string | null;
  id: string;
  job_kind: string;
  site_display_name: string;
  site_id: string;
  status: string;
  title: string;
};

export type JobStakeholderRow = {
  display_name: string;
  kind: string;
  party_id: string;
  relation_id: string;
  relation_label: string;
  sort_order: number;
};

export type JobDetailRelated = {
  cost_summary: JobCostSummary;
  line_items: JobLineItemRow[];
  stakeholders: JobStakeholderRow[];
};

export type JobStakeholderPatchRow = {
  party_id: string;
  relation_id: string;
};

export type JobLineItemRow = {
  change_order_line_id: string | null;
  description: string;
  estimate_line_id: string | null;
  id: string;
  item_id: string | null;
  line_kind: string;
  line_number: number;
  line_role: string;
  parent_line_id: string | null;
  part_id: string | null;
  phase_id: string | null;
  quantity: number;
  site_zone_id: string | null;
  site_asset_id: string | null;
  sort_order: number;
  source: string;
  status: string;
  superseded_by_job_line_id: string | null;
  unit: string;
  unit_cost: number;
  unit_price: number;
  vendor_part_id: string | null;
};

export type JobLineItemPatchRow = z.infer<typeof JobLineItemPatchElementSchema>;

export type JobDetailWriteRow = Pick<
  JobDetailRow,
  "id" | "title" | "site_id" | "job_kind" | "status"
>;

export type JobDetailRelatedPatch = {
  line_items?: JobLineItemPatchRow[];
  stakeholders?: JobStakeholderPatchRow[];
};

export type JobDetailStoreRelated = JobDetailRelated | JobDetailRelatedPatch;

const formatJobDetailRow = (row: JobDetailRow): Record<string, unknown> => ({
  estimate_display_title: row.estimate_display_title,
  estimate_id: row.estimate_id,
  id: row.id,
  job_kind: row.job_kind,
  site_display_name: row.site_display_name,
  site_id: row.site_id,
  status: row.status,
  title: row.title,
});

const normalizeJobDetailRelated = (
  related: JobDetailStoreRelated,
): JobDetailRelated => ({
  cost_summary: (related as JobDetailRelated).cost_summary ?? {
    contract: 0,
    budget: 0,
    rebudgeted: 0,
    committed: 0,
    actual_material: 0,
    margin_vs_budget: 0,
    margin_vs_rebudgeted: 0,
    margin_vs_actual: 0,
  },
  line_items: (related.line_items ?? []) as JobLineItemRow[],
  stakeholders: (related.stakeholders ?? []) as JobStakeholderRow[],
});

export const projectJobDetailRow = (
  row: JobDetailRow,
  manifest: Manifest,
  related: JobDetailStoreRelated,
): Record<string, unknown> => {
  const normalized = normalizeJobDetailRelated(related);
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.profile?.includes("read")) {
    dto.profile = {
      id: row.id,
      title: row.title,
      site_id: row.site_id,
      site_display_name: row.site_display_name,
      job_kind: row.job_kind,
      status: row.status,
      estimate_id: row.estimate_id,
      estimate_display_title: row.estimate_display_title,
    };
    // Derived cost layers (task 45) — not a separate Surface Field.
    dto.cost_summary = normalized.cost_summary;
  }

  if (manifest.fields.stakeholders?.includes("read")) {
    dto.stakeholders = normalized.stakeholders;
  }

  if (manifest.fields.line_items?.includes("read")) {
    dto.line_items = normalized.line_items;
  }

  return dto;
};

const applyJobDetailPatch = (
  row: JobDetailRow,
  patch: Record<string, unknown>,
): JobDetailRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof JobDetailPatchSchema>;

  if (typed.profile?.id !== undefined) {
    next.id = typed.profile.id;
  }
  if (typed.profile?.title !== undefined) {
    next.title = typed.profile.title;
  }
  if (typed.profile?.site_id !== undefined) {
    next.site_id = typed.profile.site_id;
  }
  if (typed.profile?.job_kind !== undefined) {
    next.job_kind = typed.profile.job_kind;
  }
  if (typed.profile?.status !== undefined) {
    next.status = typed.profile.status;
  }

  return next;
};

export const jobDetailDescriptor: SurfaceDescriptor<
  JobDetailRow,
  JobDetailStoreRelated
> = {
  surfaceId: "job_detail",
  anchorTable: "job",
  capabilities: ["detail"],
  patchSchema: JobDetailPatchSchema,
  deleteAuditFieldId: "profile",
  projectRow: projectJobDetailRow,
  applyPatch: applyJobDetailPatch,
  applyRelatedPatch: (_entityId, patch) => {
    const typed = patch as z.infer<typeof JobDetailPatchSchema>;
    const related: JobDetailRelatedPatch = {};

    if (typed.stakeholders !== undefined) {
      related.stakeholders = typed.stakeholders;
    }

    return Object.keys(related).length > 0 ? related : undefined;
  },
  auditSnapshot: formatJobDetailRow,
  deleteAuditSnapshot: (row, related) => ({
    ...formatJobDetailRow(row),
    line_items: normalizeJobDetailRelated(related).line_items,
    stakeholders: normalizeJobDetailRelated(related).stakeholders,
  }),
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};

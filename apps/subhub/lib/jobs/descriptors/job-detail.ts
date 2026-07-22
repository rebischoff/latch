import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import type { JobCostSummary } from "../repository/job-cost-summary";
import type {
  JobFieldProgressCellPatch,
  JobFieldProgressDto,
} from "../repository/job-field-progress";
import type { JobFieldOrderCellPatch } from "../repository/job-field-order";
import type {
  JobFieldIssuePatch,
} from "../repository/job-issue";

const JobStakeholderPatchElementSchema = z
  .object({
    party_id: z.string(),
    relation_id: z.string(),
  })
  .strict();

const JobFieldProgressCellPatchElementSchema = z
  .object({
    scope_phase_id: z.string(),
    site_zone_id: z.string().nullable(),
    complete: z.boolean(),
  })
  .strict();

const JobFieldOrderCellPatchElementSchema = z
  .object({
    scope_phase_id: z.string(),
    site_zone_id: z.string().nullable(),
    requested: z.boolean(),
  })
  .strict();

const JobFieldIssuePatchElementSchema = z.discriminatedUnion("op", [
  z
    .object({
      op: z.literal("create"),
      temp_id: z.string(),
      site_zone_id: z.string().nullable(),
      description: z.string(),
    })
    .strict(),
  z
    .object({
      op: z.literal("update"),
      id: z.string(),
      description: z.string(),
    })
    .strict(),
  z
    .object({
      op: z.literal("resolve"),
      id: z.string(),
      resolution_note: z.string(),
    })
    .strict(),
  z
    .object({
      op: z.literal("cancel"),
      id: z.string(),
      resolution_note: z.string().optional(),
    })
    .strict(),
  z
    .object({
      op: z.literal("delete"),
      id: z.string(),
    })
    .strict(),
]);

const JobConditionLaborPhasePatchElementSchema = z
  .object({
    labor_phase_id: z.string(),
  })
  .strict();

const JobConditionSpecPatchElementSchema = z
  .object({
    spec_def_id: z.string(),
    spec_option_id: z.string().nullable().optional(),
    value_number: z.number().nullable().optional(),
    value_number_max: z.number().nullable().optional(),
    value_boolean: z.boolean().nullable().optional(),
  })
  .strict();

/**
 * Engineering condition PATCH. `complexity_factor_id_at_win` is intentionally
 * NOT writable (48 JC5) — win seeds it; manual / post-win adds keep null.
 */
const JobConditionPatchElementSchema: z.ZodType<{
  complexity_factor_id?: string | null;
  conditions?: unknown[];
  id?: string;
  include_discontinued?: boolean;
  include_discontinued_explicit?: boolean;
  included_labor_phases?: Array<{ labor_phase_id: string }>;
  labor_only?: boolean;
  labor_only_explicit?: boolean;
  labor_phases_explicit?: boolean;
  name: string;
  parent_condition_id?: string | null;
  site_zone_id?: string | null;
  sort_order: number;
  specs: Array<{
    spec_def_id: string;
    spec_option_id?: string | null;
    value_boolean?: boolean | null;
    value_number?: number | null;
    value_number_max?: number | null;
  }>;
}> = z.lazy(() =>
  z
    .object({
      id: z.string().optional(),
      name: z.string().min(1),
      parent_condition_id: z.string().nullable().optional(),
      site_zone_id: z.string().nullable().optional(),
      sort_order: z.number(),
      complexity_factor_id: z.string().nullable().optional(),
      include_discontinued: z.boolean().optional(),
      include_discontinued_explicit: z.boolean().optional(),
      labor_only: z.boolean().optional(),
      labor_only_explicit: z.boolean().optional(),
      labor_phases_explicit: z.boolean().optional(),
      included_labor_phases: z
        .array(JobConditionLaborPhasePatchElementSchema)
        .optional(),
      specs: z.array(JobConditionSpecPatchElementSchema),
      conditions: z.array(JobConditionPatchElementSchema).optional(),
    })
    .strict(),
);

const JobLineAllocationPatchElementSchema = z
  .object({
    site_zone_id: z.string(),
    quantity: z.number().positive(),
  })
  .strict();

/**
 * Engineering line PATCH. Sold snapshot columns (`sold_*` / `sold_quantity`) are
 * intentionally NOT writable from the client (Scope-F1 / 47 JLI): new lines
 * default to `sold_* = 0` / `sold_quantity = 0` server-side; existing sold lines
 * keep their DB snapshot. Working `quantity` is writable.
 */
const JobLineItemPatchElementSchema = z
  .object({
    id: z.string().optional(),
    line_role: z.enum(["standalone", "kit_header", "kit_component"]),
    line_kind: z.enum(["product", "labor", "expense"]).optional(),
    description: z.string(),
    quantity: z.number(),
    qty_manual: z.boolean().optional(),
    unit: z.string(),
    unit_cost: z.number(),
    unit_price: z.number(),
    unit_material: z.number().optional(),
    unit_labor: z.number().optional(),
    unit_freight: z.number().optional(),
    unit_incidental: z.number().optional(),
    unit_price_target: z.number().nullable().optional(),
    job_condition_id: z.string().nullable().optional(),
    allocations: z.array(JobLineAllocationPatchElementSchema).optional(),
    sales_locked: z.boolean().optional(),
    material_locked: z.boolean().optional(),
    material_phase_id: z.string().nullable().optional(),
    site_zone_id: z.string().nullable().optional(),
    site_asset_id: z.string().nullable().optional(),
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
    conditions: z.array(JobConditionPatchElementSchema).optional(),
    line_items: z.array(JobLineItemPatchElementSchema).optional(),
    /** Replace-array of zone×phase cells (task 51). */
    field_progress: z.array(JobFieldProgressCellPatchElementSchema).optional(),
    /** Replace-array of zone×material-phase Order cells (task 62). */
    field_zone_orders: z.array(JobFieldOrderCellPatchElementSchema).optional(),
    /** Pending issue create/update/resolve/cancel (tasks 57 / 60). */
    field_issues: z.array(JobFieldIssuePatchElementSchema).optional(),
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
    conditions: z.array(JobConditionPatchElementSchema).optional(),
    line_items: z.array(JobLineItemPatchElementSchema).optional(),
  })
  .strict();

export type JobDetailRow = {
  catalog_scope_display_name: string | null;
  catalog_scope_item_id: string | null;
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

export type JobConditionLaborPhaseRow = {
  labor_phase_id: string;
  labor_phase_name: string;
  sort_order: number;
};

export type JobConditionSpecRow = {
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
  value_number_max: number | null;
  value_type: "enum" | "boolean" | "number";
};

export type JobConditionRow = {
  complexity_factor_id: string | null;
  /** Win-time snapshot (JC5); read-only — not in writable patch schema. */
  complexity_factor_id_at_win: string | null;
  conditions: JobConditionRow[];
  id: string;
  include_discontinued: boolean;
  include_discontinued_explicit: boolean;
  included_labor_phases: JobConditionLaborPhaseRow[];
  labor_only: boolean;
  labor_only_explicit: boolean;
  labor_phases_explicit: boolean;
  name: string;
  parent_condition_id: string | null;
  root_item_id: string | null;
  root_item_name: string | null;
  site_zone_id: string | null;
  site_zone_name: string | null;
  sort_order: number;
  specs: JobConditionSpecRow[];
};

export type JobLineAllocationRow = {
  quantity: number;
  site_zone_id: string;
  site_zone_name?: string | null;
};

export type JobDetailRelated = {
  cost_summary: JobCostSummary;
  conditions: JobConditionRow[];
  field_progress: JobFieldProgressDto;
  line_items: JobLineItemRow[];
  stakeholders: JobStakeholderRow[];
};

export type JobStakeholderPatchRow = {
  party_id: string;
  relation_id: string;
};

export type JobLineItemRow = {
  allocations: JobLineAllocationRow[];
  change_order_line_id: string | null;
  description: string;
  estimate_line_id: string | null;
  id: string;
  item_id: string | null;
  item_name: string | null;
  job_condition_id: string | null;
  line_kind: string;
  line_number: number;
  line_role: string;
  material_locked: boolean;
  material_phase_id: string | null;
  /** Seeded scope_phase labor phases for this line (material phase override options). */
  material_phase_options: Array<{
    labor_phase_id: string;
    labor_phase_name: string;
  }>;
  /** Open / on-PO JMR exists for this line's parts (UI unlock warn). */
  has_open_material_demand: boolean;
  parent_line_id: string | null;
  part_id: string | null;
  part_mpn: string | null;
  qty_manual: boolean;
  quantity: number;
  sales_locked: boolean;
  site_zone_id: string | null;
  site_asset_id: string | null;
  sold_quantity: number;
  sold_unit_cost: number;
  sold_unit_freight: number;
  sold_unit_incidental: number;
  sold_unit_labor: number;
  sold_unit_material: number;
  sold_unit_price: number;
  sort_order: number;
  source: string;
  status: string;
  superseded_by_job_line_id: string | null;
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

export type JobConditionSpecPatchRow = z.infer<
  typeof JobConditionSpecPatchElementSchema
>;

export type JobConditionPatchRow = z.infer<typeof JobConditionPatchElementSchema>;

export type JobLineAllocationPatchRow = z.infer<
  typeof JobLineAllocationPatchElementSchema
>;

export type JobLineItemPatchRow = z.infer<typeof JobLineItemPatchElementSchema>;

export type JobDetailWriteRow = Pick<
  JobDetailRow,
  "id" | "title" | "site_id" | "job_kind" | "status"
>;

export type JobFieldProgressPatchRow = JobFieldProgressCellPatch;

export type JobFieldOrderPatchRow = JobFieldOrderCellPatch;

export type JobFieldIssuePatchRow = JobFieldIssuePatch;

export type JobDetailRelatedPatch = {
  conditions?: JobConditionPatchRow[];
  field_issues?: JobFieldIssuePatchRow[];
  field_progress?: JobFieldProgressPatchRow[];
  field_zone_orders?: JobFieldOrderPatchRow[];
  line_items?: JobLineItemPatchRow[];
  stakeholders?: JobStakeholderPatchRow[];
};

export type JobDetailStoreRelated = JobDetailRelated | JobDetailRelatedPatch;

const formatJobDetailRow = (row: JobDetailRow): Record<string, unknown> => ({
  catalog_scope_display_name: row.catalog_scope_display_name,
  catalog_scope_item_id: row.catalog_scope_item_id,
  estimate_display_title: row.estimate_display_title,
  estimate_id: row.estimate_id,
  id: row.id,
  job_kind: row.job_kind,
  site_display_name: row.site_display_name,
  site_id: row.site_id,
  status: row.status,
  title: row.title,
});

const emptyFieldProgress = (): JobFieldProgressDto => ({
  cells: [],
  zone_tree: [],
  phases: [],
  work_rows: [],
  order_cells: [],
  order_rows: [],
  zone_orders: [],
  issues: [],
  scope_phase_index: [],
  progress_pct: 0,
  lifecycle: "not_started",
  stale: false,
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
  conditions: (related.conditions ?? []) as JobConditionRow[],
  field_progress:
    (related as JobDetailRelated).field_progress ?? emptyFieldProgress(),
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
      catalog_scope_item_id: row.catalog_scope_item_id,
      catalog_scope_display_name: row.catalog_scope_display_name,
    };
    // Derived cost layers (task 45) — not a separate Surface Field.
    dto.cost_summary = normalized.cost_summary;
  }

  if (manifest.fields.stakeholders?.includes("read")) {
    dto.stakeholders = normalized.stakeholders;
  }

  if (manifest.fields.conditions?.includes("read")) {
    dto.conditions = normalized.conditions;
  }

  if (manifest.fields.line_items?.includes("read")) {
    dto.line_items = normalized.line_items;
  }

  if (manifest.fields.field_progress?.includes("read")) {
    dto.field_progress = normalized.field_progress;
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
    if (typed.conditions !== undefined) {
      related.conditions = typed.conditions as JobConditionPatchRow[];
    }
    if (typed.line_items !== undefined) {
      related.line_items = typed.line_items as JobLineItemPatchRow[];
    }
    if (typed.field_progress !== undefined) {
      related.field_progress = typed.field_progress as JobFieldProgressPatchRow[];
    }
    if (typed.field_zone_orders !== undefined) {
      related.field_zone_orders =
        typed.field_zone_orders as JobFieldOrderPatchRow[];
    }
    if (typed.field_issues !== undefined) {
      related.field_issues = typed.field_issues as JobFieldIssuePatchRow[];
    }

    return Object.keys(related).length > 0 ? related : undefined;
  },
  auditSnapshot: formatJobDetailRow,
  deleteAuditSnapshot: (row, related) => ({
    ...formatJobDetailRow(row),
    conditions: normalizeJobDetailRelated(related).conditions,
    field_progress: normalizeJobDetailRelated(related).field_progress.cells,
    line_items: normalizeJobDetailRelated(related).line_items,
    stakeholders: normalizeJobDetailRelated(related).stakeholders,
  }),
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};

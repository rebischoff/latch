import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

const SpecOptionPatchElementSchema = z
  .object({
    id: z.string().optional(),
    code: z.string().nullable().optional(),
    display_name: z.string(),
    sort_order: z.number().optional(),
  })
  .strict();

const SpecDefinitionPatchElementSchema = z
  .object({
    id: z.string().optional(),
    code: z.string().nullable().optional(),
    display_name: z.string(),
    value_type: z.enum(["enum", "boolean", "text"]),
    filter_mode: z.enum(["required", "prefer"]).optional(),
    sort_order: z.number().optional(),
    options: z.array(SpecOptionPatchElementSchema),
  })
  .strict();

const SpecParticipationPatchElementSchema = z
  .object({
    spec_def_id: z.string(),
    active: z.boolean(),
  })
  .strict();

const SpecParticipationPatchSchema = z
  .object({
    participates: z.array(SpecParticipationPatchElementSchema),
  })
  .strict();

/** Hand-written — codegen stubs collections with placeholder `user_id`. */
export const CategoryDetailPatchSchema = z
  .object({
    profile: z
      .object({
        id: z.string().optional(),
        name: z.string().optional(),
        sort_order: z.number().optional(),
        csi_code: z.string().nullable().optional(),
        default_phase_template_id: z.string().nullable().optional(),
      })
      .strict()
      .optional(),
    spec_definitions: z.array(SpecDefinitionPatchElementSchema).optional(),
    spec_participation: SpecParticipationPatchSchema.optional(),
  })
  .strict();

/** POST body — `profile.name` required; optional `parent_id` for child create. */
export const CategoryDetailCreateSchema = z
  .object({
    profile: z
      .object({
        name: z.string().min(1),
        parent_id: z.string().nullable().optional(),
        sort_order: z.number().optional(),
        csi_code: z.string().nullable().optional(),
        default_phase_template_id: z.string().nullable().optional(),
      })
      .strict(),
    spec_definitions: z.array(SpecDefinitionPatchElementSchema).optional(),
    spec_participation: SpecParticipationPatchSchema.optional(),
  })
  .strict();

export type CategoryDetailRow = {
  csi_code: string | null;
  default_phase_template_id: string | null;
  id: string;
  is_root: boolean;
  name: string;
  parent_id: string | null;
  parent_name: string | null;
  root_category_id: string | null;
  root_category_name: string | null;
  sort_order: number;
};

export type SpecOptionRow = {
  code: string | null;
  display_name: string;
  id: string;
  sort_order: number;
};

export type SpecDefinitionRow = {
  code: string | null;
  display_name: string;
  filter_mode: "prefer" | "required";
  id: string;
  options: SpecOptionRow[];
  sort_order: number;
  value_boolean: boolean | null;
  value_text: string | null;
  value_type: "boolean" | "enum" | "text";
};

export type SpecParticipationState = "assigned" | "excluded" | "inherited" | "inactive";

export type SpecParticipationRow = {
  participates: Array<{
    active: boolean;
    assign_category_id: string | null;
    display_name: string;
    excluded_here: boolean;
    spec_def_id: string;
    state: SpecParticipationState;
    value_type: "boolean" | "enum" | "text";
  }>;
};

export type CategoryDetailRelated = {
  spec_definitions: SpecDefinitionRow[];
  spec_participation: SpecParticipationRow;
};

export type SpecOptionPatchRow = z.infer<typeof SpecOptionPatchElementSchema>;
export type SpecDefinitionPatchRow = z.infer<typeof SpecDefinitionPatchElementSchema>;
export type SpecParticipationPatchRow = z.infer<typeof SpecParticipationPatchElementSchema>;
export type SpecParticipationPatchBody = z.infer<typeof SpecParticipationPatchSchema>;

export type CategoryDetailRelatedPatch = {
  spec_definitions?: SpecDefinitionPatchRow[];
  spec_participation?: SpecParticipationPatchBody;
};

export type CategoryDetailStoreRelated =
  | CategoryDetailRelated
  | CategoryDetailRelatedPatch;

export type CategoryDetailWriteRow = Pick<
  CategoryDetailRow,
  | "id"
  | "name"
  | "parent_id"
  | "sort_order"
  | "csi_code"
  | "default_phase_template_id"
>;

const formatCategoryDetailRow = (row: CategoryDetailRow): Record<string, unknown> => ({
  csi_code: row.csi_code,
  default_phase_template_id: row.default_phase_template_id,
  id: row.id,
  is_root: row.is_root,
  name: row.name,
  parent_id: row.parent_id,
  parent_name: row.parent_name,
  root_category_id: row.root_category_id,
  root_category_name: row.root_category_name,
  sort_order: row.sort_order,
});

const emptySpecParticipation = (): SpecParticipationRow => ({
  participates: [],
});

const normalizeCategoryDetailRelated = (
  related: CategoryDetailStoreRelated,
): CategoryDetailRelated => ({
  spec_definitions: (related.spec_definitions ?? []) as SpecDefinitionRow[],
  spec_participation: (related.spec_participation ??
    emptySpecParticipation()) as SpecParticipationRow,
});

export const projectCategoryDetailRow = (
  row: CategoryDetailRow,
  manifest: Manifest,
  related: CategoryDetailStoreRelated,
): Record<string, unknown> => {
  const normalized = normalizeCategoryDetailRelated(related);
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.profile?.includes("read")) {
    dto.profile = {
      id: row.id,
      name: row.name,
      parent_id: row.parent_id,
      parent_name: row.parent_name,
      root_category_id: row.root_category_id,
      root_category_name: row.root_category_name,
      sort_order: row.sort_order,
      csi_code: row.csi_code,
      default_phase_template_id: row.default_phase_template_id,
      is_root: row.is_root,
    };
  }

  if (manifest.fields.spec_definitions?.includes("read")) {
    dto.spec_definitions = normalized.spec_definitions;
  }

  if (manifest.fields.spec_participation?.includes("read")) {
    dto.spec_participation = normalized.spec_participation;
  }

  return dto;
};

const applyCategoryDetailPatch = (
  row: CategoryDetailRow,
  patch: Record<string, unknown>,
): CategoryDetailRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof CategoryDetailPatchSchema>;

  if (typed.profile?.id !== undefined) {
    next.id = typed.profile.id;
  }
  if (typed.profile?.name !== undefined) {
    next.name = typed.profile.name;
  }
  if (typed.profile?.sort_order !== undefined) {
    next.sort_order = typed.profile.sort_order;
  }
  if (typed.profile?.csi_code !== undefined) {
    next.csi_code = typed.profile.csi_code;
  }
  if (typed.profile?.default_phase_template_id !== undefined) {
    next.default_phase_template_id = typed.profile.default_phase_template_id;
  }

  return next;
};

export const categoryDetailDescriptor: SurfaceDescriptor<
  CategoryDetailRow,
  CategoryDetailStoreRelated
> = {
  surfaceId: "category_detail",
  anchorTable: "category",
  capabilities: ["detail"],
  patchSchema: CategoryDetailPatchSchema,
  deleteAuditFieldId: "profile",
  projectRow: projectCategoryDetailRow,
  applyPatch: applyCategoryDetailPatch,
  applyRelatedPatch: (_entityId, patch) => {
    const typed = patch as z.infer<typeof CategoryDetailPatchSchema>;
    const related: CategoryDetailRelatedPatch = {};

    if (typed.spec_definitions !== undefined) {
      related.spec_definitions = typed.spec_definitions;
    }

    if (typed.spec_participation !== undefined) {
      related.spec_participation = typed.spec_participation;
    }

    return Object.keys(related).length > 0 ? related : undefined;
  },
  auditSnapshot: formatCategoryDetailRow,
  deleteAuditSnapshot: (row, related) => ({
    ...formatCategoryDetailRow(row),
    spec_definitions: normalizeCategoryDetailRelated(related).spec_definitions,
    spec_participation: normalizeCategoryDetailRelated(related).spec_participation,
  }),
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};

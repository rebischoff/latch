// DO NOT EDIT — generated from category_detail.surface.yaml

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  CategoryDetailPatchSchema,
} from "./category_detail.schema.generated";

export type CategoryDetailRow = {
  csi_code: string | null;
  default_phase_template_id: string | null;
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
};

const formatCategoryDetailRow = (row: CategoryDetailRow): Record<string, unknown> => ({
  csi_code: row.csi_code,
  default_phase_template_id: row.default_phase_template_id,
  id: row.id,
  name: row.name,
  parent_id: row.parent_id,
  sort_order: row.sort_order,
});

export const projectCategoryDetailRow = (
  row: CategoryDetailRow,
  manifest: Manifest,
  _related: unknown,
  _listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.profile?.includes("read")) {
    dto.profile = { id: row.id, name: row.name, parent_id: row.parent_id, sort_order: row.sort_order, csi_code: row.csi_code, default_phase_template_id: row.default_phase_template_id };
  }
  return dto;
};

export const applyCategoryDetailPatch = (
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
  if (typed.profile?.parent_id !== undefined) {
    next.parent_id = typed.profile.parent_id;
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

export const categoryDetailDescriptor: SurfaceDescriptor<CategoryDetailRow> = {
  surfaceId: "category_detail",
  anchorTable: "category",
  capabilities: ["detail"],
  patchSchema: CategoryDetailPatchSchema,
  deleteAuditFieldId: "profile",
  projectRow: projectCategoryDetailRow,
  applyPatch: applyCategoryDetailPatch,
  auditSnapshot: formatCategoryDetailRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import { CategoryListPatchSchema } from "../../../modules/catalog/generated/category_list.schema.generated";

export const CategoryListListQuerySchema = z.object({
  q: z.string().optional(),
});

export type CategoryTreeNode = {
  children: CategoryTreeNode[];
  id: string;
  is_root: boolean;
  name: string;
  parent_id: string | null;
  sort_order: number;
};

export type CategoryListRow = {
  id: string;
  tree: CategoryTreeNode[];
};

const formatCategoryListRow = (row: CategoryListRow): Record<string, unknown> => ({
  id: row.id,
  tree: row.tree,
});

export const projectCategoryListRow = (
  row: CategoryListRow,
  manifest: Manifest,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.tree?.includes("read")) {
    dto.tree = row.tree;
  }

  return dto;
};

const applyCategoryListPatch = (
  row: CategoryListRow,
  patch: Record<string, unknown>,
): CategoryListRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof CategoryListPatchSchema>;

  if (typed.tree !== undefined) {
    next.tree = typed.tree as unknown as CategoryTreeNode[];
  }

  return next;
};

export const categoryListDescriptor: SurfaceDescriptor<CategoryListRow> = {
  surfaceId: "category_list",
  anchorTable: "category",
  capabilities: ["list"],
  patchSchema: CategoryListPatchSchema,
  listQuerySchema: CategoryListListQuerySchema,
  deleteAuditFieldId: "tree",
  projectRow: projectCategoryListRow,
  applyPatch: applyCategoryListPatch,
  auditSnapshot: formatCategoryListRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};

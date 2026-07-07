import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import { ItemListPatchSchema } from "../../../modules/catalog/generated/item_list.schema.generated";

export const ItemListListQuerySchema = z.object({
  q: z.string().optional(),
});

export type ItemTreeNode = {
  children: ItemTreeNode[];
  id: string;
  is_root: boolean;
  name: string;
  node_type: "scope" | "category" | "item";
  parent_id: string | null;
  sort_order: number;
};

export type ItemListRow = {
  id: string;
  tree: ItemTreeNode[];
};

const formatItemListRow = (row: ItemListRow): Record<string, unknown> => ({
  id: row.id,
  tree: row.tree,
});

export const projectItemListRow = (
  row: ItemListRow,
  manifest: Manifest,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.tree?.includes("read")) {
    dto.tree = row.tree;
  }

  return dto;
};

const applyItemListPatch = (
  row: ItemListRow,
  patch: Record<string, unknown>,
): ItemListRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof ItemListPatchSchema>;

  if (typed.tree !== undefined) {
    next.tree = typed.tree as unknown as ItemTreeNode[];
  }

  return next;
};

export const itemListDescriptor: SurfaceDescriptor<ItemListRow> = {
  surfaceId: "item_list",
  anchorTable: "item",
  capabilities: ["list"],
  patchSchema: ItemListPatchSchema,
  listQuerySchema: ItemListListQuerySchema,
  deleteAuditFieldId: "tree",
  projectRow: projectItemListRow,
  applyPatch: applyItemListPatch,
  auditSnapshot: formatItemListRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};

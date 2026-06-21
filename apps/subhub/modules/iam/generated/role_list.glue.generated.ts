// DO NOT EDIT — generated from role_list.surface.yaml

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  RoleListPatchSchema,
} from "./role_list.schema.generated";


export const RoleListListQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});
export type RoleListRow = {
  display_name: string;
  id: string;
  role_class: string;
};

const formatRoleListRow = (row: RoleListRow): Record<string, unknown> => ({
  display_name: row.display_name,
  id: row.id,
  role_class: row.role_class,
});

export const projectRoleListRow = (
  row: RoleListRow,
  manifest: Manifest,
  _related: unknown,
  _listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.summary?.includes("read")) {
    dto.summary = { id: row.id, role_class: row.role_class, display_name: row.display_name };
  }
  return dto;
};

export const applyRoleListPatch = (
  row: RoleListRow,
  patch: Record<string, unknown>,
): RoleListRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof RoleListPatchSchema>;

  if (typed.summary?.id !== undefined) {
    next.id = typed.summary.id;
  }
  if (typed.summary?.role_class !== undefined) {
    next.role_class = typed.summary.role_class;
  }
  if (typed.summary?.display_name !== undefined) {
    next.display_name = typed.summary.display_name;
  }
  return next;
};

export const roleListDescriptor: SurfaceDescriptor<RoleListRow> = {
  surfaceId: "role_list",
  anchorTable: "latch_roles",
  capabilities: ["list"],
  patchSchema: RoleListPatchSchema,
  listQuerySchema: RoleListListQuerySchema,
  listDefaultPageSize: 50,
  deleteAuditFieldId: "summary",
  projectRow: projectRoleListRow,
  applyPatch: applyRoleListPatch,
  auditSnapshot: formatRoleListRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};

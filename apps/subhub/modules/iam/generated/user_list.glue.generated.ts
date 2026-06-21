// DO NOT EDIT — generated from user_list.surface.yaml

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  UserListPatchSchema,
} from "./user_list.schema.generated";


export const UserListListQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});
export type UserListRow = {
  id: string;
  login_email: string | null;
  login_name: string | null;
};

const formatUserListRow = (row: UserListRow): Record<string, unknown> => ({
  id: row.id,
  login_email: row.login_email,
  login_name: row.login_name,
});

export const projectUserListRow = (
  row: UserListRow,
  manifest: Manifest,
  _related: unknown,
  _listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.summary?.includes("read")) {
    dto.summary = { id: row.id, login_name: row.login_name, login_email: row.login_email };
  }
  return dto;
};

export const applyUserListPatch = (
  row: UserListRow,
  patch: Record<string, unknown>,
): UserListRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof UserListPatchSchema>;

  if (typed.summary?.id !== undefined) {
    next.id = typed.summary.id;
  }
  if (typed.summary?.login_name !== undefined) {
    next.login_name = typed.summary.login_name;
  }
  if (typed.summary?.login_email !== undefined) {
    next.login_email = typed.summary.login_email;
  }
  return next;
};

export const userListDescriptor: SurfaceDescriptor<UserListRow> = {
  surfaceId: "user_list",
  anchorTable: "latch_users",
  capabilities: ["list"],
  patchSchema: UserListPatchSchema,
  listQuerySchema: UserListListQuerySchema,
  listDefaultPageSize: 50,
  deleteAuditFieldId: "summary",
  projectRow: projectUserListRow,
  applyPatch: applyUserListPatch,
  auditSnapshot: formatUserListRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};

// DO NOT EDIT — generated from user_detail.surface.yaml

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  UserDetailPatchSchema,
} from "./user_detail.schema.generated.js";

export type UserDetailRow = {
  id: string;
  login_email: string | null;
  login_name: string | null;
};

const formatUserDetailRow = (row: UserDetailRow): Record<string, unknown> => ({
  id: row.id,
  login_email: row.login_email,
  login_name: row.login_name,
});

export const projectUserDetailRow = (
  row: UserDetailRow,
  manifest: Manifest,
  _related: unknown,
  _listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.profile?.includes("read")) {
    dto.profile = { id: row.id, login_name: row.login_name, login_email: row.login_email };
  }
  return dto;
};

export const applyUserDetailPatch = (
  row: UserDetailRow,
  patch: Record<string, unknown>,
): UserDetailRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof UserDetailPatchSchema>;

  if (typed.profile?.id !== undefined) {
    next.id = typed.profile.id;
  }
  if (typed.profile?.login_name !== undefined) {
    next.login_name = typed.profile.login_name;
  }
  if (typed.profile?.login_email !== undefined) {
    next.login_email = typed.profile.login_email;
  }
  return next;
};

export const userDetailDescriptor: SurfaceDescriptor<UserDetailRow> = {
  surfaceId: "user_detail",
  anchorTable: "latch_users",
  capabilities: ["detail"],
  patchSchema: UserDetailPatchSchema,
  deleteAuditFieldId: "profile",
  projectRow: projectUserDetailRow,
  applyPatch: applyUserDetailPatch,
  auditSnapshot: formatUserDetailRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};

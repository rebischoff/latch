import type { SurfaceDescriptor } from "@latch/dal";

import type { MemoryJobStore, MemoryUserRecord } from "../../../db/memory-store.js";
import { applyRoleAssignmentsPatch } from "./apply-patch.js";
import { projectUserRolesRow } from "./project.js";
import { UserRolesDetailPatchSchema } from "./schemas.js";

export const userRowAuditSnapshot = (
  row: MemoryUserRecord,
  roleIds: string[],
): Record<string, unknown> => ({
  id: row.id,
  display_name: row.displayName,
  role_assignments: [...roleIds],
});

export const createUserRolesDetailDescriptor = (
  store: MemoryJobStore,
): SurfaceDescriptor<MemoryUserRecord, string[]> => ({
  surfaceId: "user_roles_detail",
  anchorTable: "latch_users",
  capabilities: ["detail"],
  patchSchema: UserRolesDetailPatchSchema,
  deleteAuditFieldId: "profile",
  projectRow: (row, manifest, roleIds) =>
    projectUserRolesRow(row, manifest, roleIds),
  applyPatch: (row) => row,
  applyRelatedPatch: (entityId, patch) =>
    applyRoleAssignmentsPatch(
      entityId,
      patch as import("./schemas.js").UserRolesDetailPatchDto,
    ),
  auditSnapshot: (row) =>
    userRowAuditSnapshot(row, store.listRolesForUser(row.id)),
});

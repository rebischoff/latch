import type { SurfaceDescriptor } from "@latch/dal";

import { UserRolesDetailPatchSchema } from "../../modules/iam/generated/user_roles_detail.schema.generated.js";
import type { MemoryUserStore, MemoryUserRecord } from "./memory-user-store.js";
import { projectUserRolesRow } from "./project.js";
import {
  bindingsToDtos,
  dtosToBindings,
  type RoleAssignmentDto,
  type UserRoleBinding,
} from "./role-assignment.js";

export const userRowAuditSnapshot = (
  row: MemoryUserRecord,
  bindings: UserRoleBinding[],
): Record<string, unknown> => ({
  id: row.id,
  display_name: row.displayName,
  role_assignments: bindingsToDtos(bindings),
});

export const createUserRolesDetailDescriptor = (
  store: MemoryUserStore,
): SurfaceDescriptor<MemoryUserRecord, UserRoleBinding[]> => ({
  surfaceId: "user_roles_detail",
  anchorTable: "latch_users",
  capabilities: ["detail"],
  patchSchema: UserRolesDetailPatchSchema,
  deleteAuditFieldId: "profile",
  projectRow: (row, manifest, bindings) =>
    projectUserRolesRow(row, manifest, bindings),
  applyPatch: (row) => row,
  applyRelatedPatch: (_entityId, patch) => {
    const body = patch as { role_assignments?: RoleAssignmentDto[] };
    if (body.role_assignments === undefined) {
      return undefined;
    }
    return dtosToBindings(body.role_assignments);
  },
  auditSnapshot: (row) =>
    userRowAuditSnapshot(row, store.listBindingsForUser(row.id)),
});

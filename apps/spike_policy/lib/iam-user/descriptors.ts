import type { SurfaceDescriptor } from "@latch/dal";

import { UserRolesDetailPatchSchema } from "../../modules/iam/generated/user_roles_detail.schema.generated.js";
import type { MemoryUserStore, MemoryUserRecord } from "./memory-user-store.js";
import { projectUserRolesRow } from "./project.js";

export const userRowAuditSnapshot = (
  row: MemoryUserRecord,
  roleIds: string[],
): Record<string, unknown> => ({
  id: row.id,
  display_name: row.displayName,
  role_assignments: [...roleIds],
});

export const createUserRolesDetailDescriptor = (
  store: MemoryUserStore,
): SurfaceDescriptor<MemoryUserRecord, string[]> => ({
  surfaceId: "user_roles_detail",
  anchorTable: "latch_users",
  capabilities: ["detail"],
  patchSchema: UserRolesDetailPatchSchema,
  deleteAuditFieldId: "profile",
  projectRow: (row, manifest, roleIds) =>
    projectUserRolesRow(row, manifest, roleIds),
  applyPatch: (row) => row,
  applyRelatedPatch: (_entityId, patch) => {
    const body = patch as { role_assignments?: string[] };
    if (body.role_assignments === undefined) {
      return undefined;
    }
    return [...body.role_assignments].sort();
  },
  auditSnapshot: (row) =>
    userRowAuditSnapshot(row, store.listRolesForUser(row.id)),
});

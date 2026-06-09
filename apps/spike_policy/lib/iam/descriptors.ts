import type { SurfaceDescriptor } from "@latch/dal";

import { RoleDetailPatchSchema } from "../../modules/iam/generated/role_detail.schema.generated.js";
import { applyRoleDetailPatch } from "./apply-patch.js";
import type { MemoryRoleStore, RoleRecord, RoleRelatedData } from "./memory-role-store.js";
import { projectRoleDetailRow } from "./project.js";

export const roleAuditSnapshot = (
  row: RoleRecord,
  related: RoleRelatedData,
): Record<string, unknown> => ({
  id: row.id,
  display_name: row.displayName,
  role_class: row.roleClass,
  surface_bindings: related.bindings.map((binding) => ({
    surface_id: binding.surfaceId,
    row_scope: binding.rowScope,
  })),
  grants: related.grants.map((grant) => ({
    surface_id: grant.surfaceId,
    field_id: grant.fieldId,
    action: grant.action,
  })),
});

export const createRoleDetailDescriptor = (
  store: MemoryRoleStore,
): SurfaceDescriptor<RoleRecord, RoleRelatedData> => ({
  surfaceId: "role_detail",
  anchorTable: "latch_roles",
  capabilities: ["detail"],
  patchSchema: RoleDetailPatchSchema,
  deleteAuditFieldId: "catalog",
  projectRow: (row, manifest, related) => projectRoleDetailRow(row, manifest, related),
  applyPatch: (row, patch) =>
    applyRoleDetailPatch(row, store.getRelated(row.id), patch as import("../../modules/iam/generated/role_detail.schema.generated.js").RoleDetailPatchDto).row,
  applyRelatedPatch: (entityId, patch) => {
    const row = store.get(entityId);
    if (!row) {
      return undefined;
    }
    return applyRoleDetailPatch(
      row,
      store.getRelated(entityId),
      patch as import("../../modules/iam/generated/role_detail.schema.generated.js").RoleDetailPatchDto,
    ).related;
  },
  auditSnapshot: (row) => roleAuditSnapshot(row, store.getRelated(row.id)),
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
});

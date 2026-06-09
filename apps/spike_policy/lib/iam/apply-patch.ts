import type { RoleDetailPatchDto } from "../../modules/iam/generated/role_detail.schema.generated.js";
import type { GrantRecord, RoleRecord, RoleRelatedData } from "./memory-role-store.js";

export type RolePatchResult = {
  row: RoleRecord;
  related?: RoleRelatedData;
};

export const applyRoleDetailPatch = (
  row: RoleRecord,
  related: RoleRelatedData,
  patch: RoleDetailPatchDto,
): RolePatchResult => {
  let nextRow = row;
  let nextRelated: RoleRelatedData | undefined;

  if (patch.catalog?.display_name !== undefined) {
    nextRow = {
      ...row,
      displayName: patch.catalog.display_name,
    };
  }

  if (patch.surface_bindings !== undefined) {
    nextRelated = {
      bindings: patch.surface_bindings.map((binding) => ({
        surfaceId: binding.surface_id,
        rowScope: binding.row_scope,
      })),
      grants: related.grants,
    };
  }

  if (patch.grants !== undefined) {
    const bindings = nextRelated?.bindings ?? related.bindings;
    nextRelated = {
      bindings,
      grants: patch.grants.map((grant) => ({
        surfaceId: grant.surface_id,
        fieldId: grant.field_id,
        action: grant.action,
      })),
    };
  }

  return {
    row: nextRow,
    ...(nextRelated !== undefined ? { related: nextRelated } : {}),
  };
};

export const grantsFromPatch = (patch: RoleDetailPatchDto): GrantRecord[] | undefined =>
  patch.grants?.map((grant) => ({
    surfaceId: grant.surface_id,
    fieldId: grant.field_id,
    action: grant.action,
  }));

export const bindingsFromPatch = (
  patch: RoleDetailPatchDto,
): RoleRelatedData["bindings"] | undefined =>
  patch.surface_bindings?.map((binding) => ({
    surfaceId: binding.surface_id,
    rowScope: binding.row_scope,
  }));

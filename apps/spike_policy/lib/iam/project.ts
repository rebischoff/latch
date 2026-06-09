import { fieldAllows, type Manifest } from "@latch/contracts";

import type { RoleRecord, RoleRelatedData } from "./memory-role-store.js";

export type ProjectedRoleDetail = {
  id: string;
  catalog?: {
    id: string;
    display_name: string;
    role_class: RoleRecord["roleClass"];
  };
  surface_bindings?: Array<{
    surface_id: string;
    row_scope: "own" | "all" | null;
  }>;
  grants?: Array<{
    surface_id: string;
    field_id: string | null;
    action: string;
  }>;
};

export const projectRoleDetailRow = (
  row: RoleRecord,
  manifest: Manifest,
  related: RoleRelatedData,
): ProjectedRoleDetail => {
  const dto: ProjectedRoleDetail = { id: row.id };

  if (fieldAllows(manifest, "catalog", "read")) {
    dto.catalog = {
      id: row.id,
      display_name: row.displayName,
      role_class: row.roleClass,
    };
  }

  if (fieldAllows(manifest, "surface_bindings", "read")) {
    dto.surface_bindings = related.bindings.map((binding) => ({
      surface_id: binding.surfaceId,
      row_scope: binding.rowScope,
    }));
  }

  if (fieldAllows(manifest, "grants", "read")) {
    dto.grants = related.grants.map((grant) => ({
      surface_id: grant.surfaceId,
      field_id: grant.fieldId,
      action: grant.action,
    }));
  }

  return dto;
};

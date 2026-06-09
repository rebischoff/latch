import { ValidationError } from "@latch/contracts";
import {
  resolveGrantSurfaceDef,
  validateGrantTuple,
  type PolicyRegistry,
} from "@latch/policy";

import type { RoleDetailPatchDto } from "../../modules/iam/generated/role_detail.schema.generated.js";

/** Write-time validation for role-editor patches against the codegen vocabulary (P6). */
export const validateRoleDetailPatch = (
  patch: RoleDetailPatchDto,
  registry: PolicyRegistry,
): void => {
  if (patch.surface_bindings !== undefined) {
    for (const binding of patch.surface_bindings) {
      resolveGrantSurfaceDef(binding.surface_id, registry);
      if (
        binding.row_scope !== null &&
        binding.row_scope !== "own" &&
        binding.row_scope !== "all"
      ) {
        throw new ValidationError(`Invalid row_scope: ${binding.row_scope}`);
      }
    }
  }

  if (patch.grants !== undefined) {
    for (const grant of patch.grants) {
      validateGrantTuple(
        {
          surfaceId: grant.surface_id,
          fieldId: grant.field_id,
          action: grant.action,
        },
        registry,
      );
    }
  }
};

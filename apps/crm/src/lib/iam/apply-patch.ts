import type { UserRolesDetailPatchDto } from "./schemas.js";

/** Replace `latch_user_roles` for the anchor user when `role_assignments` is present. */
export const applyRoleAssignmentsPatch = (
  _userId: string,
  patch: UserRolesDetailPatchDto,
): string[] | undefined => {
  if (patch.role_assignments === undefined) {
    return undefined;
  }
  return [...patch.role_assignments];
};

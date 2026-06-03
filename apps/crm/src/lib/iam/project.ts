import { fieldAllows, type Manifest } from "@latch/contracts";

import type { MemoryUserRecord } from "../../../db/memory-store.js";

/** Read DTO for `user_roles_detail` — keys omitted when manifest denies `read`. */
export type ProjectedUserRolesDetail = {
  id: string;
  profile?: {
    id: string;
    display_name: string;
  };
  /** `role_id` values from `latch_user_roles` for the anchor user. */
  role_assignments?: string[];
};

export const projectUserRolesRow = (
  row: MemoryUserRecord,
  manifest: Manifest,
  roleIds: string[],
): ProjectedUserRolesDetail => {
  const dto: ProjectedUserRolesDetail = { id: row.id };

  if (fieldAllows(manifest, "profile", "read")) {
    dto.profile = {
      id: row.id,
      display_name: row.displayName,
    };
  }

  if (fieldAllows(manifest, "role_assignments", "read")) {
    dto.role_assignments = [...roleIds];
  }

  return dto;
};

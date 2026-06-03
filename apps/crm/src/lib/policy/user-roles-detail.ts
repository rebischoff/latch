import type { FieldAction, SurfacePolicies } from "@latch/contracts";

import {
  UserRolesDetailFieldIds,
  type UserRolesDetailFieldId,
} from "../../../modules/iam/generated/user_roles_detail.schema.generated.js";

/** Surface-level actions per role (open detail, patch role assignments). */
const IAM_MASTER_SURFACE_ACTIONS: FieldAction[] = ["read", "write"];

/**
 * Per-Surface hide for principals with no grant (field_tech / office_admin / data_master
 * have no binding on this IAM Surface).
 * Hand-synced from `apps/crm/modules/iam/user_roles_detail.policies.yaml`.
 */
export const USER_ROLES_DETAIL_FORBIDDEN_FIELD_RESPONSE = 404 as const;

/**
 * Runtime `user_roles_detail` policies — hand-synced from
 * `apps/crm/modules/iam/user_roles_detail.policies.yaml`.
 *
 * Built-in catalog (see YAML comments): `iam_master` grants below; `data_master` is an
 * engine wildcard on business Surfaces only (task 08). No `field_tech` / `office_admin` blocks.
 */
export const userRolesDetailPolicies: SurfacePolicies = {
  surface: "user_roles_detail",
  roles: {
    iam_master: {
      rowScope: "all",
      fields: [
        {
          field: UserRolesDetailFieldIds.profile,
          actions: ["read"],
        },
        {
          field: UserRolesDetailFieldIds.role_assignments,
          actions: ["read", "write"],
        },
      ],
    },
  },
};

export const USER_ROLES_DETAIL_FIELD_IDS: readonly UserRolesDetailFieldId[] =
  Object.values(UserRolesDetailFieldIds);

export const USER_ROLES_DETAIL_SURFACE_ACTIONS_BY_ROLE: Record<
  string,
  FieldAction[]
> = {
  iam_master: IAM_MASTER_SURFACE_ACTIONS,
};

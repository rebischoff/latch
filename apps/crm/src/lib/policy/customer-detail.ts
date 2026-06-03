import type { FieldAction, SurfacePolicies } from "@latch/contracts";

import {
  CustomerDetailFieldIds,
  type CustomerDetailFieldId,
} from "../../../modules/customer/generated/customer_detail.schema.generated.js";

/** Surface-level actions per role (open detail, patch). Customer delete deferred in Phase 02. */
const OFFICE_ADMIN_SURFACE_ACTIONS: FieldAction[] = ["read", "write"];

/**
 * Per-Surface hide for principals with no grant (field_tech has no binding).
 * Hand-synced from `apps/crm/modules/customer/customer_detail.policies.yaml`.
 */
export const CUSTOMER_DETAIL_FORBIDDEN_FIELD_RESPONSE = 404 as const;

/**
 * Runtime `customer_detail` policies — hand-synced from
 * `apps/crm/modules/customer/customer_detail.policies.yaml`.
 */
export const customerDetailPolicies: SurfacePolicies = {
  surface: "customer_detail",
  roles: {
    office_admin: {
      rowScope: "all",
      fields: [
        { field: CustomerDetailFieldIds.profile, actions: ["read", "write"] },
        { field: CustomerDetailFieldIds.billing, actions: ["read", "write"] },
        { field: CustomerDetailFieldIds.sites, actions: ["read", "write"] },
        { field: CustomerDetailFieldIds.job_history, actions: ["read"] },
      ],
    },
  },
};

export const CUSTOMER_DETAIL_FIELD_IDS: readonly CustomerDetailFieldId[] =
  Object.values(CustomerDetailFieldIds);

export const CUSTOMER_DETAIL_SURFACE_ACTIONS_BY_ROLE: Record<
  string,
  FieldAction[]
> = {
  office_admin: OFFICE_ADMIN_SURFACE_ACTIONS,
};

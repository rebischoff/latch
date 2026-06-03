import {
  definePolicyRegistry,
  defineSurfacePolicy,
} from "@latch/policy";

import {
  CUSTOMER_DETAIL_FIELD_IDS,
  CUSTOMER_DETAIL_SURFACE_ACTIONS_BY_ROLE,
  customerDetailPolicies,
} from "./customer-detail.js";
import {
  JOB_DETAIL_FIELD_IDS,
  JOB_DETAIL_SURFACE_ACTIONS_BY_ROLE,
  jobDetailPolicies,
} from "./job-detail.js";
import {
  JOB_LIST_FIELD_IDS,
  JOB_LIST_SURFACE_ACTIONS_BY_ROLE,
  jobListPolicies,
} from "./job-list.js";
import {
  USER_ROLES_DETAIL_FIELD_IDS,
  USER_ROLES_DETAIL_SURFACE_ACTIONS_BY_ROLE,
  userRolesDetailPolicies,
} from "./user-roles-detail.js";

/** IAM surface — excluded from `data_master` wildcard in `@latch/policy`. */
export const userRolesDetailSurfacePolicyDef = defineSurfacePolicy(
  userRolesDetailPolicies,
  {
    fieldIds: USER_ROLES_DETAIL_FIELD_IDS,
    surfaceActionsByRole: USER_ROLES_DETAIL_SURFACE_ACTIONS_BY_ROLE,
    kind: "iam",
  },
);

export const jobPolicyRegistry = definePolicyRegistry(
  defineSurfacePolicy(jobDetailPolicies, {
    fieldIds: JOB_DETAIL_FIELD_IDS,
    surfaceActionsByRole: JOB_DETAIL_SURFACE_ACTIONS_BY_ROLE,
    kind: "business",
  }),
  defineSurfacePolicy(jobListPolicies, {
    fieldIds: JOB_LIST_FIELD_IDS,
    surfaceActionsByRole: JOB_LIST_SURFACE_ACTIONS_BY_ROLE,
    kind: "business",
  }),
  defineSurfacePolicy(customerDetailPolicies, {
    fieldIds: CUSTOMER_DETAIL_FIELD_IDS,
    surfaceActionsByRole: CUSTOMER_DETAIL_SURFACE_ACTIONS_BY_ROLE,
    kind: "business",
  }),
  userRolesDetailSurfacePolicyDef,
);

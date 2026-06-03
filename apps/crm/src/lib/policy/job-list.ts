import type { FieldAction, SurfacePolicies } from "@latch/contracts";

/** Surface-level actions per role (list read, bulk write/delete). */
const FIELD_TECH_SURFACE_ACTIONS: FieldAction[] = ["read"];
const OFFICE_ADMIN_SURFACE_ACTIONS: FieldAction[] = ["read", "write", "delete"];

/**
 * Runtime `job_list` policies — hand-synced from `apps/crm/modules/job/job_list.policies.yaml`.
 */
export const jobListPolicies: SurfacePolicies = {
  surface: "job_list",
  roles: {
    field_tech: {
      rowScope: "own",
      fields: [
        { field: "summary", actions: ["read"] },
        { field: "customer_site", actions: ["read"] },
        { field: "assignments", actions: ["read"] },
      ],
    },
    office_admin: {
      rowScope: "all",
      fields: [
        { field: "summary", actions: ["read"] },
        { field: "customer_site", actions: ["read"] },
        { field: "financial_terms", actions: ["read"] },
        { field: "assignments", actions: ["read", "write"] },
      ],
    },
  },
};

export const JOB_LIST_FIELD_IDS = [
  "summary",
  "customer_site",
  "financial_terms",
  "assignments",
] as const;

export const JOB_LIST_SURFACE_ACTIONS_BY_ROLE: Record<string, FieldAction[]> =
  {
    field_tech: FIELD_TECH_SURFACE_ACTIONS,
    office_admin: OFFICE_ADMIN_SURFACE_ACTIONS,
  };

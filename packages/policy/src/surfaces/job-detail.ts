import type { FieldAction, SurfacePolicies } from "@latch/contracts";

/** Surface-level actions per role (open detail, delete, etc.). */
const FIELD_TECH_SURFACE_ACTIONS: FieldAction[] = ["read"];
const OFFICE_ADMIN_SURFACE_ACTIONS: FieldAction[] = [
  "read",
  "write",
  "delete",
  "restore",
];

/**
 * Runtime `job_detail` policies — hand-synced from `apps/web/modules/job/job_detail.policies.yaml`.
 * Policy YAML loader is out of scope for task 08; keep this file aligned when policies YAML changes.
 * @see docs/archive/tasks/job_detail/07-policies-yaml.md
 */
export const jobDetailPolicies: SurfacePolicies = {
  surface: "job_detail",
  roles: {
    field_tech: {
      rowScope: "own",
      fields: [
        { field: "summary", actions: ["read", "write"] },
        { field: "scope", actions: ["read", "write"] },
        { field: "assignments", actions: ["read"] },
        { field: "financial_terms", actions: ["submit"] },
        {
          field: "financial_terms",
          actions: ["read", "write", "approve"],
          effect: "deny",
        },
      ],
    },
    office_admin: {
      rowScope: "all",
      fields: [
        { field: "summary", actions: ["read", "write"] },
        { field: "scope", actions: ["read", "write"] },
        { field: "assignments", actions: ["read", "write"] },
        { field: "financial_terms", actions: ["read", "write", "approve"] },
      ],
    },
  },
};

export const JOB_DETAIL_FIELD_IDS = [
  "summary",
  "scope",
  "financial_terms",
  "assignments",
] as const;

export const JOB_DETAIL_SURFACE_ACTIONS_BY_ROLE: Record<
  string,
  FieldAction[]
> = {
  field_tech: FIELD_TECH_SURFACE_ACTIONS,
  office_admin: OFFICE_ADMIN_SURFACE_ACTIONS,
};

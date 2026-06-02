import type { FieldAction, SurfacePolicies } from "@latch/contracts";
/**
 * Runtime `job_list` policies — hand-synced from `apps/web/modules/job/job_list.policies.yaml`.
 * Policy YAML loader is out of scope for task 08; keep this file aligned when policies YAML changes.
 * @see docs/phases/01-data-access/tasks/07-policies-yaml.md
 */
export declare const jobListPolicies: SurfacePolicies;
export declare const JOB_LIST_FIELD_IDS: readonly ["summary", "customer_site", "financial_terms", "assignments"];
export declare const JOB_LIST_SURFACE_ACTIONS_BY_ROLE: Record<string, FieldAction[]>;
//# sourceMappingURL=job-list.d.ts.map
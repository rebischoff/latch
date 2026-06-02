import type { FieldAction, SurfacePolicies } from "@latch/contracts";
/**
 * Runtime `job_detail` policies — hand-synced from `apps/web/modules/job/job_detail.policies.yaml`.
 * Policy YAML loader is out of scope for task 08; keep this file aligned when policies YAML changes.
 * @see docs/archive/tasks/job_detail/07-policies-yaml.md
 */
export declare const jobDetailPolicies: SurfacePolicies;
export declare const JOB_DETAIL_FIELD_IDS: readonly ["summary", "scope", "financial_terms", "assignments"];
export declare const JOB_DETAIL_SURFACE_ACTIONS_BY_ROLE: Record<string, FieldAction[]>;
//# sourceMappingURL=job-detail.d.ts.map
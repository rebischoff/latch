import type {
  EstimateConditionFormRow,
  EstimateConditionSpecFormRow,
} from "@/components/estimates/estimate-line-tree";
import { findConditionPath } from "@/components/estimates/estimate-line-selection";

export type ConditionDraftSpec = {
  spec_def_id: string;
  spec_option_id?: string | null;
  value_boolean?: boolean | null;
  value_number?: number | null;
  value_number_max?: number | null;
};

export type ConditionDraft = {
  complexity_factor_id?: string | null;
  include_discontinued?: boolean;
  labor_phases_explicit?: boolean;
  included_labor_phases?: string[];
  specs?: ConditionDraftSpec[];
};

export const toConditionDraftSpecs = (
  specs: EstimateConditionSpecFormRow[],
): ConditionDraftSpec[] =>
  specs.map((spec) => ({
    spec_def_id: spec.spec_def_id,
    spec_option_id: spec.spec_option_id,
    value_boolean: spec.value_boolean,
    value_number: spec.value_number,
    value_number_max: spec.value_number_max ?? null,
  }));

export const buildConditionDraft = (
  conditions: EstimateConditionFormRow[],
  conditionId: string,
): ConditionDraft | undefined => {
  const path = findConditionPath(conditions, conditionId);
  if (!path) {
    return undefined;
  }

  let node: EstimateConditionFormRow | undefined;
  let nodes = conditions;
  for (const index of path) {
    node = nodes[index];
    nodes = node?.conditions ?? [];
  }
  if (!node) {
    return undefined;
  }

  return {
    complexity_factor_id: node.complexity_factor_id,
    include_discontinued: node.include_discontinued,
    labor_phases_explicit: node.labor_phases_explicit,
    included_labor_phases: node.included_labor_phases.map(
      (phase) => phase.labor_phase_id,
    ),
    specs: toConditionDraftSpecs(node.specs),
  };
};

/** Stable fingerprint for React Query keys — part-filter-relevant draft fields. */
export const fingerprintConditionDraftSpecs = (
  specs: ConditionDraftSpec[] | undefined,
): string => {
  if (!specs || specs.length === 0) {
    return "";
  }

  const normalized = specs
    .map((spec) => ({
      d: spec.spec_def_id,
      o: spec.spec_option_id ?? null,
      b: spec.value_boolean ?? null,
      n: spec.value_number ?? null,
      m: spec.value_number_max ?? null,
    }))
    .sort((a, b) => a.d.localeCompare(b.d));

  return JSON.stringify(normalized);
};

export const fingerprintConditionDraft = (
  draft: ConditionDraft | undefined,
): string => {
  if (!draft) {
    return "";
  }

  return JSON.stringify({
    i: draft.include_discontinued ?? false,
    s: fingerprintConditionDraftSpecs(draft.specs),
  });
};

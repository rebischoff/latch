import type { EstimateConditionSpecFormRow } from "@/components/estimates/estimate-line-tree";
import type { EstimateConditionFormRow } from "@/components/estimates/estimate-line-tree";
import { getConditionAncestry } from "@/components/estimates/estimate-line-selection";

export const isBucketSpecValueSet = (spec: EstimateConditionSpecFormRow): boolean => {
  if (spec.value_type === "boolean") {
    return spec.value_boolean !== null;
  }

  if (spec.value_type === "number") {
    return spec.value_number !== null;
  }

  return spec.spec_option_id !== null;
};

export const mergeBucketSpecLayers = (
  layers: EstimateConditionSpecFormRow[][],
): EstimateConditionSpecFormRow[] => {
  const byDefId = new Map<string, EstimateConditionSpecFormRow>();

  for (const layer of layers) {
    for (const spec of layer) {
      const previous = byDefId.get(spec.spec_def_id);
      if (!previous) {
        byDefId.set(spec.spec_def_id, { ...spec });
        continue;
      }

      if (isBucketSpecValueSet(spec)) {
        byDefId.set(spec.spec_def_id, { ...previous, ...spec });
      }
    }
  }

  return [...byDefId.values()];
};

/** Root → … → selected node; later non-blank values win. */
export const resolveEffectiveBucketSpecs = (
  conditions: EstimateConditionFormRow[],
  conditionPath: number[],
): EstimateConditionSpecFormRow[] => {
  const ancestry = getConditionAncestry(conditions, conditionPath);
  return mergeBucketSpecLayers(ancestry.map((node) => node.specs));
};

/** Nearest non-null complexity_factor_id walking leaf → root; else null (100%). */
export const resolveEffectiveComplexityFactorId = (
  conditions: EstimateConditionFormRow[],
  conditionPath: number[],
): string | null => {
  const ancestry = getConditionAncestry(conditions, conditionPath);
  for (let i = ancestry.length - 1; i >= 0; i -= 1) {
    const factorId = ancestry[i]?.complexity_factor_id ?? null;
    if (factorId) {
      return factorId;
    }
  }
  return null;
};

/**
 * Nearest ancestor (leaf→root) with labor_phases_explicit; else null (catalog default).
 * Explicit empty array is a valid override ("no phases").
 */
export const resolveEffectiveLaborPhases = (
  conditions: EstimateConditionFormRow[],
  conditionPath: number[],
): EstimateConditionFormRow["included_labor_phases"] | null => {
  const ancestry = getConditionAncestry(conditions, conditionPath);
  for (let i = ancestry.length - 1; i >= 0; i -= 1) {
    const node = ancestry[i];
    if (node?.labor_phases_explicit) {
      return node.included_labor_phases;
    }
  }
  return null;
};

import type { EstimateConditionSpecFormRow } from "@/components/estimates/estimate-line-tree";
import type { EstimateConditionFormRow } from "@/components/estimates/estimate-line-tree";
import { getConditionAncestry } from "@/components/estimates/estimate-line-selection";

import { isBucketSpecValueSet as isBucketSpecValueSetShared } from "./repository/estimate-bucket-spec-write";

export const isBucketSpecValueSet = (spec: EstimateConditionSpecFormRow): boolean =>
  isBucketSpecValueSetShared(spec);

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

/**
 * First leaf→root node with `*_explicit`; else `false`.
 * Shared by labor_only and include_discontinued (43 L11–L12).
 */
const resolveEffectiveExplicitBoolean = (
  conditions: EstimateConditionFormRow[],
  conditionPath: number[],
  explicitKey: "labor_only_explicit" | "include_discontinued_explicit",
  valueKey: "labor_only" | "include_discontinued",
): boolean => {
  const ancestry = getConditionAncestry(conditions, conditionPath);
  for (let i = ancestry.length - 1; i >= 0; i -= 1) {
    const node = ancestry[i];
    if (node?.[explicitKey]) {
      return Boolean(node[valueKey]);
    }
  }
  return false;
};

/** Effective labor_only for a condition path (43 L2 / L11). */
export const resolveEffectiveLaborOnly = (
  conditions: EstimateConditionFormRow[],
  conditionPath: number[],
): boolean =>
  resolveEffectiveExplicitBoolean(
    conditions,
    conditionPath,
    "labor_only_explicit",
    "labor_only",
  );

/** Effective include_discontinued for a condition path (43 L12). */
export const resolveEffectiveIncludeDiscontinued = (
  conditions: EstimateConditionFormRow[],
  conditionPath: number[],
): boolean =>
  resolveEffectiveExplicitBoolean(
    conditions,
    conditionPath,
    "include_discontinued_explicit",
    "include_discontinued",
  );

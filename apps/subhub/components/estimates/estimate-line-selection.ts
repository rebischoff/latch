import type {
  EstimateConditionFormRow,
  EstimateLineFormRow,
} from "@/components/estimates/estimate-line-tree";
import { flattenConditions } from "@/components/estimates/estimate-line-tree";

export type EstimateBucketSelection = {
  estimateConditionId: string;
};

export type EstimateBucketBinding = {
  /** Indices into nested conditions forest, e.g. [0] root, [0,1] child. */
  conditionPath: number[];
};

export const parseSelectionFromTreeKey = (
  key: string,
): EstimateBucketSelection | null => {
  if (!key.startsWith("condition:")) {
    return null;
  }

  const estimateConditionId = key.replace(/^condition:/, "");
  if (!estimateConditionId) {
    return null;
  }

  return { estimateConditionId };
};

export const selectionToTreeKey = (selection: EstimateBucketSelection): string =>
  `condition:${selection.estimateConditionId}`;

export const defaultBucketSelection = (
  conditions: EstimateConditionFormRow[],
): EstimateBucketSelection | null => {
  const first = conditions[0];
  if (!first) {
    return null;
  }
  return { estimateConditionId: first.id };
};

export const findConditionPath = (
  conditions: EstimateConditionFormRow[],
  conditionId: string,
  path: number[] = [],
): number[] | null => {
  for (const [index, condition] of conditions.entries()) {
    if (condition.id === conditionId) {
      return [...path, index];
    }
    const nested = findConditionPath(condition.conditions, conditionId, [
      ...path,
      index,
    ]);
    if (nested) {
      return nested;
    }
  }
  return null;
};

export const resolveBucketBinding = (
  conditions: EstimateConditionFormRow[],
  selection: EstimateBucketSelection,
): EstimateBucketBinding | null => {
  const path = findConditionPath(conditions, selection.estimateConditionId);
  if (!path) {
    return null;
  }
  return { conditionPath: path };
};

export const filterLinesForSelection = (
  lineItems: EstimateLineFormRow[],
  selection: EstimateBucketSelection,
): EstimateLineFormRow[] =>
  lineItems.filter(
    (line) =>
      line.line_role === "standalone" &&
      line.estimate_condition_id === selection.estimateConditionId,
  );

export const emptyLineItemsCopy = (
  selection: EstimateBucketSelection | null,
): string => {
  if (!selection) {
    return "Select a condition";
  }

  return "No lines in this condition";
};

export const conditionReferencedByLines = (
  lineItems: Array<{ estimate_condition_id: string }>,
  conditionId: string,
  conditions: EstimateConditionFormRow[],
): boolean => {
  const findNode = (
    rows: EstimateConditionFormRow[],
  ): EstimateConditionFormRow | null => {
    for (const row of rows) {
      if (row.id === conditionId) {
        return row;
      }
      const nested = findNode(row.conditions);
      if (nested) {
        return nested;
      }
    }
    return null;
  };

  const root = findNode(conditions);
  if (!root) {
    return lineItems.some((line) => line.estimate_condition_id === conditionId);
  }

  const subtreeIds = new Set(flattenConditions([root]).map((c) => c.id));
  return lineItems.some((line) => subtreeIds.has(line.estimate_condition_id));
};

export const getConditionAtPath = (
  conditions: EstimateConditionFormRow[],
  conditionPath: number[],
): EstimateConditionFormRow | null => {
  if (conditionPath.length === 0) {
    return null;
  }

  let current: EstimateConditionFormRow | undefined =
    conditions[conditionPath[0]!];
  for (let i = 1; i < conditionPath.length; i += 1) {
    current = current?.conditions[conditionPath[i]!];
  }
  return current ?? null;
};

/** Walk ancestry from root → selected (inclusive). */
export const getConditionAncestry = (
  conditions: EstimateConditionFormRow[],
  conditionPath: number[],
): EstimateConditionFormRow[] => {
  const ancestry: EstimateConditionFormRow[] = [];
  let rows = conditions;

  for (const index of conditionPath) {
    const node = rows[index];
    if (!node) {
      break;
    }
    ancestry.push(node);
    rows = node.conditions;
  }

  return ancestry;
};

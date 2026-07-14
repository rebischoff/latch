import type { DataNode } from "antd/es/tree";

import type {
  EstimateConditionFormRow,
  EstimateConditionSpecFormRow,
} from "@/components/estimates/estimate-line-tree";
import { makeCondition } from "@/components/estimates/estimate-line-tree";

export type EstimateCommercialTreeNode = {
  children?: EstimateCommercialTreeNode[];
  conditionId: string;
  key: string;
  label: string;
  rowKind: "condition";
};

export type EstimateConditionAntdTreeNode = DataNode & {
  key: string;
  title: string;
  children?: EstimateConditionAntdTreeNode[];
};

/** @deprecated Prefer EstimateConditionAntdTreeNode. */
export type EstimateScopeAntdTreeNode = EstimateConditionAntdTreeNode;

const conditionNodes = (
  conditions: EstimateConditionFormRow[],
): EstimateCommercialTreeNode[] =>
  [...conditions]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((condition) => ({
      key: `condition:${condition.id}`,
      rowKind: "condition" as const,
      label: condition.name || condition.root_item_name || "Condition",
      conditionId: condition.id,
      children: conditionNodes(condition.conditions),
    }));

export const buildCommercialTree = (
  conditions: EstimateConditionFormRow[],
): EstimateCommercialTreeNode[] => conditionNodes(conditions);

export const toAntdConditionTreeData = (
  nodes: EstimateCommercialTreeNode[],
): EstimateConditionAntdTreeNode[] =>
  nodes.map((node) => ({
    key: node.key,
    title: node.label,
    children: node.children ? toAntdConditionTreeData(node.children) : undefined,
  }));

/** @deprecated Prefer toAntdConditionTreeData. */
export const toAntdScopeTreeData = toAntdConditionTreeData;

/** @deprecated Prefer buildCommercialTree. */
export const buildEstimateScopeTree = buildCommercialTree;

export const addRootCondition = (
  conditions: EstimateConditionFormRow[],
  rootItemId: string,
  rootItemName: string,
  specTemplate: EstimateConditionSpecFormRow[] = [],
): EstimateConditionFormRow[] => [
  ...conditions,
  makeCondition({
    name: rootItemName,
    parent_condition_id: null,
    root_item_id: rootItemId,
    root_item_name: rootItemName,
    sort_order: conditions.length + 1,
    labor_phases_explicit: false,
    specs: specTemplate.map((spec) => ({ ...spec })),
  }),
];

/** @deprecated Prefer addRootCondition. */
export const addScopeInstance = addRootCondition;

export const addConditionUnder = (
  conditions: EstimateConditionFormRow[],
  parentConditionId: string,
  name = "New condition",
): { conditions: EstimateConditionFormRow[]; conditionId: string } | null => {
  const newCondition = makeCondition({
    name,
    parent_condition_id: parentConditionId,
    root_item_id: null,
  });

  let inserted = false;

  const insert = (rows: EstimateConditionFormRow[]): EstimateConditionFormRow[] =>
    rows.map((row) => {
      if (row.id === parentConditionId) {
        inserted = true;
        const child = {
          ...newCondition,
          sort_order: row.conditions.length + 1,
          specs: row.specs.map((spec) => ({
            ...spec,
            spec_option_id: null,
            value_number: null,
            value_number_max: null,
            value_boolean: null,
            option_display_name: null,
          })),
        };
        return { ...row, conditions: [...row.conditions, child] };
      }
      return { ...row, conditions: insert(row.conditions) };
    });

  const next = insert(conditions);
  if (!inserted) {
    return null;
  }

  return { conditions: next, conditionId: newCondition.id };
};

export const removeConditionById = (
  conditions: EstimateConditionFormRow[],
  conditionId: string,
): EstimateConditionFormRow[] => {
  const filterTree = (rows: EstimateConditionFormRow[]): EstimateConditionFormRow[] =>
    rows
      .filter((row) => row.id !== conditionId)
      .map((row) => ({
        ...row,
        conditions: filterTree(row.conditions),
      }));

  return filterTree(conditions);
};

/** @deprecated Prefer removeConditionById on roots. */
export const removeScopeInstance = removeConditionById;

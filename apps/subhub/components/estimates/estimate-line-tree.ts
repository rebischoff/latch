export type EstimateLineRole = "standalone" | "kit_header" | "kit_component";

export type EstimateLineAllocationFormRow = {
  quantity: number;
  site_zone_id: string;
  site_zone_name?: string | null;
};

export type EstimateLineFormRow = {
  allocations: EstimateLineAllocationFormRow[];
  id: string;
  line_role: EstimateLineRole;
  description: string;
  quantity: number;
  qty_manual: boolean;
  unit: string;
  unit_cost: number;
  unit_price: number;
  unit_material: number;
  unit_labor: number;
  unit_freight: number;
  unit_incidental: number;
  unit_price_target: number;
  parent_line_id: string | null;
  estimate_condition_id: string;
  lock: "line" | "none" | "sell";
  phase_id: string | null;
  item_id: string | null;
  part_id: string | null;
  vendor_part_id: string | null;
};

export type EstimateConditionSpecOptionFormRow = {
  display_name: string;
  id: string;
};

export type EstimateConditionSpecFormRow = {
  decimal_places?: number | null;
  def_display_name?: string;
  spec_def_id: string;
  spec_option_id: string | null;
  option_display_name?: string | null;
  to_canonical_factor?: number;
  unit_symbol?: string | null;
  value_number: number | null;
  value_boolean: boolean | null;
  value_type?: "enum" | "boolean" | "number";
  options?: EstimateConditionSpecOptionFormRow[];
};

export type EstimateConditionLaborPhaseFormRow = {
  labor_phase_id: string;
  labor_phase_name?: string;
  sort_order?: number;
};

export type EstimateConditionFormRow = {
  complexity_factor_id: string | null;
  conditions: EstimateConditionFormRow[];
  id: string;
  included_labor_phases: EstimateConditionLaborPhaseFormRow[];
  labor_phases_explicit: boolean;
  name: string;
  parent_condition_id: string | null;
  /** Required on roots; null on children (resolve from tree root in UI). */
  root_item_id: string | null;
  root_item_name?: string | null;
  sort_order: number;
  specs: EstimateConditionSpecFormRow[];
};

/** Site geography for Places… picker (not commercial tree). */
export type EstimateSiteZoneTreeFormRow = {
  id: string;
  name: string;
  zones?: EstimateSiteZoneTreeFormRow[];
};

export type EstimateSiteScopeTreeFormRow = {
  id: string;
  name: string;
  root_item_id: string;
  zones: EstimateSiteZoneTreeFormRow[];
};

export type EstimateSiteTreeFormRow = {
  scopes: EstimateSiteScopeTreeFormRow[];
  spec_templates?: Record<string, EstimateConditionSpecFormRow[]>;
};

export type EstimateLineEditorFormValues = {
  conditions: EstimateConditionFormRow[];
  line_items: EstimateLineFormRow[];
  site_tree?: EstimateSiteTreeFormRow | null;
};

export type TreeRowKind = "condition" | "line";

export type EstimateLineTreeNode = {
  children?: EstimateLineTreeNode[];
  conditionId?: string;
  key: string;
  label?: string;
  lineId?: string;
  rowKind: TreeRowKind;
};

export const makeLine = (
  overrides: Partial<EstimateLineFormRow> = {},
): EstimateLineFormRow => {
  const {
    line_role: _ignoredRole,
    parent_line_id: _ignoredParent,
    ...rest
  } = overrides;

  return {
    id: crypto.randomUUID(),
    line_role: "standalone",
    description: "",
    quantity: 1,
    qty_manual: false,
    unit: "ea",
    unit_cost: 0,
    unit_price: 0,
    unit_material: 0,
    unit_labor: 0,
    unit_freight: 0,
    unit_incidental: 0,
    unit_price_target: 0,
    parent_line_id: null,
    estimate_condition_id: "",
    allocations: [],
    lock: "none",
    phase_id: null,
    item_id: null,
    part_id: null,
    vendor_part_id: null,
    ...rest,
  };
};

export const makeCondition = (
  overrides: Partial<EstimateConditionFormRow> = {},
): EstimateConditionFormRow => ({
  id: crypto.randomUUID(),
  name: "New condition",
  parent_condition_id: null,
  root_item_id: null,
  root_item_name: null,
  sort_order: 1,
  complexity_factor_id: null,
  labor_phases_explicit: false,
  included_labor_phases: [],
  specs: [],
  conditions: [],
  ...overrides,
});

const linesForCondition = (
  lineItems: EstimateLineFormRow[],
  estimateConditionId: string,
): EstimateLineFormRow[] =>
  lineItems.filter((line) => line.estimate_condition_id === estimateConditionId);

const lineTreeNodes = (
  lineItems: EstimateLineFormRow[],
  estimateConditionId: string,
): EstimateLineTreeNode[] =>
  linesForCondition(lineItems, estimateConditionId).map((line) => ({
    key: `line:${line.id}`,
    rowKind: "line",
    lineId: line.id,
    conditionId: estimateConditionId,
  }));

const conditionTreeNodes = (
  lineItems: EstimateLineFormRow[],
  conditions: EstimateConditionFormRow[],
): EstimateLineTreeNode[] =>
  conditions.map((condition) => ({
    key: `condition:${condition.id}`,
    rowKind: "condition" as const,
    label: condition.name,
    conditionId: condition.id,
    children: [
      ...conditionTreeNodes(lineItems, condition.conditions),
      ...lineTreeNodes(lineItems, condition.id),
    ],
  }));

export const buildLineTree = (
  conditions: EstimateConditionFormRow[],
  lineItems: EstimateLineFormRow[],
): EstimateLineTreeNode[] => {
  const standaloneLines = lineItems.filter((line) => line.line_role === "standalone");
  const sorted = [...conditions].sort((left, right) => left.sort_order - right.sort_order);
  return conditionTreeNodes(standaloneLines, sorted);
};

export const flattenConditions = (
  conditions: EstimateConditionFormRow[],
): EstimateConditionFormRow[] => {
  const out: EstimateConditionFormRow[] = [];
  const walk = (rows: EstimateConditionFormRow[]) => {
    for (const row of rows) {
      out.push(row);
      walk(row.conditions);
    }
  };
  walk(conditions);
  return out;
};

export const orderLineItemsForPatch = (
  conditions: EstimateConditionFormRow[],
  lineItems: EstimateLineFormRow[],
): EstimateLineFormRow[] => {
  const buckets = new Map<string, EstimateLineFormRow[]>();

  for (const line of lineItems) {
    if (!line.estimate_condition_id) {
      continue;
    }
    const bucket = buckets.get(line.estimate_condition_id) ?? [];
    bucket.push(line);
    buckets.set(line.estimate_condition_id, bucket);
  }

  const ordered: EstimateLineFormRow[] = [];
  for (const condition of flattenConditions(conditions)) {
    ordered.push(...(buckets.get(condition.id) ?? []));
  }

  return ordered;
};

export const collectLineRemoveIndices = (
  lineItems: EstimateLineFormRow[],
  lineIndex: number,
): number[] => {
  const row = lineItems[lineIndex];
  if (!row) {
    return [];
  }

  const indices = [lineIndex];
  if (row.line_role === "kit_header") {
    lineItems.forEach((line, index) => {
      if (line.parent_line_id === row.id) {
        indices.push(index);
      }
    });
  }

  return [...new Set(indices)].sort((left, right) => right - left);
};

export const collectConditionLineRemoveIndices = (
  lineItems: EstimateLineFormRow[],
  conditionId: string,
): number[] => {
  const indices: number[] = [];

  lineItems.forEach((line, index) => {
    if (line.estimate_condition_id === conditionId) {
      indices.push(index);
      if (line.line_role === "kit_header") {
        lineItems.forEach((child, childIndex) => {
          if (child.parent_line_id === line.id) {
            indices.push(childIndex);
          }
        });
      }
    }
  });

  return [...new Set(indices)].sort((left, right) => right - left);
};

export const findLineIndex = (
  lineItems: EstimateLineFormRow[],
  lineId: string,
): number => lineItems.findIndex((line) => line.id === lineId);

export const parentKeyForCondition = (conditionId: string): string =>
  `condition:${conditionId}`;

export type ParentTarget = {
  estimate_condition_id: string;
};

export const parentTargetForKey = (
  parentKey: string,
  conditions: EstimateConditionFormRow[],
): ParentTarget | null => {
  if (!parentKey.startsWith("condition:")) {
    return null;
  }

  const conditionId = parentKey.replace(/^condition:/, "");
  const found = flattenConditions(conditions).find((c) => c.id === conditionId);
  return found ? { estimate_condition_id: conditionId } : null;
};

/** Resolve catalog root item id for a condition (walk to forest root). */
export const rootItemIdForCondition = (
  conditionId: string,
  conditions: EstimateConditionFormRow[],
): string | null => {
  const findPath = (
    rows: EstimateConditionFormRow[],
    path: EstimateConditionFormRow[] = [],
  ): EstimateConditionFormRow[] | null => {
    for (const row of rows) {
      const next = [...path, row];
      if (row.id === conditionId) {
        return next;
      }
      const nested = findPath(row.conditions, next);
      if (nested) {
        return nested;
      }
    }
    return null;
  };

  const path = findPath(conditions);
  if (!path || path.length === 0) {
    return null;
  }

  return path[0]?.root_item_id ?? null;
};

export const rootItemIdForParentKey = (
  parentKey: string,
  conditions: EstimateConditionFormRow[],
): string | null => {
  const target = parentTargetForKey(parentKey, conditions);
  if (!target) {
    return null;
  }
  return rootItemIdForCondition(target.estimate_condition_id, conditions);
};

/** @deprecated Prefer flattenConditions. */
export const flattenConditionsForScope = flattenConditions;

/** @deprecated Prefer EstimateConditionSpecFormRow. */
export type EstimateScopeSpecFormRow = EstimateConditionSpecFormRow;
/** @deprecated Prefer EstimateConditionLaborPhaseFormRow. */
export type EstimateScopeLaborPhaseFormRow = EstimateConditionLaborPhaseFormRow;
/** @deprecated Prefer EstimateConditionSpecOptionFormRow. */
export type EstimateScopeSpecOptionFormRow = EstimateConditionSpecOptionFormRow;

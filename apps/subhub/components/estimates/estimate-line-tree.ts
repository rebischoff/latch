export type EstimateLineKind = "product" | "labor" | "expense";
export type EstimateLineRole = "standalone" | "kit_header" | "kit_component";

export type EstimateLineFormRow = {
  id: string;
  line_role: EstimateLineRole;
  line_kind: EstimateLineKind;
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  unit_price: number;
  parent_line_id: string | null;
  estimate_scope_id: string | null;
  site_zone_id: string | null;
  material_status: "generic" | "suggested" | "verified" | null;
  phase_id: string | null;
  item_id: string | null;
  part_id: string | null;
  vendor_part_id: string | null;
};

export type EstimateScopeSpecOptionFormRow = {
  display_name: string;
  id: string;
};

export type EstimateScopeSpecFormRow = {
  spec_def_id: string;
  def_display_name?: string;
  value_type?: "enum" | "boolean" | "text";
  spec_option_id: string | null;
  option_display_name?: string | null;
  value_text: string | null;
  value_boolean: boolean | null;
  options?: EstimateScopeSpecOptionFormRow[];
};

export type EstimateScopeZoneFormRow = {
  site_zone_id: string;
  sort_order: number;
  specs: EstimateScopeSpecFormRow[];
};

export type EstimateScopeFormRow = {
  id: string;
  site_scope_id: string | null;
  root_category_id: string | null;
  root_category_name: string | null;
  site_scope_name: string | null;
  sort_order: number;
  labor_context_type_id: string | null;
  markup_type_id: string | null;
  specs: EstimateScopeSpecFormRow[];
  zones: EstimateScopeZoneFormRow[];
};

export type EstimateSiteZoneTreeFormRow = {
  id: string;
  name: string;
  zones?: EstimateSiteZoneTreeFormRow[];
};

export type EstimateSiteScopeTreeFormRow = {
  id: string;
  name: string;
  root_category_id: string;
  zones: EstimateSiteZoneTreeFormRow[];
};

export type EstimateSiteTreeFormRow = {
  general_zones: EstimateSiteZoneTreeFormRow[];
  scopes: EstimateSiteScopeTreeFormRow[];
  spec_templates?: Record<string, EstimateScopeSpecFormRow[]>;
};

export type EstimateLineEditorFormValues = {
  scopes: EstimateScopeFormRow[];
  line_items: EstimateLineFormRow[];
  site_tree?: EstimateSiteTreeFormRow | null;
};

export type TreeRowKind = "general" | "scope" | "line";

export type EstimateLineTreeNode = {
  children?: EstimateLineTreeNode[];
  key: string;
  label?: string;
  lineId?: string;
  rowKind: TreeRowKind;
  scopeId?: string;
  scopeIndex?: number;
};

export const GENERAL_TREE_KEY = "__general__";

export const makeLine = (
  overrides: Partial<EstimateLineFormRow> = {},
): EstimateLineFormRow => ({
  id: crypto.randomUUID(),
  line_role: "standalone",
  line_kind: "product",
  description: "",
  quantity: 1,
  unit: "ea",
  unit_cost: 0,
  unit_price: 0,
  parent_line_id: null,
  estimate_scope_id: null,
  site_zone_id: null,
  material_status: null,
  phase_id: null,
  item_id: null,
  part_id: null,
  vendor_part_id: null,
  ...overrides,
});

const linesForParent = (
  lineItems: EstimateLineFormRow[],
  estimateScopeId: string | null,
): EstimateLineFormRow[] =>
  lineItems.filter((line) => (line.estimate_scope_id ?? null) === estimateScopeId);

const lineTreeNodes = (
  lineItems: EstimateLineFormRow[],
  estimateScopeId: string | null,
): EstimateLineTreeNode[] =>
  linesForParent(lineItems, estimateScopeId).map((line) => ({
    key: `line:${line.id}`,
    rowKind: "line",
    lineId: line.id,
  }));

export const buildLineTree = (
  scopes: EstimateScopeFormRow[],
  lineItems: EstimateLineFormRow[],
): EstimateLineTreeNode[] => {
  const sortedScopes = [...scopes].sort((left, right) => left.sort_order - right.sort_order);

  const generalNode: EstimateLineTreeNode = {
    key: GENERAL_TREE_KEY,
    rowKind: "general",
    label: "General",
    children: lineTreeNodes(lineItems, null),
  };

  const scopeNodes: EstimateLineTreeNode[] = sortedScopes.map((scope, scopeIndex) => {
    const label =
      scope.site_scope_name ??
      scope.root_category_name ??
      (scope.site_scope_id === null ? "General" : "Scope");

    return {
      key: `scope:${scope.id}`,
      rowKind: "scope",
      label,
      scopeId: scope.id,
      scopeIndex,
      children: lineTreeNodes(lineItems, scope.id),
    };
  });

  return [generalNode, ...scopeNodes];
};

export const orderLineItemsForPatch = (
  scopes: EstimateScopeFormRow[],
  lineItems: EstimateLineFormRow[],
): EstimateLineFormRow[] => {
  const buckets = new Map<string | null, EstimateLineFormRow[]>();

  for (const line of lineItems) {
    const key = line.estimate_scope_id ?? null;
    const bucket = buckets.get(key) ?? [];
    bucket.push(line);
    buckets.set(key, bucket);
  }

  const ordered: EstimateLineFormRow[] = [];
  ordered.push(...(buckets.get(null) ?? []));

  const sortedScopes = [...scopes].sort((left, right) => left.sort_order - right.sort_order);
  for (const scope of sortedScopes) {
    ordered.push(...(buckets.get(scope.id) ?? []));
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

export const collectScopeLineRemoveIndices = (
  lineItems: EstimateLineFormRow[],
  scopeId: string,
): number[] => {
  const indices: number[] = [];

  lineItems.forEach((line, index) => {
    if (line.estimate_scope_id === scopeId) {
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

export const parentKeyForScopeId = (scopeId: string | null): string =>
  scopeId === null ? GENERAL_TREE_KEY : `scope:${scopeId}`;

export const estimateScopeIdForParentKey = (
  parentKey: string,
  scopes: EstimateScopeFormRow[],
): string | null => {
  if (parentKey === GENERAL_TREE_KEY) {
    return null;
  }

  const scopeId = parentKey.replace(/^scope:/, "");
  return scopes.some((scope) => scope.id === scopeId) ? scopeId : null;
};

// Legacy aliases for gradual migration in tests/docs
export type EstimateSystemFormRow = EstimateScopeFormRow;
export type EstimateSystemSpecFormRow = EstimateScopeSpecFormRow;

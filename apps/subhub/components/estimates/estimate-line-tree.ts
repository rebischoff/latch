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
  estimate_system_id: string | null;
  material_status: "generic" | "suggested" | "verified" | null;
  phase_id: string | null;
  item_id: string | null;
  part_id: string | null;
  vendor_part_id: string | null;
};

export type EstimateSystemSpecOptionFormRow = {
  display_name: string;
  id: string;
};

export type EstimateSystemSpecFormRow = {
  system_spec_def_id: string;
  def_display_name?: string;
  value_type?: "enum" | "boolean" | "text";
  system_spec_option_id: string | null;
  option_display_name?: string | null;
  value_text: string | null;
  value_boolean: boolean | null;
  options?: EstimateSystemSpecOptionFormRow[];
};

export type EstimateSystemFormRow = {
  id: string;
  system_id: string;
  system_name: string;
  sort_order: number;
  specs: EstimateSystemSpecFormRow[];
};

export type EstimateLineEditorFormValues = {
  systems: EstimateSystemFormRow[];
  line_items: EstimateLineFormRow[];
};

export type TreeRowKind = "general" | "system" | "specs" | "line";

export type EstimateLineTreeNode = {
  children?: EstimateLineTreeNode[];
  key: string;
  label?: string;
  lineId?: string;
  rowKind: TreeRowKind;
  systemId?: string;
  systemIndex?: number;
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
  estimate_system_id: null,
  material_status: null,
  phase_id: null,
  item_id: null,
  part_id: null,
  vendor_part_id: null,
  ...overrides,
});

export const makeSpecRowsFromCatalog = (
  specDefs: Array<{
    def_display_name: string;
    options?: EstimateSystemSpecOptionFormRow[];
    system_spec_def_id: string;
    value_type: "enum" | "boolean" | "text";
  }>,
): EstimateSystemSpecFormRow[] =>
  specDefs.map((def) => ({
    system_spec_def_id: def.system_spec_def_id,
    def_display_name: def.def_display_name,
    value_type: def.value_type,
    system_spec_option_id: null,
    option_display_name: null,
    value_text: null,
    value_boolean: null,
    options: def.options ?? [],
  }));

export const makeSystemBlock = (
  systemId: string,
  systemName: string,
  sortOrder: number,
  specs: EstimateSystemSpecFormRow[] = [],
): EstimateSystemFormRow => ({
  id: crypto.randomUUID(),
  system_id: systemId,
  system_name: systemName,
  sort_order: sortOrder,
  specs,
});

const linesForParent = (
  lineItems: EstimateLineFormRow[],
  estimateSystemId: string | null,
): EstimateLineFormRow[] =>
  lineItems.filter((line) => (line.estimate_system_id ?? null) === estimateSystemId);

const lineTreeNodes = (
  lineItems: EstimateLineFormRow[],
  estimateSystemId: string | null,
): EstimateLineTreeNode[] =>
  linesForParent(lineItems, estimateSystemId).map((line) => ({
    key: `line:${line.id}`,
    rowKind: "line",
    lineId: line.id,
  }));

export const buildLineTree = (
  systems: EstimateSystemFormRow[],
  lineItems: EstimateLineFormRow[],
): EstimateLineTreeNode[] => {
  const sortedSystems = [...systems].sort((left, right) => left.sort_order - right.sort_order);

  const generalNode: EstimateLineTreeNode = {
    key: GENERAL_TREE_KEY,
    rowKind: "general",
    label: "General",
    children: lineTreeNodes(lineItems, null),
  };

  const systemNodes: EstimateLineTreeNode[] = sortedSystems.map((system, systemIndex) => {
    const lineChildren = lineTreeNodes(lineItems, system.id);
    const specChildren: EstimateLineTreeNode[] =
      system.specs.length > 0
        ? [
            {
              key: `specs:${system.id}`,
              rowKind: "specs",
              systemIndex,
            },
          ]
        : [];

    return {
      key: `system:${system.id}`,
      rowKind: "system",
      label: system.system_name,
      systemId: system.id,
      systemIndex,
      children: [...specChildren, ...lineChildren],
    };
  });

  return [generalNode, ...systemNodes];
};

export const orderLineItemsForPatch = (
  systems: EstimateSystemFormRow[],
  lineItems: EstimateLineFormRow[],
): EstimateLineFormRow[] => {
  const buckets = new Map<string | null, EstimateLineFormRow[]>();

  for (const line of lineItems) {
    const key = line.estimate_system_id ?? null;
    const bucket = buckets.get(key) ?? [];
    bucket.push(line);
    buckets.set(key, bucket);
  }

  const ordered: EstimateLineFormRow[] = [];
  ordered.push(...(buckets.get(null) ?? []));

  const sortedSystems = [...systems].sort((left, right) => left.sort_order - right.sort_order);
  for (const system of sortedSystems) {
    ordered.push(...(buckets.get(system.id) ?? []));
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

export const collectSystemLineRemoveIndices = (
  lineItems: EstimateLineFormRow[],
  systemId: string,
): number[] => {
  const indices: number[] = [];

  lineItems.forEach((line, index) => {
    if (line.estimate_system_id === systemId) {
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

export const parentKeyForSystemId = (systemId: string | null): string =>
  systemId === null ? GENERAL_TREE_KEY : `system:${systemId}`;

export const estimateSystemIdForParentKey = (
  parentKey: string,
  systems: EstimateSystemFormRow[],
): string | null => {
  if (parentKey === GENERAL_TREE_KEY) {
    return null;
  }

  const systemId = parentKey.replace(/^system:/, "");
  return systems.some((system) => system.id === systemId) ? systemId : null;
};

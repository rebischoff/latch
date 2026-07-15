import type {
  EstimateLineAllocationFormRow,
  EstimateSiteScopeTreeFormRow,
  EstimateSiteTreeFormRow,
  EstimateSiteZoneTreeFormRow,
} from "@/components/estimates/estimate-line-tree";

/** Nested zone node for Ant `treeData` (title/key/children). */
export type ZoneTreeNode = {
  children?: ZoneTreeNode[];
  key: string;
  title: string;
};

const mapZones = (zones: EstimateSiteZoneTreeFormRow[] | undefined): ZoneTreeNode[] =>
  (zones ?? []).map((zone) => ({
    key: zone.id,
    title: zone.name,
    children: mapZones(zone.zones),
  }));

const scopeToNode = (scope: EstimateSiteScopeTreeFormRow): ZoneTreeNode => ({
  key: scope.id,
  title: scope.name,
  children: mapZones(scope.zones),
});

/** Nested tree for the condition-root site zone (Z1). */
export const zoneSubtreeForRoot = (
  siteTree: EstimateSiteTreeFormRow | null | undefined,
  rootSiteZoneId: string | null,
): ZoneTreeNode | null => {
  if (!rootSiteZoneId || !siteTree) {
    return null;
  }
  const scope = siteTree.scopes.find((row) => row.id === rootSiteZoneId);
  return scope ? scopeToNode(scope) : null;
};

/** All leaf zone ids under a subtree (Z3). */
export const leafIdsInSubtree = (tree: ZoneTreeNode | null): string[] => {
  if (!tree) {
    return [];
  }
  const out: string[] = [];
  const walk = (node: ZoneTreeNode) => {
    const children = node.children ?? [];
    if (children.length === 0) {
      out.push(node.key);
      return;
    }
    for (const child of children) {
      walk(child);
    }
  };
  walk(tree);
  return out;
};

/** Leaf ids under every root in the site tree (for Z8 load normalize). */
export const allLeafIdsInSiteTree = (
  siteTree: EstimateSiteTreeFormRow | null | undefined,
): Set<string> => {
  const leaves = new Set<string>();
  if (!siteTree) {
    return leaves;
  }
  for (const scope of siteTree.scopes) {
    for (const id of leafIdsInSubtree(scopeToNode(scope))) {
      leaves.add(id);
    }
  }
  return leaves;
};

export const findNode = (
  tree: ZoneTreeNode | null,
  nodeId: string,
): ZoneTreeNode | null => {
  if (!tree) {
    return null;
  }
  if (tree.key === nodeId) {
    return tree;
  }
  for (const child of tree.children ?? []) {
    const found = findNode(child, nodeId);
    if (found) {
      return found;
    }
  }
  return null;
};

/** Leaf ids under a node (node itself if it is a leaf). */
export const leafIdsUnderNode = (
  tree: ZoneTreeNode | null,
  nodeId: string,
): string[] => {
  const node = findNode(tree, nodeId);
  return leafIdsInSubtree(node);
};

/** Checked leaves ∩ current leaf set (drop stale / non-leaf ids). */
export const checkedLeafIdsFromAllocations = (
  allocations: EstimateLineAllocationFormRow[],
  leafIds: Iterable<string>,
): string[] => {
  const leafSet = leafIds instanceof Set ? leafIds : new Set(leafIds);
  const out: string[] = [];
  for (const row of allocations) {
    if (leafSet.has(row.site_zone_id) && !out.includes(row.site_zone_id)) {
      out.push(row.site_zone_id);
    }
  }
  return out;
};

export const allocationsFromCheckedLeaves = (
  leafIds: string[],
  qtyByLeaf: Record<string, number>,
  nameById: Record<string, string> = {},
): EstimateLineAllocationFormRow[] =>
  leafIds.map((site_zone_id) => ({
    site_zone_id,
    quantity: qtyByLeaf[site_zone_id] ?? 1,
    site_zone_name: nameById[site_zone_id] ?? null,
  }));

/** Set every listed leaf to N (Z4 parent bulk qty). */
export const applyParentQty = (
  leafIdsUnderParent: string[],
  qty: number,
  qtyByLeaf: Record<string, number>,
): Record<string, number> => {
  const next = { ...qtyByLeaf };
  for (const id of leafIdsUnderParent) {
    next[id] = qty;
  }
  return next;
};

/** Cascade check/uncheck → next checked leaf set (Z2). */
export const cascadeCheck = (
  nodeId: string,
  checked: boolean,
  tree: ZoneTreeNode | null,
  currentChecked: Iterable<string>,
): string[] => {
  const next = new Set(currentChecked);
  const targets = leafIdsUnderNode(tree, nodeId);
  for (const id of targets) {
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
  }
  return [...next];
};

export const sumCheckedLeafQty = (
  checkedLeafIds: Iterable<string>,
  qtyByLeaf: Record<string, number>,
): number => {
  let sum = 0;
  for (const id of checkedLeafIds) {
    sum += qtyByLeaf[id] ?? 1;
  }
  return sum;
};

export const quantityFromTreeMode = (allocatedSum: number): number =>
  allocatedSum > 0 ? allocatedSum : 1;

/** Ant checkStrictly keys: full parents + leaves; half-checked partial parents. */
export const checkedAndHalfKeys = (
  tree: ZoneTreeNode | null,
  checkedLeaves: Iterable<string>,
): { checked: string[]; halfChecked: string[] } => {
  const leafSet = checkedLeaves instanceof Set ? checkedLeaves : new Set(checkedLeaves);
  const checked: string[] = [];
  const halfChecked: string[] = [];

  const walk = (node: ZoneTreeNode): { all: boolean; some: boolean } => {
    const children = node.children ?? [];
    if (children.length === 0) {
      const on = leafSet.has(node.key);
      if (on) {
        checked.push(node.key);
      }
      return { all: on, some: on };
    }

    let all = true;
    let some = false;
    for (const child of children) {
      const childState = walk(child);
      if (!childState.all) {
        all = false;
      }
      if (childState.some) {
        some = true;
      }
    }

    if (all && some) {
      checked.push(node.key);
    } else if (some) {
      halfChecked.push(node.key);
    }

    return { all: all && some, some };
  };

  if (tree) {
    walk(tree);
  }

  return { checked, halfChecked };
};

/** Flat id → name map for allocation labels. */
export const zoneNameMap = (tree: ZoneTreeNode | null): Record<string, string> => {
  const map: Record<string, string> = {};
  const walk = (node: ZoneTreeNode) => {
    map[node.key] = node.title;
    for (const child of node.children ?? []) {
      walk(child);
    }
  };
  if (tree) {
    walk(tree);
  }
  return map;
};

/** Qty map from allocations (default 1). */
export const qtyByLeafFromAllocations = (
  allocations: EstimateLineAllocationFormRow[],
): Record<string, number> => {
  const map: Record<string, number> = {};
  for (const row of allocations) {
    map[row.site_zone_id] = Number(row.quantity) > 0 ? Number(row.quantity) : 1;
  }
  return map;
};

/**
 * Z8 legacy normalize: prefer qty when qty_manual; drop non-leaf allocation ids.
 */
export const normalizeExclusiveLine = <
  T extends {
    allocations: EstimateLineAllocationFormRow[];
    qty_manual: boolean;
    quantity: number;
  },
>(
  line: T,
  leafIds: Iterable<string>,
): T => {
  if (line.qty_manual && line.allocations.length > 0) {
    return { ...line, allocations: [] };
  }

  const leafSet = leafIds instanceof Set ? leafIds : new Set(leafIds);
  const allocations = line.allocations.filter((row) => leafSet.has(row.site_zone_id));
  if (allocations.length === line.allocations.length) {
    return line;
  }
  return { ...line, allocations };
};

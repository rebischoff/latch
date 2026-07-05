import type { DataNode } from "antd/es/tree";

export type SiteZoneFormRow = {
  can_delete: boolean;
  id: string;
  name: string;
  sort_order: number;
  status: string;
  zones: SiteZoneFormRow[];
};

export type SiteScopeFormRow = {
  can_delete: boolean;
  id: string;
  name: string;
  root_category_id: string;
  root_category_name: string;
  sort_order: number;
  status: string;
  zones: SiteZoneFormRow[];
};

export type SiteScopesFormValues = {
  scopes: SiteScopeFormRow[];
};

export type ScopesRowKind = "scope" | "zone";

export type SiteScopesTreeNode = {
  children?: SiteScopesTreeNode[];
  key: string;
  label?: string;
  rowKind: ScopesRowKind;
  scopeIndex?: number;
  zoneId?: string;
};

export type SiteScopesAntdTreeNode = DataNode & {
  depth: number;
  rowKind: ScopesRowKind;
  scopeIndex?: number;
  zoneId?: string;
};

export const toAntdTreeData = (
  nodes: SiteScopesTreeNode[],
  depth = 0,
): SiteScopesAntdTreeNode[] =>
  nodes.map((node) => {
    const childNodes =
      node.children && node.children.length > 0
        ? toAntdTreeData(node.children, depth + 1)
        : undefined;

    return {
      key: node.key,
      title: node.label ?? "",
      rowKind: node.rowKind,
      zoneId: node.zoneId,
      scopeIndex: node.scopeIndex,
      depth,
      draggable: true,
      isLeaf: childNodes === undefined ? true : undefined,
      children: childNodes,
    };
  });

export const makeZoneRow = (
  overrides: Partial<SiteZoneFormRow> = {},
): SiteZoneFormRow => ({
  id: crypto.randomUUID(),
  name: "",
  sort_order: 1,
  status: "active",
  can_delete: true,
  zones: [],
  ...overrides,
});

export const makeScopeRow = (
  rootCategoryId: string,
  rootCategoryName: string,
  sortOrder: number,
): SiteScopeFormRow => ({
  id: crypto.randomUUID(),
  root_category_id: rootCategoryId,
  root_category_name: rootCategoryName,
  name: rootCategoryName,
  sort_order: sortOrder,
  status: "active",
  can_delete: true,
  zones: [],
});

const zoneTreeNodes = (zones: SiteZoneFormRow[] | undefined): SiteScopesTreeNode[] =>
  (zones ?? []).map((zone) => ({
    key: `zone:${zone.id}`,
    rowKind: "zone",
    zoneId: zone.id,
    label: zone.name,
    children: zoneTreeNodes(zone.zones),
  }));

export const buildScopesTree = (scopes: SiteScopeFormRow[]): SiteScopesTreeNode[] => {
  const sortedScopes = [...scopes].sort(
    (left, right) => left.sort_order - right.sort_order,
  );

  return sortedScopes
    .filter((scope) => Boolean(scope.id))
    .map((scope) => ({
      key: `scope:${scope.id}`,
      rowKind: "scope",
      label: scope.root_category_name,
      scopeIndex: scopes.findIndex((row) => row.id === scope.id),
      children: zoneTreeNodes(scope.zones),
    }));
};

export const parentKeyForScopeId = (scopeId: string): string => `scope:${scopeId}`;

export const scopeIdForParentKey = (
  parentKey: string,
  scopes: SiteScopeFormRow[],
): string | null => {
  const scopeId = parentKey.replace(/^scope:/, "");
  return scopes.some((scope) => scope.id === scopeId) ? scopeId : null;
};

export type ZoneLocation = { path: number[]; scopeIndex: number };

const findZoneInList = (
  zones: SiteZoneFormRow[],
  zoneId: string,
  prefix: number[],
): number[] | null => {
  for (let index = 0; index < zones.length; index += 1) {
    const zone = zones[index];
    if (!zone) {
      continue;
    }

    if (zone.id === zoneId) {
      return [...prefix, index];
    }

    const nested = findZoneInList(zone.zones, zoneId, [...prefix, index]);
    if (nested) {
      return nested;
    }
  }

  return null;
};

export const findZoneLocation = (
  scopes: SiteScopeFormRow[],
  zoneId: string,
): ZoneLocation | null => {
  for (let scopeIndex = 0; scopeIndex < scopes.length; scopeIndex += 1) {
    const scope = scopes[scopeIndex];
    if (!scope) {
      continue;
    }

    const path = findZoneInList(scope.zones, zoneId, []);
    if (path) {
      return { scopeIndex, path };
    }
  }

  return null;
};

const getZoneAtPath = (
  zones: SiteZoneFormRow[],
  path: number[],
): SiteZoneFormRow | undefined => {
  let current: SiteZoneFormRow | undefined;
  let list = zones;

  for (const index of path) {
    current = list[index];
    if (!current) {
      return undefined;
    }
    list = current.zones;
  }

  return current;
};

const setZoneAtPath = (
  zones: SiteZoneFormRow[],
  path: number[],
  updater: (zone: SiteZoneFormRow) => SiteZoneFormRow,
): SiteZoneFormRow[] => {
  if (path.length === 0) {
    return zones;
  }

  const [head, ...rest] = path;
  return zones.map((zone, index) => {
    if (index !== head) {
      return zone;
    }

    if (rest.length === 0) {
      return updater(zone);
    }

    return {
      ...zone,
      zones: setZoneAtPath(zone.zones, rest, updater),
    };
  });
};

const insertZoneAtPath = (
  zones: SiteZoneFormRow[],
  parentPath: number[],
  row: SiteZoneFormRow,
): SiteZoneFormRow[] => {
  if (parentPath.length === 0) {
    return [...zones, { ...row, sort_order: zones.length + 1 }];
  }

  const [head, ...rest] = parentPath;
  return zones.map((zone, index) => {
    if (index !== head) {
      return zone;
    }

    if (rest.length === 0) {
      const nextZones = [...zone.zones, { ...row, sort_order: zone.zones.length + 1 }];
      return { ...zone, zones: nextZones };
    }

    return {
      ...zone,
      zones: insertZoneAtPath(zone.zones, rest, row),
    };
  });
};

const removeZoneAtPath = (
  zones: SiteZoneFormRow[],
  path: number[],
): SiteZoneFormRow[] => {
  if (path.length === 1) {
    const index = path[0] ?? -1;
    return zones
      .filter((_, rowIndex) => rowIndex !== index)
      .map((zone, rowIndex) => ({ ...zone, sort_order: rowIndex + 1 }));
  }

  const [head, ...rest] = path;
  return zones.map((zone, index) => {
    if (index !== head) {
      return zone;
    }

    return {
      ...zone,
      zones: removeZoneAtPath(zone.zones, rest),
    };
  });
};

const reorderSiblingsAtPath = (
  zones: SiteZoneFormRow[],
  parentPath: number[],
  fromIndex: number,
  toIndex: number,
): SiteZoneFormRow[] => {
  if (parentPath.length === 0) {
    const next = [...zones];
    const [moved] = next.splice(fromIndex, 1);
    if (!moved) {
      return zones;
    }
    next.splice(toIndex, 0, moved);
    return next.map((zone, index) => ({ ...zone, sort_order: index + 1 }));
  }

  const [head, ...rest] = parentPath;
  return zones.map((zone, index) => {
    if (index !== head) {
      return zone;
    }

    return {
      ...zone,
      zones: reorderSiblingsAtPath(zone.zones, rest, fromIndex, toIndex),
    };
  });
};

export const insertZoneChild = (
  values: SiteScopesFormValues,
  parentKey: string,
  row: SiteZoneFormRow,
): SiteScopesFormValues => {
  if (parentKey.startsWith("scope:")) {
    const scopeId = parentKey.replace(/^scope:/, "");
    const scopeIndex = values.scopes.findIndex((scope) => scope.id === scopeId);
    if (scopeIndex < 0) {
      return values;
    }

    const scopes = [...values.scopes];
    const scope = scopes[scopeIndex];
    if (!scope) {
      return values;
    }

    scopes[scopeIndex] = {
      ...scope,
      zones: insertZoneAtPath(scope.zones ?? [], [], row),
    };

    return { ...values, scopes };
  }

  if (parentKey.startsWith("zone:")) {
    const zoneId = parentKey.replace(/^zone:/, "");
    const location = findZoneLocation(values.scopes, zoneId);
    if (!location) {
      return values;
    }

    const scopes = [...values.scopes];
    const scope = scopes[location.scopeIndex];
    if (!scope) {
      return values;
    }

    scopes[location.scopeIndex] = {
      ...scope,
      zones: insertZoneAtPath(scope.zones ?? [], location.path, row),
    };

    return { ...values, scopes };
  }

  return values;
};

export const removeZoneById = (
  values: SiteScopesFormValues,
  zoneId: string,
): SiteScopesFormValues => {
  const location = findZoneLocation(values.scopes, zoneId);
  if (!location) {
    return values;
  }

  const scopes = [...values.scopes];
  const scope = scopes[location.scopeIndex];
  if (!scope) {
    return values;
  }

  scopes[location.scopeIndex] = {
    ...scope,
    zones: removeZoneAtPath(scope.zones, location.path),
  };

  return { ...values, scopes };
};

export const reorderZoneSiblings = (
  values: SiteScopesFormValues,
  zoneId: string,
  toSiblingId: string,
): SiteScopesFormValues => {
  const location = findZoneLocation(values.scopes, zoneId);
  const targetLocation = findZoneLocation(values.scopes, toSiblingId);
  if (!location || !targetLocation) {
    return values;
  }

  const sameParent =
    location.scopeIndex === targetLocation.scopeIndex &&
    location.path.slice(0, -1).join(".") === targetLocation.path.slice(0, -1).join(".");

  if (!sameParent) {
    return values;
  }

  const parentPath = location.path.slice(0, -1);
  const fromIndex = location.path[location.path.length - 1] ?? -1;
  const toIndex = targetLocation.path[targetLocation.path.length - 1] ?? -1;

  const scopes = [...values.scopes];
  const scope = scopes[location.scopeIndex];
  if (!scope) {
    return values;
  }

  scopes[location.scopeIndex] = {
    ...scope,
    zones: reorderSiblingsAtPath(scope.zones, parentPath, fromIndex, toIndex),
  };

  return { ...values, scopes };
};

export const reorderScopes = (
  scopes: SiteScopeFormRow[],
  fromIndex: number,
  toIndex: number,
): SiteScopeFormRow[] => {
  const next = [...scopes];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) {
    return scopes;
  }
  next.splice(toIndex, 0, moved);
  return next.map((scope, index) => ({ ...scope, sort_order: index + 1 }));
};

export const orderScopesForPatch = (
  values: SiteScopesFormValues,
): SiteScopesFormValues => {
  const reindexZones = (zones: SiteZoneFormRow[]): SiteZoneFormRow[] =>
    zones.map((zone, index) => ({
      ...zone,
      sort_order: index + 1,
      zones: reindexZones(zone.zones),
    }));

  return {
    scopes: values.scopes.map((scope, index) => ({
      ...scope,
      sort_order: index + 1,
      zones: reindexZones(scope.zones),
    })),
  };
};

type StrippedZonePatchRow = {
  id: string;
  name: string;
  sort_order: number;
  zones: StrippedZonePatchRow[];
};

export const stripScopesForPatch = (
  values: SiteScopesFormValues,
): {
  scopes: Array<{
    id: string;
    name: string;
    root_category_id: string;
    sort_order: number;
    zones: StrippedZonePatchRow[];
  }>;
} => {
  const stripZone = (zone: SiteZoneFormRow): StrippedZonePatchRow => ({
    id: zone.id,
    name: zone.name,
    sort_order: zone.sort_order,
    zones: zone.zones.map(stripZone),
  });

  const ordered = orderScopesForPatch(values);

  return {
    scopes: ordered.scopes.map((scope) => ({
      id: scope.id,
      root_category_id: scope.root_category_id,
      name: scope.name,
      sort_order: scope.sort_order,
      zones: scope.zones.map(stripZone),
    })),
  };
};

export const getZoneById = (
  values: SiteScopesFormValues,
  zoneId: string,
): SiteZoneFormRow | undefined => {
  const location = findZoneLocation(values.scopes, zoneId);
  if (!location) {
    return undefined;
  }

  const scope = values.scopes[location.scopeIndex];
  return scope ? getZoneAtPath(scope.zones, location.path) : undefined;
};

export const updateZoneById = (
  values: SiteScopesFormValues,
  zoneId: string,
  updater: (zone: SiteZoneFormRow) => SiteZoneFormRow,
): SiteScopesFormValues => {
  const location = findZoneLocation(values.scopes, zoneId);
  if (!location) {
    return values;
  }

  const scopes = [...values.scopes];
  const scope = scopes[location.scopeIndex];
  if (!scope) {
    return values;
  }

  scopes[location.scopeIndex] = {
    ...scope,
    zones: setZoneAtPath(scope.zones, location.path, updater),
  };

  return { ...values, scopes };
};

export const siblingZoneIds = (
  values: SiteScopesFormValues,
  zoneId: string,
): string[] => {
  const location = findZoneLocation(values.scopes, zoneId);
  if (!location) {
    return [];
  }

  const parentPath = location.path.slice(0, -1);
  const scope = values.scopes[location.scopeIndex];
  if (!scope) {
    return [];
  }

  const parent =
    parentPath.length === 0
      ? scope.zones
      : getZoneAtPath(scope.zones, parentPath)?.zones ?? [];

  return parent.map((zone) => zone.id);
};

export const scopeSiblingIds = (scopes: SiteScopeFormRow[]): string[] =>
  scopes.map((scope) => scope.id);

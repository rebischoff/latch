import type { DataNode } from "antd/es/tree";

import type {
  EstimateScopeFormRow,
  EstimateSiteTreeFormRow,
  EstimateSiteZoneTreeFormRow,
} from "@/components/estimates/estimate-line-tree";

export type EstimateScopeTreeRowKind = "scope" | "zone";

export type EstimateScopeTreeNode = {
  children?: EstimateScopeTreeNode[];
  key: string;
  label?: string;
  rowKind: EstimateScopeTreeRowKind;
  scopeIndex?: number;
  siteScopeId?: string;
  zoneId?: string;
};

export type EstimateScopeAntdTreeNode = DataNode & {
  depth: number;
  rowKind: EstimateScopeTreeRowKind;
  scopeIndex?: number;
  siteScopeId?: string;
  zoneId?: string;
};

const zoneTreeNodes = (
  zones: EstimateSiteZoneTreeFormRow[] | undefined,
  scopeIndex: number | undefined,
  siteScopeId: string,
): EstimateScopeTreeNode[] =>
  (zones ?? []).map((zone) => ({
    key: `zone:${siteScopeId}:${zone.id}`,
    rowKind: "zone",
    label: zone.name,
    zoneId: zone.id,
    scopeIndex,
    siteScopeId,
    children:
      zone.zones && zone.zones.length > 0
        ? zoneTreeNodes(zone.zones, scopeIndex, siteScopeId)
        : undefined,
  }));

export const buildEstimateScopeTree = (
  siteTree: EstimateSiteTreeFormRow | null | undefined,
): EstimateScopeTreeNode[] => {
  if (!siteTree) {
    return [];
  }

  return siteTree.scopes.map((scope, scopeIndex) => ({
    key: `scope:${scope.id}`,
    rowKind: "scope",
    label: scope.name,
    siteScopeId: scope.id,
    scopeIndex,
    children: zoneTreeNodes(scope.zones, scopeIndex, scope.id),
  }));
};

export const toAntdScopeTreeData = (
  nodes: EstimateScopeTreeNode[],
  depth = 0,
): EstimateScopeAntdTreeNode[] =>
  nodes.map((node) => {
    const childNodes =
      node.children && node.children.length > 0
        ? toAntdScopeTreeData(node.children, depth + 1)
        : undefined;

    return {
      key: node.key,
      title: node.label ?? "",
      rowKind: node.rowKind,
      zoneId: node.zoneId,
      scopeIndex: node.scopeIndex,
      siteScopeId: node.siteScopeId,
      depth,
      isLeaf: childNodes === undefined ? true : undefined,
      children: childNodes,
    };
  });

export const findScopeIndexBySiteScopeId = (
  scopes: EstimateScopeFormRow[],
  siteScopeId: string,
): number => scopes.findIndex((scope) => scope.site_scope_id === siteScopeId);

export const isScopeChecked = (
  scopes: EstimateScopeFormRow[],
  siteScopeId: string,
): boolean => findScopeIndexBySiteScopeId(scopes, siteScopeId) >= 0;

export const isZoneChecked = (
  scopes: EstimateScopeFormRow[],
  siteScopeId: string,
  zoneId: string,
): boolean => {
  const scopeIndex = findScopeIndexBySiteScopeId(scopes, siteScopeId);
  if (scopeIndex < 0) {
    return false;
  }

  return scopes[scopeIndex]?.zones.some((zone) => zone.site_zone_id === zoneId) ?? false;
};

export const scopeReferencedByLines = (
  scopes: EstimateScopeFormRow[],
  lineItems: Array<{ estimate_scope_id: string | null }>,
  siteScopeId: string,
): boolean => {
  const scopeIndex = findScopeIndexBySiteScopeId(scopes, siteScopeId);
  if (scopeIndex < 0) {
    return false;
  }

  const scopeId = scopes[scopeIndex]?.id;
  if (!scopeId) {
    return false;
  }

  return lineItems.some((line) => line.estimate_scope_id === scopeId);
};

export const zoneReferencedByLines = (
  lineItems: Array<{ site_zone_id: string | null }>,
  zoneId: string,
): boolean => lineItems.some((line) => line.site_zone_id === zoneId);

export const makeScopeRow = (
  siteScopeId: string,
  rootItemId: string,
  rootCategoryName: string | null,
  siteScopeName: string | null,
  sortOrder: number,
  specs: EstimateScopeFormRow["specs"] = [],
): EstimateScopeFormRow => ({
  id: crypto.randomUUID(),
  site_scope_id: siteScopeId,
  root_item_id: rootItemId,
  root_item_name: rootCategoryName,
  site_scope_name: siteScopeName,
  sort_order: sortOrder,
  complexity_factor_id: null,
  specs,
  zones: [],
});

export const makeZoneMembership = (siteZoneId: string, sortOrder: number) => ({
  site_zone_id: siteZoneId,
  sort_order: sortOrder,
  complexity_factor_id: null,
  specs: [],
});

import type { DataNode } from "antd/es/tree";

import type {
  EstimateScopeFormRow,
  EstimateSiteTreeFormRow,
  EstimateSiteZoneTreeFormRow,
} from "@/components/estimates/estimate-line-tree";

export type EstimateScopeTreeRowKind = "general" | "scope" | "zone";

export type EstimateScopeTreeNode = {
  children?: EstimateScopeTreeNode[];
  key: string;
  label?: string;
  rowKind: EstimateScopeTreeRowKind;
  scopeIndex?: number;
  siteScopeId?: string | null;
  zoneId?: string;
};

export type EstimateScopeAntdTreeNode = DataNode & {
  depth: number;
  rowKind: EstimateScopeTreeRowKind;
  scopeIndex?: number;
  siteScopeId?: string | null;
  zoneId?: string;
};

export const GENERAL_TREE_KEY = "__general__";

const zoneTreeNodes = (
  zones: EstimateSiteZoneTreeFormRow[] | undefined,
  scopeIndex: number | undefined,
  siteScopeId: string | null,
): EstimateScopeTreeNode[] =>
  (zones ?? []).map((zone) => ({
    key: `zone:${siteScopeId ?? "general"}:${zone.id}`,
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

  const generalNode: EstimateScopeTreeNode = {
    key: GENERAL_TREE_KEY,
    rowKind: "general",
    label: "General",
    siteScopeId: null,
    children: zoneTreeNodes(siteTree.general_zones, undefined, null),
  };

  const scopeNodes: EstimateScopeTreeNode[] = siteTree.scopes.map((scope, scopeIndex) => ({
    key: `scope:${scope.id}`,
    rowKind: "scope",
    label: scope.name,
    siteScopeId: scope.id,
    scopeIndex,
    children: zoneTreeNodes(scope.zones, scopeIndex, scope.id),
  }));

  return [generalNode, ...scopeNodes];
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
  siteScopeId: string | null,
): number =>
  scopes.findIndex((scope) => (scope.site_scope_id ?? null) === siteScopeId);

export const findGeneralScopeIndex = (scopes: EstimateScopeFormRow[]): number =>
  scopes.findIndex(
    (scope) => scope.site_scope_id === null && scope.root_category_id === null,
  );

export const isScopeChecked = (
  scopes: EstimateScopeFormRow[],
  siteScopeId: string | null,
): boolean => findScopeIndexBySiteScopeId(scopes, siteScopeId) >= 0;

export const isZoneChecked = (
  scopes: EstimateScopeFormRow[],
  siteScopeId: string | null,
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
  siteScopeId: string | null,
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
  siteScopeId: string | null,
  rootCategoryId: string | null,
  rootCategoryName: string | null,
  siteScopeName: string | null,
  sortOrder: number,
  specs: EstimateScopeFormRow["specs"] = [],
): EstimateScopeFormRow => ({
  id: crypto.randomUUID(),
  site_scope_id: siteScopeId,
  root_category_id: rootCategoryId,
  root_category_name: rootCategoryName,
  site_scope_name: siteScopeName,
  sort_order: sortOrder,
  labor_context_type_id: null,
  markup_type_id: null,
  specs,
  zones: [],
});

export const makeZoneMembership = (siteZoneId: string, sortOrder: number) => ({
  site_zone_id: siteZoneId,
  sort_order: sortOrder,
  specs: [],
});

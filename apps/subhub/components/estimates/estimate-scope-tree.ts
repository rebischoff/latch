import type { DataNode } from "antd/es/tree";

import type {
  EstimateScopeFormRow,
  EstimateSiteScopeTreeFormRow,
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
  included_labor_phases: [],
  specs,
  zones: [],
});

export const makeZoneMembership = (siteZoneId: string, sortOrder: number) => ({
  site_zone_id: siteZoneId,
  sort_order: sortOrder,
  complexity_factor_id: null,
  included_labor_phases: [],
  specs: [],
});

export type FlatSiteZone = {
  id: string;
  label: string;
};

export const flattenSiteZones = (
  zones: EstimateSiteZoneTreeFormRow[] | undefined,
  prefix = "",
): FlatSiteZone[] => {
  const result: FlatSiteZone[] = [];

  for (const zone of zones ?? []) {
    const label = prefix ? `${prefix} / ${zone.name}` : zone.name;
    result.push({ id: zone.id, label });
    if (zone.zones && zone.zones.length > 0) {
      result.push(...flattenSiteZones(zone.zones, label));
    }
  }

  return result;
};

export const scopesNotOnQuote = (
  siteTree: EstimateSiteTreeFormRow | null | undefined,
  scopes: EstimateScopeFormRow[],
): EstimateSiteScopeTreeFormRow[] => {
  const included = new Set(scopes.map((scope) => scope.site_scope_id));
  return (siteTree?.scopes ?? []).filter((scope) => !included.has(scope.id));
};

export const zonesNotOnQuote = (
  siteScopeId: string,
  siteTree: EstimateSiteTreeFormRow | null | undefined,
  scope: EstimateScopeFormRow,
): FlatSiteZone[] => {
  const siteScope = siteTree?.scopes.find((row) => row.id === siteScopeId);
  if (!siteScope) {
    return [];
  }

  const included = new Set(scope.zones.map((zone) => zone.site_zone_id));
  return flattenSiteZones(siteScope.zones).filter((zone) => !included.has(zone.id));
};

export const addScopeToQuote = (
  scopes: EstimateScopeFormRow[],
  siteScope: EstimateSiteScopeTreeFormRow,
  specTemplates?: EstimateSiteTreeFormRow["spec_templates"],
): EstimateScopeFormRow[] => {
  if (findScopeIndexBySiteScopeId(scopes, siteScope.id) >= 0) {
    return scopes;
  }

  const specs =
    siteScope.root_item_id && specTemplates?.[siteScope.root_item_id]
      ? specTemplates[siteScope.root_item_id].map((spec) => ({ ...spec }))
      : [];

  return [
    ...scopes,
    makeScopeRow(
      siteScope.id,
      siteScope.root_item_id,
      null,
      siteScope.name,
      scopes.length + 1,
      specs,
    ),
  ];
};

export const addZoneToQuote = (
  scopes: EstimateScopeFormRow[],
  siteScopeId: string,
  zoneId: string,
  siteTree: EstimateSiteTreeFormRow | null | undefined,
): EstimateScopeFormRow[] => {
  const siteScope = siteTree?.scopes.find((scope) => scope.id === siteScopeId);
  if (!siteScope) {
    return scopes;
  }

  let next = addScopeToQuote(scopes, siteScope, siteTree?.spec_templates);
  const scopeIndex = findScopeIndexBySiteScopeId(next, siteScopeId);
  if (scopeIndex < 0) {
    return next;
  }

  const scope = next[scopeIndex];
  if (!scope || scope.zones.some((zone) => zone.site_zone_id === zoneId)) {
    return next;
  }

  const zoneSpecs =
    siteScope.root_item_id && siteTree?.spec_templates?.[siteScope.root_item_id]
      ? siteTree.spec_templates[siteScope.root_item_id].map((spec) => ({ ...spec }))
      : [];

  const updated = [...next];
  updated[scopeIndex] = {
    ...scope,
    zones: [
      ...scope.zones,
      {
        ...makeZoneMembership(zoneId, scope.zones.length + 1),
        specs: zoneSpecs,
      },
    ],
  };

  return updated;
};

export const removeScopeFromQuote = (
  scopes: EstimateScopeFormRow[],
  lineItems: Array<{ estimate_scope_id: string | null }>,
  estimateScopeId: string,
): EstimateScopeFormRow[] | null => {
  const scope = scopes.find((row) => row.id === estimateScopeId);
  if (!scope) {
    return null;
  }

  if (scopeReferencedByLines(scopes, lineItems, scope.site_scope_id)) {
    return null;
  }

  return scopes
    .filter((row) => row.id !== estimateScopeId)
    .map((row, index) => ({ ...row, sort_order: index + 1 }));
};

export const removeZoneFromQuote = (
  scopes: EstimateScopeFormRow[],
  lineItems: Array<{ site_zone_id: string | null }>,
  scopeIndex: number,
  zoneId: string,
): EstimateScopeFormRow[] | null => {
  if (zoneReferencedByLines(lineItems, zoneId)) {
    return null;
  }

  const scope = scopes[scopeIndex];
  if (!scope) {
    return null;
  }

  const nextZones = scope.zones.filter((zone) => zone.site_zone_id !== zoneId);
  const next = [...scopes];
  next[scopeIndex] = { ...scope, zones: nextZones };
  return next;
};

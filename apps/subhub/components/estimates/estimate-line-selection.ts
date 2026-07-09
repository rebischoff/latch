import type {
  EstimateLineFormRow,
  EstimateScopeFormRow,
  EstimateSiteTreeFormRow,
} from "@/components/estimates/estimate-line-tree";
import {
  addScopeToQuote,
  addZoneToQuote,
  findScopeIndexBySiteScopeId,
} from "@/components/estimates/estimate-scope-tree";

export type EstimateBucketSelection = {
  siteScopeId: string;
  siteZoneId: string | null;
};

export type EstimateBucketBinding = {
  scopeIndex: number;
  zoneIndex?: number;
};

export const parseSelectionFromTreeKey = (
  key: string,
): EstimateBucketSelection | null => {
  if (key.startsWith("zone:")) {
    const [, siteScopeId, siteZoneId] = key.split(":");
    if (!siteScopeId || !siteZoneId) {
      return null;
    }
    return { siteScopeId, siteZoneId };
  }

  if (key.startsWith("scope:")) {
    const siteScopeId = key.replace(/^scope:/, "");
    if (!siteScopeId) {
      return null;
    }
    return { siteScopeId, siteZoneId: null };
  }

  return null;
};

export const selectionToTreeKey = (selection: EstimateBucketSelection): string =>
  selection.siteZoneId === null
    ? `scope:${selection.siteScopeId}`
    : `zone:${selection.siteScopeId}:${selection.siteZoneId}`;

export const defaultBucketSelection = (
  siteTree: EstimateSiteTreeFormRow | null | undefined,
): EstimateBucketSelection | null => {
  const firstScope = siteTree?.scopes[0];
  if (!firstScope) {
    return null;
  }

  return { siteScopeId: firstScope.id, siteZoneId: null };
};

export const resolveBucketBinding = (
  scopes: EstimateScopeFormRow[],
  selection: EstimateBucketSelection,
): EstimateBucketBinding | null => {
  const scopeIndex = findScopeIndexBySiteScopeId(scopes, selection.siteScopeId);
  if (scopeIndex < 0) {
    return null;
  }

  if (selection.siteZoneId === null) {
    return { scopeIndex };
  }

  const zoneIndex = scopes[scopeIndex]?.zones.findIndex(
    (zone) => zone.site_zone_id === selection.siteZoneId,
  );
  if (zoneIndex === undefined || zoneIndex < 0) {
    return null;
  }

  return { scopeIndex, zoneIndex };
};

export const filterLinesForSelection = (
  lineItems: EstimateLineFormRow[],
  scopes: EstimateScopeFormRow[],
  selection: EstimateBucketSelection,
): EstimateLineFormRow[] => {
  const binding = resolveBucketBinding(scopes, selection);
  if (!binding) {
    return [];
  }

  const estimateScopeId = scopes[binding.scopeIndex]?.id;
  if (!estimateScopeId) {
    return [];
  }

  return lineItems.filter((line) => {
    if (line.line_role !== "standalone") {
      return false;
    }

    if (line.estimate_scope_id !== estimateScopeId) {
      return false;
    }

    if (selection.siteZoneId === null) {
      return (line.site_zone_id ?? null) === null;
    }

    return line.site_zone_id === selection.siteZoneId;
  });
};

export const ensureBucketIncluded = (
  scopes: EstimateScopeFormRow[],
  siteTree: EstimateSiteTreeFormRow | null | undefined,
  selection: EstimateBucketSelection,
): { scopes: EstimateScopeFormRow[]; binding: EstimateBucketBinding } | null => {
  if (!siteTree) {
    return null;
  }

  const siteScope = siteTree.scopes.find((scope) => scope.id === selection.siteScopeId);
  if (!siteScope) {
    return null;
  }

  let nextScopes = scopes;
  let scopeIndex = findScopeIndexBySiteScopeId(nextScopes, selection.siteScopeId);

  if (scopeIndex < 0) {
    nextScopes = addScopeToQuote(nextScopes, siteScope, siteTree.spec_templates);
    scopeIndex = findScopeIndexBySiteScopeId(nextScopes, selection.siteScopeId);
  }

  if (scopeIndex < 0) {
    return null;
  }

  if (selection.siteZoneId === null) {
    return { scopes: nextScopes, binding: { scopeIndex } };
  }

  nextScopes = addZoneToQuote(
    nextScopes,
    selection.siteScopeId,
    selection.siteZoneId,
    siteTree,
  );
  scopeIndex = findScopeIndexBySiteScopeId(nextScopes, selection.siteScopeId);
  const scope = nextScopes[scopeIndex];
  const zoneIndex = scope?.zones.findIndex(
    (zone) => zone.site_zone_id === selection.siteZoneId,
  );

  if (!scope || zoneIndex === undefined || zoneIndex < 0) {
    return null;
  }

  return { scopes: nextScopes, binding: { scopeIndex, zoneIndex } };
};

export const emptyLineItemsCopy = (
  selection: EstimateBucketSelection | null,
): string => {
  if (!selection) {
    return "Select a scope or zone";
  }

  if (selection.siteZoneId === null) {
    return "No unzoned lines in this scope";
  }

  return "No lines in this zone";
};

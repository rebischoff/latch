export type EstimateLineRole = "standalone" | "kit_header" | "kit_component";

export type EstimateLineFormRow = {
  id: string;
  line_role: EstimateLineRole;
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  unit_price: number;
  unit_material: number;
  unit_labor: number;
  unit_freight: number;
  unit_incidental: number;
  unit_price_target: number;
  parent_line_id: string | null;
  estimate_scope_id: string | null;
  site_zone_id: string | null;
  lock: "line" | "none" | "sell";
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
  options?: EstimateScopeSpecOptionFormRow[];
};

export type EstimateScopeLaborPhaseFormRow = {
  labor_phase_id: string;
  labor_phase_name?: string;
  sort_order?: number;
};

export type EstimateScopeZoneFormRow = {
  complexity_factor_id: string | null;
  included_labor_phases: EstimateScopeLaborPhaseFormRow[];
  site_zone_id: string;
  sort_order: number;
  specs: EstimateScopeSpecFormRow[];
};

export type EstimateScopeFormRow = {
  complexity_factor_id: string | null;
  id: string;
  included_labor_phases: EstimateScopeLaborPhaseFormRow[];
  site_scope_id: string;
  root_item_id: string;
  root_item_name: string | null;
  site_scope_name: string | null;
  sort_order: number;
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
  root_item_id: string;
  zones: EstimateSiteZoneTreeFormRow[];
};

export type EstimateSiteTreeFormRow = {
  scopes: EstimateSiteScopeTreeFormRow[];
  spec_templates?: Record<string, EstimateScopeSpecFormRow[]>;
};

export type EstimateLineEditorFormValues = {
  scopes: EstimateScopeFormRow[];
  line_items: EstimateLineFormRow[];
  site_tree?: EstimateSiteTreeFormRow | null;
};

export type TreeRowKind = "scope" | "zone" | "line";

export type EstimateLineTreeNode = {
  children?: EstimateLineTreeNode[];
  key: string;
  label?: string;
  lineId?: string;
  rowKind: TreeRowKind;
  scopeId?: string;
  scopeIndex?: number;
  siteZoneId?: string | null;
  zoneIndex?: number;
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
    unit: "ea",
    unit_cost: 0,
    unit_price: 0,
    unit_material: 0,
    unit_labor: 0,
    unit_freight: 0,
    unit_incidental: 0,
    unit_price_target: 0,
    parent_line_id: null,
    estimate_scope_id: null,
    site_zone_id: null,
    lock: "none",
    phase_id: null,
    item_id: null,
    part_id: null,
    vendor_part_id: null,
    ...rest,
  };
};

const linesForParent = (
  lineItems: EstimateLineFormRow[],
  estimateScopeId: string,
  siteZoneId: string | null,
): EstimateLineFormRow[] =>
  lineItems.filter(
    (line) =>
      line.estimate_scope_id === estimateScopeId &&
      (line.site_zone_id ?? null) === siteZoneId,
  );

const lineTreeNodes = (
  lineItems: EstimateLineFormRow[],
  estimateScopeId: string,
  siteZoneId: string | null,
): EstimateLineTreeNode[] =>
  linesForParent(lineItems, estimateScopeId, siteZoneId).map((line) => ({
    key: `line:${line.id}`,
    rowKind: "line",
    lineId: line.id,
    scopeId: estimateScopeId,
    siteZoneId,
  }));

const zoneTreeNodes = (
  lineItems: EstimateLineFormRow[],
  estimateScopeId: string,
  zones: EstimateScopeZoneFormRow[],
  labelByZoneId: Map<string, string>,
  scopeIndex: number,
): EstimateLineTreeNode[] =>
  zones.map((zone, zoneIndex) => ({
    key: `zone:${estimateScopeId}:${zone.site_zone_id}`,
    rowKind: "zone",
    label: labelByZoneId.get(zone.site_zone_id) ?? "Zone",
    scopeId: estimateScopeId,
    scopeIndex,
    zoneIndex,
    siteZoneId: zone.site_zone_id,
    children: lineTreeNodes(lineItems, estimateScopeId, zone.site_zone_id),
  }));

const buildZoneLabelMap = (
  zones: EstimateSiteZoneTreeFormRow[] | undefined,
  map = new Map<string, string>(),
): Map<string, string> => {
  for (const zone of zones ?? []) {
    map.set(zone.id, zone.name);
    buildZoneLabelMap(zone.zones, map);
  }
  return map;
};

export const buildLineTree = (
  scopes: EstimateScopeFormRow[],
  lineItems: EstimateLineFormRow[],
  siteTree?: EstimateSiteTreeFormRow | null,
): EstimateLineTreeNode[] => {
  const standaloneLines = lineItems.filter((line) => line.line_role === "standalone");
  const sortedScopes = [...scopes].sort((left, right) => left.sort_order - right.sort_order);

  return sortedScopes.map((scope, scopeIndex) => {
    const label =
      scope.site_scope_name ??
      scope.root_item_name ??
      "Scope";

    const siteScopeTree = siteTree?.scopes.find(
      (row) => row.id === scope.site_scope_id,
    );
    const labelByZoneId = buildZoneLabelMap(siteScopeTree?.zones);

    const zoneNodes = zoneTreeNodes(
      standaloneLines,
      scope.id,
      scope.zones,
      labelByZoneId,
      scopeIndex,
    );

    const unzonedLines = lineTreeNodes(standaloneLines, scope.id, null);

    return {
      key: `scope:${scope.id}`,
      rowKind: "scope",
      label,
      scopeId: scope.id,
      scopeIndex,
      children: [...zoneNodes, ...unzonedLines],
    };
  });
};

export const orderLineItemsForPatch = (
  scopes: EstimateScopeFormRow[],
  lineItems: EstimateLineFormRow[],
): EstimateLineFormRow[] => {
  const buckets = new Map<string, EstimateLineFormRow[]>();

  for (const line of lineItems) {
    if (!line.estimate_scope_id) {
      continue;
    }
    const zoneKey = line.site_zone_id ?? "__unzoned__";
    const key = `${line.estimate_scope_id}:${zoneKey}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(line);
    buckets.set(key, bucket);
  }

  const ordered: EstimateLineFormRow[] = [];
  const sortedScopes = [...scopes].sort((left, right) => left.sort_order - right.sort_order);

  for (const scope of sortedScopes) {
    ordered.push(...(buckets.get(`${scope.id}:__unzoned__`) ?? []));
    for (const zone of scope.zones) {
      ordered.push(...(buckets.get(`${scope.id}:${zone.site_zone_id}`) ?? []));
    }
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

export const parentKeyForScopeId = (scopeId: string): string => `scope:${scopeId}`;

export const parentKeyForZone = (scopeId: string, siteZoneId: string): string =>
  `zone:${scopeId}:${siteZoneId}`;

export type ParentTarget = {
  estimate_scope_id: string;
  site_zone_id: string | null;
};

export const parentTargetForKey = (
  parentKey: string,
  scopes: EstimateScopeFormRow[],
): ParentTarget | null => {
  if (parentKey.startsWith("zone:")) {
    const [, scopeId, siteZoneId] = parentKey.split(":");
    if (!scopeId || !siteZoneId) {
      return null;
    }
    return scopes.some((scope) => scope.id === scopeId)
      ? { estimate_scope_id: scopeId, site_zone_id: siteZoneId }
      : null;
  }

  if (parentKey.startsWith("scope:")) {
    const scopeId = parentKey.replace(/^scope:/, "");
    return scopes.some((scope) => scope.id === scopeId)
      ? { estimate_scope_id: scopeId, site_zone_id: null }
      : null;
  }

  return null;
};

export const rootItemIdForParentKey = (
  parentKey: string,
  scopes: EstimateScopeFormRow[],
): string | null => {
  const target = parentTargetForKey(parentKey, scopes);
  if (!target) {
    return null;
  }

  return scopes.find((scope) => scope.id === target.estimate_scope_id)?.root_item_id ?? null;
};

// Legacy aliases for gradual migration in tests/docs
export type EstimateSystemFormRow = EstimateScopeFormRow;
export type EstimateSystemSpecFormRow = EstimateScopeSpecFormRow;

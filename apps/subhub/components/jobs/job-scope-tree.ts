import type { FieldPath } from "react-hook-form";

import {
  estimateScopeSpecToPatchBody,
  estimateScopeSpecsToDisplay,
} from "@/lib/estimates/estimate-scope-spec-form";
import type {
  JobConditionRow,
  JobLineAllocationRow,
  JobLineItemRow,
} from "@/lib/jobs/descriptors/job-detail";

export type JobConditionFormRow = {
  id: string;
  name: string;
  parent_condition_id: string | null;
  site_zone_id: string | null;
  site_zone_name: string | null;
  root_item_id: string | null;
  root_item_name: string | null;
  sort_order: number;
  complexity_factor_id: string | null;
  /** Win-time snapshot — display-only; omitted from PATCH (48 JC5). */
  complexity_factor_id_at_win: string | null;
  labor_only: boolean;
  labor_only_explicit: boolean;
  labor_phases_explicit: boolean;
  included_labor_phases: Array<{ labor_phase_id: string; labor_phase_name?: string }>;
  include_discontinued: boolean;
  include_discontinued_explicit: boolean;
  specs: JobConditionRow["specs"];
  conditions: JobConditionFormRow[];
};

/** Job Scope form values as seen by the Scope tab panels (task 46 Scope-U1/S1). */
export type JobScopeFormValues = {
  conditions: JobConditionFormRow[];
  line_items: JobLineFormRow[];
};

export type JobLineFormRow = {
  id: string;
  job_condition_id: string | null;
  line_role: "standalone" | "kit_header" | "kit_component";
  line_kind: string;
  parent_line_id: string | null;
  description: string;
  quantity: number;
  sold_quantity: number;
  qty_manual: boolean;
  unit: string;
  unit_cost: number;
  unit_price: number;
  unit_material: number;
  unit_labor: number;
  unit_freight: number;
  unit_incidental: number;
  unit_price_target: number | null;
  sold_unit_price: number;
  sold_unit_cost: number;
  sold_unit_material: number;
  sold_unit_labor: number;
  sold_unit_freight: number;
  sold_unit_incidental: number;
  allocations: JobLineAllocationRow[];
  sales_locked: boolean;
  material_locked: boolean;
  item_id: string | null;
  item_name: string | null;
  part_id: string | null;
  part_mpn: string | null;
  vendor_part_id: string | null;
  source: string;
  status: string;
  estimate_line_id: string | null;
};

/** Scope-F1: sold contract lines freeze sold_* / sold_quantity / description (not working qty). */
export const isFrozenSoldLine = (line: {
  sold_unit_price: number;
  source: string;
}): boolean =>
  line.sold_unit_price > 0 || (line.source === "estimate" && line.sold_unit_price > 0);

/**
 * JC5: show C-panel drift when win baseline exists and current effective complexity differs.
 * Null baseline (manual / post-win add) → never flag.
 */
export const isComplexityAdjustedFromSold = (
  complexityFactorIdAtWin: string | null | undefined,
  currentEffectiveComplexityFactorId: string | null | undefined,
): boolean => {
  if (complexityFactorIdAtWin == null || complexityFactorIdAtWin === "") {
    return false;
  }
  const current = currentEffectiveComplexityFactorId ?? null;
  return current !== complexityFactorIdAtWin;
};

/** JLI-6: job-only danger when places don't cover working qty. */
export const placesMismatchWorkingQty = (
  quantity: number,
  allocations: Array<{ quantity: number }>,
): boolean => {
  if (allocations.length === 0) {
    return quantity > 0;
  }
  const sum = allocations.reduce((total, alloc) => total + Number(alloc.quantity), 0);
  return sum !== quantity;
};

/** Root site zone for a job condition (walk to forest root). */
export const rootSiteZoneIdForJobCondition = (
  conditionId: string,
  conditions: JobConditionFormRow[],
): string | null => {
  const findPath = (
    rows: JobConditionFormRow[],
    path: JobConditionFormRow[] = [],
  ): JobConditionFormRow[] | null => {
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
  return path[0]?.site_zone_id ?? null;
};

/** Root catalog item for a job condition (walk to forest root). */
export const rootItemIdForJobCondition = (
  conditionId: string,
  conditions: JobConditionFormRow[],
): string | null => {
  const findPath = (
    rows: JobConditionFormRow[],
    path: JobConditionFormRow[] = [],
  ): JobConditionFormRow[] | null => {
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

export const mapJobConditions = (rows: unknown): JobConditionFormRow[] => {
  if (!Array.isArray(rows)) {
    return [];
  }

  const mapNode = (node: unknown, index: number): JobConditionFormRow => {
    const row = (node ?? {}) as JobConditionRow;
    return {
      id: typeof row.id === "string" ? row.id : crypto.randomUUID(),
      name: typeof row.name === "string" ? row.name : "Condition",
      parent_condition_id: row.parent_condition_id ?? null,
      site_zone_id: row.site_zone_id ?? null,
      site_zone_name: row.site_zone_name ?? null,
      root_item_id: row.root_item_id ?? null,
      root_item_name: row.root_item_name ?? null,
      sort_order: typeof row.sort_order === "number" ? row.sort_order : index + 1,
      complexity_factor_id: row.complexity_factor_id ?? null,
      complexity_factor_id_at_win: row.complexity_factor_id_at_win ?? null,
      labor_only: row.labor_only === true,
      labor_only_explicit: row.labor_only_explicit === true,
      labor_phases_explicit: row.labor_phases_explicit === true,
      included_labor_phases: Array.isArray(row.included_labor_phases)
        ? row.included_labor_phases.map((phase) => ({
            labor_phase_id: phase.labor_phase_id,
            labor_phase_name: phase.labor_phase_name,
          }))
        : [],
      include_discontinued: row.include_discontinued === true,
      include_discontinued_explicit: row.include_discontinued_explicit === true,
      // Canonical → display units (task 43 pattern) so number specs edit in authored units.
      specs: estimateScopeSpecsToDisplay(Array.isArray(row.specs) ? row.specs : []),
      conditions: Array.isArray(row.conditions)
        ? row.conditions.map((child, childIndex) => mapNode(child, childIndex))
        : [],
    };
  };

  return rows.map((row, index) => mapNode(row, index));
};

/** RHF field path builder for the job Scope form's `conditions` tree (mirrors estimate's `conditionPathToRhf`). */
export const jobConditionPathToRhf = (
  conditionPath: number[],
  suffix: string,
): FieldPath<JobScopeFormValues> => {
  let path = "conditions";
  for (let i = 0; i < conditionPath.length; i += 1) {
    path += `.${conditionPath[i]!}`;
    if (i < conditionPath.length - 1) {
      path += ".conditions";
    }
  }
  return `${path}.${suffix}` as FieldPath<JobScopeFormValues>;
};

/** Index path (root → selected) into the job condition forest, or null if not found. */
export const findJobConditionPath = (
  rows: JobConditionFormRow[],
  conditionId: string,
  prefix: number[] = [],
): number[] | null => {
  for (let i = 0; i < rows.length; i += 1) {
    const path = [...prefix, i];
    if (rows[i]!.id === conditionId) {
      return path;
    }
    const nested = findJobConditionPath(rows[i]!.conditions, conditionId, path);
    if (nested) {
      return nested;
    }
  }
  return null;
};

/** Map form conditions back to the strict PATCH shape (mirrors estimate condition patch, task 46 problem 5). */
export const jobConditionToPatch = (
  conditions: JobConditionFormRow[],
): Record<string, unknown>[] =>
  conditions.map((condition, index) => ({
    id: condition.id,
    name: condition.name,
    parent_condition_id: condition.parent_condition_id,
    site_zone_id: condition.site_zone_id,
    sort_order: index + 1,
    complexity_factor_id: condition.complexity_factor_id,
    include_discontinued: condition.include_discontinued,
    include_discontinued_explicit: condition.include_discontinued_explicit,
    labor_only: condition.labor_only,
    labor_only_explicit: condition.labor_only_explicit,
    labor_phases_explicit: condition.labor_phases_explicit,
    included_labor_phases: condition.included_labor_phases.map((phase) => ({
      labor_phase_id: phase.labor_phase_id,
    })),
    specs: condition.specs.map((spec) => estimateScopeSpecToPatchBody(spec)),
    conditions: jobConditionToPatch(condition.conditions),
  }));

export const mapJobLineItems = (rows: unknown): JobLineFormRow[] => {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row) => {
    const item = (row ?? {}) as JobLineItemRow;
    const asString = (value: unknown): string | null =>
      typeof value === "string" ? value : null;
    const asNum = (value: unknown): number =>
      typeof value === "number" ? value : 0;

    return {
      id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
      job_condition_id: asString(item.job_condition_id),
      line_role: (item.line_role as JobLineFormRow["line_role"]) ?? "standalone",
      line_kind: typeof item.line_kind === "string" ? item.line_kind : "product",
      parent_line_id: asString(item.parent_line_id),
      description: typeof item.description === "string" ? item.description : "",
      quantity: asNum(item.quantity),
      sold_quantity: asNum(item.sold_quantity),
      qty_manual: item.qty_manual === true,
      unit: typeof item.unit === "string" ? item.unit : "ea",
      unit_cost: asNum(item.unit_cost),
      unit_price: asNum(item.unit_price),
      unit_material: asNum(item.unit_material),
      unit_labor: asNum(item.unit_labor),
      unit_freight: asNum(item.unit_freight),
      unit_incidental: asNum(item.unit_incidental),
      unit_price_target:
        typeof item.unit_price_target === "number" ? item.unit_price_target : null,
      sold_unit_price: asNum(item.sold_unit_price),
      sold_unit_cost: asNum(item.sold_unit_cost),
      sold_unit_material: asNum(item.sold_unit_material),
      sold_unit_labor: asNum(item.sold_unit_labor),
      sold_unit_freight: asNum(item.sold_unit_freight),
      sold_unit_incidental: asNum(item.sold_unit_incidental),
      allocations: Array.isArray(item.allocations)
        ? item.allocations.map((alloc) => ({
            site_zone_id: alloc.site_zone_id,
            quantity: asNum(alloc.quantity),
            site_zone_name: alloc.site_zone_name ?? null,
          }))
        : [],
      sales_locked: item.sales_locked === true,
      material_locked: item.material_locked === true,
      item_id: asString(item.item_id),
      item_name: asString(item.item_name),
      part_id: asString(item.part_id),
      part_mpn: asString(item.part_mpn),
      vendor_part_id: asString(item.vendor_part_id),
      source: typeof item.source === "string" ? item.source : "manual",
      status: typeof item.status === "string" ? item.status : "active",
      estimate_line_id: asString(item.estimate_line_id),
    };
  });
};

/** Map a form line back to the strict PATCH element (sold_* / sold_quantity omitted — server-owned). */
export const jobLineToPatch = (line: JobLineFormRow): Record<string, unknown> => ({
  id: line.id,
  job_condition_id: line.job_condition_id,
  line_role: line.line_role,
  line_kind: line.line_kind,
  parent_line_id: line.parent_line_id,
  description: line.description,
  quantity: line.quantity,
  qty_manual: line.qty_manual,
  unit: line.unit,
  unit_cost: line.unit_cost,
  unit_price: line.unit_price,
  unit_material: line.unit_material,
  unit_labor: line.unit_labor,
  unit_freight: line.unit_freight,
  unit_incidental: line.unit_incidental,
  unit_price_target: line.unit_price_target,
  allocations: line.allocations.map((alloc) => ({
    site_zone_id: alloc.site_zone_id,
    quantity: alloc.quantity,
  })),
  sales_locked: line.sales_locked,
  material_locked: line.material_locked,
  item_id: line.item_id,
  part_id: line.part_id,
  vendor_part_id: line.vendor_part_id,
  source: line.source,
  status: line.status,
  estimate_line_id: line.estimate_line_id,
});

export type JobSiteZoneLeaf = { id: string; name: string; path: string };

/** Effective include_discontinued walking leaf → root (Y4 / 43 L12). */
export const resolveJobIncludeDiscontinued = (
  conditions: JobConditionFormRow[],
  conditionPath: number[],
): boolean => {
  const ancestry: JobConditionFormRow[] = [];
  let nodes = conditions;
  for (const index of conditionPath) {
    const node = nodes[index];
    if (!node) {
      break;
    }
    ancestry.push(node);
    nodes = node.conditions;
  }
  for (let i = ancestry.length - 1; i >= 0; i -= 1) {
    const node = ancestry[i]!;
    if (node.include_discontinued_explicit) {
      return node.include_discontinued;
    }
  }
  return false;
};

/** Nearest non-null complexity_factor_id walking leaf → root; else null (100%). */
export const resolveJobEffectiveComplexityFactorId = (
  conditions: JobConditionFormRow[],
  conditionPath: number[],
): string | null => {
  const ancestry: JobConditionFormRow[] = [];
  let nodes = conditions;
  for (const index of conditionPath) {
    const node = nodes[index];
    if (!node) {
      break;
    }
    ancestry.push(node);
    nodes = node.conditions;
  }
  for (let i = ancestry.length - 1; i >= 0; i -= 1) {
    const factorId = ancestry[i]?.complexity_factor_id ?? null;
    if (factorId) {
      return factorId;
    }
  }
  return null;
};

/** Root→leaf merge of non-blank job condition specs (for parts picker draft). */
export const resolveJobEffectiveBucketSpecs = (
  conditions: JobConditionFormRow[],
  conditionPath: number[],
): JobConditionFormRow["specs"] => {
  const ancestry: JobConditionFormRow[] = [];
  let nodes = conditions;
  for (const index of conditionPath) {
    const node = nodes[index];
    if (!node) {
      break;
    }
    ancestry.push(node);
    nodes = node.conditions;
  }

  const byDefId = new Map<string, JobConditionFormRow["specs"][number]>();
  for (const node of ancestry) {
    for (const spec of node.specs) {
      const blank =
        spec.spec_option_id === null &&
        spec.value_boolean === null &&
        spec.value_number === null &&
        (spec.value_number_max === null || spec.value_number_max === undefined);
      if (!blank) {
        byDefId.set(spec.spec_def_id, spec);
      } else if (!byDefId.has(spec.spec_def_id)) {
        byDefId.set(spec.spec_def_id, spec);
      }
    }
  }
  return [...byDefId.values()];
};

/** Draft payload for the job parts picker (mirrors estimate condition draft). */
export const buildJobConditionDraft = (
  conditions: JobConditionFormRow[],
  conditionId: string,
): {
  include_discontinued: boolean;
  specs: Array<{
    spec_def_id: string;
    spec_option_id: string | null;
    value_boolean: boolean | null;
    value_number: number | null;
    value_number_max: number | null;
  }>;
} | undefined => {
  const path = findJobConditionPath(conditions, conditionId);
  if (!path) {
    return undefined;
  }
  return {
    include_discontinued: resolveJobIncludeDiscontinued(conditions, path),
    specs: resolveJobEffectiveBucketSpecs(conditions, path).map((spec) => ({
      spec_def_id: spec.spec_def_id,
      spec_option_id: spec.spec_option_id,
      value_boolean: spec.value_boolean,
      value_number: spec.value_number,
      value_number_max: spec.value_number_max ?? null,
    })),
  };
};

/** Flatten an estimate-style site tree into leaf zones for the place picker. */
export const flattenSiteTreeLeaves = (siteTree: unknown): JobSiteZoneLeaf[] => {
  const leaves: JobSiteZoneLeaf[] = [];
  if (typeof siteTree !== "object" || siteTree === null) {
    return leaves;
  }

  const scopes = (siteTree as { scopes?: unknown }).scopes;
  if (!Array.isArray(scopes)) {
    return leaves;
  }

  const walk = (
    zones: unknown,
    prefix: string,
  ): void => {
    if (!Array.isArray(zones)) {
      return;
    }
    for (const zoneRow of zones) {
      const zone = zoneRow as { id?: unknown; name?: unknown; zones?: unknown };
      const id = typeof zone.id === "string" ? zone.id : "";
      const name = typeof zone.name === "string" ? zone.name : "";
      const path = prefix ? `${prefix} / ${name}` : name;
      const children = Array.isArray(zone.zones) ? zone.zones : [];
      if (children.length === 0) {
        if (id) {
          leaves.push({ id, name, path });
        }
      } else {
        walk(children, path);
      }
    }
  };

  for (const scopeRow of scopes) {
    const scope = scopeRow as { name?: unknown; zones?: unknown };
    const scopeName = typeof scope.name === "string" ? scope.name : "";
    walk(scope.zones, scopeName);
  }

  return leaves;
};

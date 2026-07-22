/**
 * Shared zone×phase checkbox cascade / indeterminate helpers (Done + Order).
 * Task 62 — one implementation for both columns.
 */

import {
  GENERAL_ZONE_KEY,
  type JobFieldProgressZoneNode,
} from "./job-field-progress";

export type CheckState = boolean | "indeterminate";

export type CascadeWorkRow = {
  job_line_id: string;
  labor_phase_ids: string[];
  zone_key: string;
};

export type CascadeCell = {
  scope_phase_id: string;
  site_zone_id: string | null;
  /** Done: complete; Order: requested — caller interprets. */
  value: boolean;
};

export const findZoneNode = (
  nodes: JobFieldProgressZoneNode[],
  key: string,
): JobFieldProgressZoneNode | null => {
  for (const node of nodes) {
    if (node.key === key) {
      return node;
    }
    if (node.children) {
      const found = findZoneNode(node.children, key);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

export const collectLeafKeys = (
  nodes: JobFieldProgressZoneNode[],
  rootKey: string,
): string[] => {
  const node = findZoneNode(nodes, rootKey);
  if (!node) {
    return [];
  }
  if (!node.children || node.children.length === 0) {
    return [node.key];
  }
  const leaves: string[] = [];
  const walk = (n: JobFieldProgressZoneNode) => {
    if (!n.children || n.children.length === 0) {
      leaves.push(n.key);
      return;
    }
    for (const child of n.children) {
      walk(child);
    }
  };
  walk(node);
  return leaves;
};

export const collectSubtreeKeys = (
  nodes: JobFieldProgressZoneNode[],
  rootKey: string,
): Set<string> | null => {
  const node = findZoneNode(nodes, rootKey);
  if (!node) {
    return null;
  }
  const keys = new Set<string>([node.key]);
  const addChildren = (children?: JobFieldProgressZoneNode[]) => {
    for (const child of children ?? []) {
      keys.add(child.key);
      addChildren(child.children);
    }
  };
  addChildren(node.children);
  return keys;
};

export const leafLaborPhases = (
  workRows: CascadeWorkRow[],
  leafZoneKey: string,
): Set<string> => {
  const set = new Set<string>();
  for (const row of workRows) {
    if (row.zone_key === leafZoneKey) {
      for (const id of row.labor_phase_ids) {
        set.add(id);
      }
    }
  }
  return set;
};

export const leavesWithPhase = (
  zoneKey: string,
  laborPhaseId: string,
  zoneTree: JobFieldProgressZoneNode[],
  workRows: CascadeWorkRow[],
): string[] => {
  const leaves: string[] = [];
  for (const leaf of collectLeafKeys(zoneTree, zoneKey)) {
    if (leafLaborPhases(workRows, leaf).has(laborPhaseId)) {
      leaves.push(leaf);
    }
  }
  return leaves;
};

export const leafPhaseValue = (
  leafZoneKey: string,
  laborPhaseId: string,
  workRows: CascadeWorkRow[],
  cells: CascadeCell[],
  scopePhasesByLineLabor: Map<string, string[]>,
): boolean => {
  const scopePhaseIds = new Set<string>();
  for (const row of workRows) {
    if (row.zone_key !== leafZoneKey) {
      continue;
    }
    if (!row.labor_phase_ids.includes(laborPhaseId)) {
      continue;
    }
    for (const spId of scopePhasesByLineLabor.get(
      `${row.job_line_id}:${laborPhaseId}`,
    ) ?? []) {
      scopePhaseIds.add(spId);
    }
  }
  if (scopePhaseIds.size === 0) {
    return false;
  }
  const siteZoneId = leafZoneKey === GENERAL_ZONE_KEY ? null : leafZoneKey;
  for (const scopePhaseId of scopePhaseIds) {
    const cell = cells.find(
      (c) =>
        c.scope_phase_id === scopePhaseId &&
        (c.site_zone_id ?? null) === siteZoneId,
    );
    if (!cell?.value) {
      return false;
    }
  }
  return true;
};

export const derivePhaseCheckState = (
  zoneKey: string,
  laborPhaseId: string,
  zoneTree: JobFieldProgressZoneNode[],
  workRows: CascadeWorkRow[],
  cells: CascadeCell[],
  scopePhasesByLineLabor: Map<string, string[]>,
): CheckState => {
  const leaves = leavesWithPhase(zoneKey, laborPhaseId, zoneTree, workRows);
  if (leaves.length === 0) {
    return false;
  }
  let checkedCount = 0;
  for (const leaf of leaves) {
    if (
      leafPhaseValue(
        leaf,
        laborPhaseId,
        workRows,
        cells,
        scopePhasesByLineLabor,
      )
    ) {
      checkedCount += 1;
    }
  }
  if (checkedCount === 0) {
    return false;
  }
  if (checkedCount === leaves.length) {
    return true;
  }
  return "indeterminate";
};

export const setLeafPhaseValue = (
  leafZoneKey: string,
  laborPhaseId: string,
  checked: boolean,
  workRows: CascadeWorkRow[],
  cells: CascadeCell[],
  scopePhasesByLineLabor: Map<string, string[]>,
): CascadeCell[] => {
  const siteZoneId = leafZoneKey === GENERAL_ZONE_KEY ? null : leafZoneKey;
  const nextByKey = new Map(
    cells.map((c) => [
      `${c.scope_phase_id}:${c.site_zone_id ?? GENERAL_ZONE_KEY}`,
      { ...c },
    ]),
  );

  for (const row of workRows) {
    if (row.zone_key !== leafZoneKey) {
      continue;
    }
    if (!row.labor_phase_ids.includes(laborPhaseId)) {
      continue;
    }
    for (const scopePhaseId of scopePhasesByLineLabor.get(
      `${row.job_line_id}:${laborPhaseId}`,
    ) ?? []) {
      const key = `${scopePhaseId}:${leafZoneKey}`;
      nextByKey.set(key, {
        scope_phase_id: scopePhaseId,
        site_zone_id: siteZoneId,
        value: checked,
      });
    }
  }

  return [...nextByKey.values()];
};

export const setPhaseCheckedAcrossLeaves = (
  zoneId: string,
  laborPhaseId: string,
  checked: boolean,
  zoneTree: JobFieldProgressZoneNode[],
  workRows: CascadeWorkRow[],
  cells: CascadeCell[],
  scopePhasesByLineLabor: Map<string, string[]>,
): CascadeCell[] => {
  const leaves = leavesWithPhase(zoneId, laborPhaseId, zoneTree, workRows);
  let next = [...cells];
  for (const leaf of leaves) {
    next = setLeafPhaseValue(
      leaf,
      laborPhaseId,
      checked,
      workRows,
      next,
      scopePhasesByLineLabor,
    );
  }
  return next;
};

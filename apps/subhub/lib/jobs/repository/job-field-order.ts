/**
 * Field zone × phase Order — effective material phase + eligibility (task 62 / JML6–JML9).
 */

import { zoneKeyFor } from "./job-field-progress";

export type JobFieldOrderCell = {
  requested: boolean;
  scope_phase_id: string;
  /** null = General (unplaced). */
  site_zone_id: string | null;
  /**
   * Read-only: unlocked lines that would otherwise sit under this cell
   * (BOM + material phase match). Not persisted.
   */
  unlocked_excluded_count: number;
};

export type JobFieldOrderCellPatch = {
  requested: boolean;
  scope_phase_id: string;
  site_zone_id: string | null;
};

/** One geography slice for Order cascade (material phase only). */
export type JobFieldOrderRow = {
  job_line_id: string;
  labor_phase_id: string;
  material_locked: boolean;
  scope_phase_id: string;
  zone_key: string;
};

export type ScopePhaseForMaterial = {
  id: string;
  labor_phase_id: string | null;
  sequence: number;
};

/**
 * MP3: line override → item ancestry first non-null → earliest scope_phase by sequence.
 * Returns the matching `scope_phase.id` for this line (or null when none seeded).
 */
export const resolveLineMaterialScopePhaseId = (input: {
  /** Own item then ancestors (`parent_id` walk). */
  ancestryMaterialPhaseIds: Array<string | null | undefined>;
  lineMaterialPhaseId: string | null | undefined;
  scopePhases: ScopePhaseForMaterial[];
}): string | null => {
  const phases = input.scopePhases.filter(
    (p): p is ScopePhaseForMaterial & { labor_phase_id: string } =>
      Boolean(p.labor_phase_id),
  );
  if (phases.length === 0) {
    return null;
  }

  let laborPhaseId: string | null = input.lineMaterialPhaseId ?? null;
  if (!laborPhaseId) {
    for (const candidate of input.ancestryMaterialPhaseIds) {
      if (candidate) {
        laborPhaseId = candidate;
        break;
      }
    }
  }

  if (laborPhaseId) {
    const match = phases.find((p) => p.labor_phase_id === laborPhaseId);
    if (match) {
      return match.id;
    }
  }

  const sorted = [...phases].sort(
    (a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id),
  );
  return sorted[0]?.id ?? null;
};

export type OrderEligibilityLine = {
  allocations: Array<{ quantity: number; site_zone_id: string }>;
  ancestryMaterialPhaseIds: Array<string | null | undefined>;
  has_bom: boolean;
  id: string;
  lineMaterialPhaseId: string | null | undefined;
  material_locked: boolean;
  quantity: number;
  scopePhases: ScopePhaseForMaterial[];
};

/**
 * Build Order cascade rows: lines with BOM, sliced by allocation + General,
 * keyed to the line's effective material `scope_phase`.
 */
export const buildOrderRows = (
  lines: OrderEligibilityLine[],
): JobFieldOrderRow[] => {
  const rows: JobFieldOrderRow[] = [];

  for (const line of lines) {
    if (!line.has_bom) {
      continue;
    }
    const scopePhaseId = resolveLineMaterialScopePhaseId({
      lineMaterialPhaseId: line.lineMaterialPhaseId,
      ancestryMaterialPhaseIds: line.ancestryMaterialPhaseIds,
      scopePhases: line.scopePhases,
    });
    if (!scopePhaseId) {
      continue;
    }
    const scopePhase = line.scopePhases.find((p) => p.id === scopePhaseId);
    const laborPhaseId = scopePhase?.labor_phase_id;
    if (!laborPhaseId) {
      continue;
    }

    let placed = 0;
    for (const alloc of line.allocations) {
      const qty = Number(alloc.quantity);
      if (!(qty > 0)) {
        continue;
      }
      placed += qty;
      rows.push({
        job_line_id: line.id,
        zone_key: zoneKeyFor(alloc.site_zone_id),
        labor_phase_id: laborPhaseId,
        scope_phase_id: scopePhaseId,
        material_locked: line.material_locked,
      });
    }

    const generalQty = Number(line.quantity) - placed;
    if (generalQty > 0) {
      rows.push({
        job_line_id: line.id,
        zone_key: zoneKeyFor(null),
        labor_phase_id: laborPhaseId,
        scope_phase_id: scopePhaseId,
        material_locked: line.material_locked,
      });
    }
  }

  return rows;
};

/**
 * Per (scope_phase, zone) unlocked count for DTO cells.
 * Locked+BOM lines are pool-eligible (task 63); unlocked are excluded from effect.
 */
export const unlockedExcludedCountByCell = (
  orderRows: JobFieldOrderRow[],
): Map<string, number> => {
  const map = new Map<string, number>();
  const seen = new Map<string, Set<string>>();

  for (const row of orderRows) {
    if (row.material_locked) {
      continue;
    }
    const cellKey = `${row.scope_phase_id}:${row.zone_key}`;
    const lines = seen.get(cellKey) ?? new Set<string>();
    if (lines.has(row.job_line_id)) {
      continue;
    }
    lines.add(row.job_line_id);
    seen.set(cellKey, lines);
    map.set(cellKey, (map.get(cellKey) ?? 0) + 1);
  }

  return map;
};

/** Distinct unlocked lines under a zone×labor-phase cascade selection. */
export const countUnlockedExcludedForPhase = (
  orderRows: JobFieldOrderRow[],
  leafZoneKeys: string[],
  laborPhaseId: string,
): number => {
  const leaves = new Set(leafZoneKeys);
  const unlockedLines = new Set<string>();
  for (const row of orderRows) {
    if (!leaves.has(row.zone_key)) {
      continue;
    }
    if (row.labor_phase_id !== laborPhaseId) {
      continue;
    }
    if (row.material_locked) {
      continue;
    }
    unlockedLines.add(row.job_line_id);
  }
  return unlockedLines.size;
};

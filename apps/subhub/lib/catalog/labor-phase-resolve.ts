/**
 * Shared labor-phase ancestry merge (37ad).
 * Walk leaf → root; first row per `labor_phase_id` wins; keep walking to fill unclaimed phases.
 */

export type LaborPhaseOrigin = "own" | "inherited";

export type AncestryLaborNode<T extends { labor_phase_id: string }> = {
  itemId: string;
  itemName: string;
  rows: T[];
};

export type ResolvedLaborPhaseMergeRow<T extends { labor_phase_id: string }> = T & {
  origin: LaborPhaseOrigin;
  source_item_id: string | null;
  source_item_name: string | null;
};

/** Pure merge: ancestry row groups ordered leaf → root. First claim per phase id wins. */
export const mergeLaborPhaseRowsByPhaseId = <T extends { labor_phase_id: string }>(
  ancestryRowGroups: T[][],
): T[] => {
  const merged = new Map<string, T>();
  for (const rows of ancestryRowGroups) {
    for (const row of rows) {
      if (!merged.has(row.labor_phase_id)) {
        merged.set(row.labor_phase_id, row);
      }
    }
  }
  return Array.from(merged.values());
};

/**
 * Same merge as {@link mergeLaborPhaseRowsByPhaseId}, tagging each winning row with
 * origin + source (self = own / null source; ancestor = inherited + that node).
 */
export const mergeLaborPhasesAcrossAncestry = <T extends { labor_phase_id: string }>(
  ancestry: Array<AncestryLaborNode<T>>,
): ResolvedLaborPhaseMergeRow<T>[] => {
  const merged = new Map<string, ResolvedLaborPhaseMergeRow<T>>();

  ancestry.forEach((node, index) => {
    const isSelf = index === 0;
    for (const row of node.rows) {
      if (merged.has(row.labor_phase_id)) {
        continue;
      }
      merged.set(row.labor_phase_id, {
        ...row,
        origin: isSelf ? "own" : "inherited",
        source_item_id: isSelf ? null : node.itemId,
        source_item_name: isSelf ? null : node.itemName,
      });
    }
  });

  return Array.from(merged.values());
};

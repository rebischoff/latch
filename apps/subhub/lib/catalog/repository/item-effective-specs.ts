import type { Pool } from "pg";

export type EffectiveSpecDef = {
  decimal_places: number | null;
  display_name: string;
  spec_def_id: string;
  to_canonical_factor: number;
  unit_symbol: string | null;
  value_type: "boolean" | "enum" | "number";
};

const effectiveSpecDefSelect = `SELECT
       sd.id AS spec_def_id,
       sd.display_name,
       sd.value_type,
       sd.decimal_places,
       su.symbol AS unit_symbol,
       COALESCE(su.to_canonical_factor, 1) AS to_canonical_factor`;

const effectiveSpecDefFrom = `FROM spec_def sd
     LEFT JOIN spec_unit su ON su.id = sd.unit_id`;

export const scopePanelDefs = async (
  pool: Pool,
  rootItemId: string,
): Promise<EffectiveSpecDef[]> => {
  const result = await pool.query<EffectiveSpecDef>(
    `${effectiveSpecDefSelect}
     ${effectiveSpecDefFrom}
     WHERE sd.scope_root_item_id = $1
     ORDER BY sd.sort_order ASC, sd.display_name ASC, sd.id ASC`,
    [rootItemId],
  );

  return result.rows;
};

export const unionEffectiveForItems = async (
  pool: Pool,
  itemIds: string[],
): Promise<EffectiveSpecDef[]> => {
  if (itemIds.length === 0) {
    return [];
  }

  const result = await pool.query<EffectiveSpecDef>(
    `${effectiveSpecDefSelect}
     ${effectiveSpecDefFrom}
     INNER JOIN item_spec_participation p ON p.spec_def_id = sd.id
     WHERE p.item_id = ANY($1::text[])
     ORDER BY sd.sort_order ASC, sd.display_name ASC, sd.id ASC`,
    [itemIds],
  );

  return result.rows;
};

export const loadScopePanelDefIdSet = async (
  pool: Pool,
  rootItemId: string,
): Promise<Set<string>> => {
  const defs = await scopePanelDefs(pool, rootItemId);
  return new Set(defs.map((row) => row.spec_def_id));
};

import type { Pool } from "pg";

export type CatalogSystemSpecOptionRow = {
  display_name: string;
  id: string;
};

export type CatalogSystemSpecDefRow = {
  def_display_name: string;
  options: CatalogSystemSpecOptionRow[];
  system_id: string;
  system_spec_def_id: string;
  value_type: "enum" | "boolean" | "text";
};

type SpecDefQueryRow = {
  def_display_name: string;
  system_id: string;
  system_spec_def_id: string;
  value_type: "enum" | "boolean" | "text";
};

type SpecOptionQueryRow = {
  display_name: string;
  id: string;
  system_spec_def_id: string;
};

export const loadCatalogSystemSpecDefs = async (
  pool: Pool,
): Promise<CatalogSystemSpecDefRow[]> => {
  const defsResult = await pool.query<SpecDefQueryRow>(
    `SELECT
       sd.id AS system_spec_def_id,
       sd.system_id,
       sd.display_name AS def_display_name,
       sd.value_type
     FROM system_spec_def sd
     ORDER BY sd.system_id ASC, sd.sort_order ASC, sd.id ASC`,
  );

  if (defsResult.rows.length === 0) {
    return [];
  }

  const defIds = defsResult.rows.map((row) => row.system_spec_def_id);
  const optionsResult = await pool.query<SpecOptionQueryRow>(
    `SELECT
       id,
       system_spec_def_id,
       display_name
     FROM system_spec_option
     WHERE system_spec_def_id = ANY($1::uuid[])
     ORDER BY sort_order ASC, id ASC`,
    [defIds],
  );

  const optionsByDefId = new Map<string, CatalogSystemSpecOptionRow[]>();
  for (const option of optionsResult.rows) {
    const options = optionsByDefId.get(option.system_spec_def_id) ?? [];
    options.push({ id: option.id, display_name: option.display_name });
    optionsByDefId.set(option.system_spec_def_id, options);
  }

  return defsResult.rows.map((row) => ({
    system_spec_def_id: row.system_spec_def_id,
    system_id: row.system_id,
    def_display_name: row.def_display_name,
    value_type: row.value_type,
    options: optionsByDefId.get(row.system_spec_def_id) ?? [],
  }));
};

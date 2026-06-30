import type { Pool } from "pg";

import type {
  EstimateSystemRow,
  EstimateSystemSpecRow,
} from "../descriptors/estimate-detail";

type EstimateSystemBaseRow = {
  id: string;
  sort_order: number;
  system_id: string;
  system_name: string;
};

type EstimateSystemSpecQueryRow = {
  def_display_name: string;
  estimate_system_id: string;
  option_display_name: string | null;
  system_spec_def_id: string;
  system_spec_option_id: string | null;
  value_boolean: boolean | null;
  value_text: string | null;
  value_type: "enum" | "boolean" | "text";
};

type EstimateSystemSpecOptionQueryRow = {
  display_name: string;
  id: string;
  system_spec_def_id: string;
};

const mapSpecRow = (
  row: EstimateSystemSpecQueryRow,
  options: EstimateSystemSpecRow["options"],
): EstimateSystemSpecRow => ({
  system_spec_def_id: row.system_spec_def_id,
  def_display_name: row.def_display_name,
  value_type: row.value_type,
  system_spec_option_id: row.system_spec_option_id,
  option_display_name: row.option_display_name,
  value_text: row.value_text,
  value_boolean: row.value_boolean,
  options,
});

export const loadEstimateSystems = async (
  pool: Pool,
  estimateId: string,
): Promise<EstimateSystemRow[]> => {
  const systemsResult = await pool.query<EstimateSystemBaseRow>(
    `SELECT
       es.id,
       es.system_id,
       s.name AS system_name,
       es.sort_order
     FROM estimate_system es
     INNER JOIN system s ON s.id = es.system_id
     WHERE es.estimate_id = $1
     ORDER BY es.sort_order ASC, es.id ASC`,
    [estimateId],
  );

  if (systemsResult.rows.length === 0) {
    return [];
  }

  const specsResult = await pool.query<EstimateSystemSpecQueryRow>(
    `SELECT
       es.id AS estimate_system_id,
       sd.id AS system_spec_def_id,
       sd.display_name AS def_display_name,
       sd.value_type,
       ess.system_spec_option_id,
       sso.display_name AS option_display_name,
       ess.value_text,
       ess.value_boolean
     FROM estimate_system es
     INNER JOIN system_spec_def sd ON sd.system_id = es.system_id
     LEFT JOIN estimate_system_spec ess
       ON ess.estimate_system_id = es.id
      AND ess.system_spec_def_id = sd.id
     LEFT JOIN system_spec_option sso ON sso.id = ess.system_spec_option_id
     WHERE es.estimate_id = $1
     ORDER BY es.sort_order ASC, sd.sort_order ASC, sd.id ASC`,
    [estimateId],
  );

  const defIds = [...new Set(specsResult.rows.map((row) => row.system_spec_def_id))];
  const optionsByDefId = new Map<string, EstimateSystemSpecRow["options"]>();

  if (defIds.length > 0) {
    const optionsResult = await pool.query<EstimateSystemSpecOptionQueryRow>(
      `SELECT id, system_spec_def_id, display_name
       FROM system_spec_option
       WHERE system_spec_def_id = ANY($1::uuid[])
       ORDER BY sort_order ASC, id ASC`,
      [defIds],
    );

    for (const option of optionsResult.rows) {
      const options = optionsByDefId.get(option.system_spec_def_id) ?? [];
      options.push({ id: option.id, display_name: option.display_name });
      optionsByDefId.set(option.system_spec_def_id, options);
    }
  }

  const specsBySystemId = new Map<string, EstimateSystemSpecRow[]>();
  for (const row of specsResult.rows) {
    const specs = specsBySystemId.get(row.estimate_system_id) ?? [];
    specs.push(
      mapSpecRow(row, optionsByDefId.get(row.system_spec_def_id) ?? []),
    );
    specsBySystemId.set(row.estimate_system_id, specs);
  }

  return systemsResult.rows.map((system) => ({
    ...system,
    specs: specsBySystemId.get(system.id) ?? [],
  }));
};

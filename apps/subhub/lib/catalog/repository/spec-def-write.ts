import { ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";

import type { SpecDefinitionPatchRow } from "../descriptors/category-detail";

export const assertRootSpecDefinitionsPatch = (isRoot: boolean): void => {
  if (!isRoot) {
    throw new ValidationError("spec_definitions is root-only", {
      field: "spec_definitions",
      code: "root_only_field",
    });
  }
};

const assertSpecDefinitionShape = (rows: SpecDefinitionPatchRow[]): void => {
  for (const row of rows) {
    if (row.value_type === "enum" && row.options.length === 0) {
      throw new ValidationError("Enum spec definitions require options", {
        field: "spec_definitions",
        code: "enum_requires_options",
        display_name: row.display_name,
      });
    }

    if (row.value_type !== "enum" && row.options.length > 0) {
      throw new ValidationError("Only enum spec definitions may include options", {
        field: "spec_definitions",
        code: "options_not_allowed",
        display_name: row.display_name,
      });
    }
  }
};

export const replaceSpecDefinitionsTx = async (
  client: PoolClient,
  rootCategoryId: string,
  rows: SpecDefinitionPatchRow[],
): Promise<void> => {
  assertSpecDefinitionShape(rows);

  const existingResult = await client.query<{ id: string }>(
    `SELECT id FROM spec_def WHERE root_category_id = $1`,
    [rootCategoryId],
  );
  const existingIds = new Set(existingResult.rows.map((row) => row.id));

  const removedDefIds = [...existingIds].filter((id) => !rows.some((row) => row.id === id));
  if (removedDefIds.length > 0) {
    const referencedResult = await client.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM category_spec_def
       WHERE spec_def_id = ANY($1::uuid[])`,
      [removedDefIds],
    );
    if ((referencedResult.rows[0]?.count ?? 0) > 0) {
      throw new ValidationError("Cannot remove spec definitions still used by categories", {
        field: "spec_definitions",
        code: "spec_def_in_use",
      });
    }

    const partSpecResult = await client.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM manufacturer_part_spec
       WHERE spec_def_id = ANY($1::uuid[])`,
      [removedDefIds],
    );
    if ((partSpecResult.rows[0]?.count ?? 0) > 0) {
      throw new ValidationError("Cannot remove spec definitions referenced by parts", {
        field: "spec_definitions",
        code: "spec_def_in_use",
      });
    }
  }

  await client.query(`DELETE FROM spec_def WHERE root_category_id = $1`, [rootCategoryId]);

  for (const [index, row] of rows.entries()) {
    const defId = row.id ?? crypto.randomUUID();
    await client.query(
      `INSERT INTO spec_def (
         id, root_category_id, code, display_name, value_type, filter_mode, sort_order
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        defId,
        rootCategoryId,
        row.code ?? null,
        row.display_name,
        row.value_type,
        row.filter_mode ?? "required",
        row.sort_order ?? index + 1,
      ],
    );

    if (row.value_type === "enum") {
      for (const [optionIndex, option] of row.options.entries()) {
        const optionId = option.id ?? crypto.randomUUID();
        await client.query(
          `INSERT INTO spec_option (id, spec_def_id, code, display_name, sort_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            optionId,
            defId,
            option.code ?? null,
            option.display_name,
            option.sort_order ?? optionIndex + 1,
          ],
        );
      }
    }
  }
};

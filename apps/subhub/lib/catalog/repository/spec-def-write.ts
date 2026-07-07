import { ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";

import type { SpecDefinitionPatchRow } from "../descriptors/item-detail";

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

const assertSpecDefDeletable = async (
  client: PoolClient,
  specDefId: string,
): Promise<void> => {
  const partSpecResult = await client.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM manufacturer_part_spec
     WHERE spec_def_id = $1`,
    [specDefId],
  );
  if ((partSpecResult.rows[0]?.count ?? 0) > 0) {
    throw new ValidationError("Cannot remove spec definitions referenced by parts", {
      field: "spec_definitions",
      code: "spec_def_in_use",
      spec_def_id: specDefId,
    });
  }
};

export const assertSpecOptionDeletable = async (
  client: PoolClient,
  specOptionId: string,
): Promise<void> => {
  const partSpecResult = await client.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM manufacturer_part_spec
     WHERE spec_option_id = $1`,
    [specOptionId],
  );
  const partCount = partSpecResult.rows[0]?.count ?? 0;
  if (partCount > 0) {
    throw new ValidationError(
      `${partCount} part compatibility row(s) use this option — update those parts first`,
      {
        field: "spec_definitions",
        code: "spec_option_in_use",
        spec_option_id: specOptionId,
        part_count: partCount,
      },
    );
  }
};

const deleteSpecOptionsForDefTx = async (
  client: PoolClient,
  specDefId: string,
): Promise<void> => {
  const existingResult = await client.query<{ id: string }>(
    `SELECT id::text FROM spec_option WHERE spec_def_id = $1`,
    [specDefId],
  );
  for (const row of existingResult.rows) {
    await assertSpecOptionDeletable(client, row.id);
  }
  await client.query(`DELETE FROM spec_option WHERE spec_def_id = $1`, [specDefId]);
};

const upsertSpecOptionsTx = async (
  client: PoolClient,
  defId: string,
  options: SpecDefinitionPatchRow["options"],
): Promise<void> => {
  const existingResult = await client.query<{ id: string }>(
    `SELECT id::text FROM spec_option WHERE spec_def_id = $1`,
    [defId],
  );
  const existingIds = new Set(existingResult.rows.map((row) => row.id));
  const payloadIds = new Set(options.filter((option) => option.id).map((option) => option.id!));
  const removedIds = [...existingIds].filter((id) => !payloadIds.has(id));

  for (const optionId of removedIds) {
    await assertSpecOptionDeletable(client, optionId);
  }

  for (const [optionIndex, option] of options.entries()) {
    const optionId = option.id ?? crypto.randomUUID();
    await client.query(
      `INSERT INTO spec_option (id, spec_def_id, code, display_name, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         code = EXCLUDED.code,
         display_name = EXCLUDED.display_name,
         sort_order = EXCLUDED.sort_order`,
      [
        optionId,
        defId,
        option.code ?? null,
        option.display_name,
        option.sort_order ?? optionIndex + 1,
      ],
    );
  }

  for (const optionId of removedIds) {
    await client.query(`DELETE FROM spec_option WHERE id = $1`, [optionId]);
  }
};

const deleteSpecDefinitionTx = async (
  client: PoolClient,
  specDefId: string,
): Promise<void> => {
  await assertSpecDefDeletable(client, specDefId);
  await client.query(`DELETE FROM item_spec_exclude WHERE spec_def_id = $1`, [specDefId]);
  await client.query(`DELETE FROM spec_option WHERE spec_def_id = $1`, [specDefId]);
  await client.query(`DELETE FROM spec_def WHERE id = $1`, [specDefId]);
};

const upsertSpecDefinitionTx = async (
  client: PoolClient,
  ownerCategoryId: string,
  row: SpecDefinitionPatchRow,
  defId: string,
  sortOrder: number,
): Promise<void> => {
  await client.query(
    `INSERT INTO spec_def (
       id, item_id, code, display_name, value_type, filter_mode, sort_order
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       code = EXCLUDED.code,
       display_name = EXCLUDED.display_name,
       value_type = EXCLUDED.value_type,
       filter_mode = EXCLUDED.filter_mode,
       sort_order = EXCLUDED.sort_order`,
    [
      defId,
      ownerCategoryId,
      row.code ?? null,
      row.display_name,
      row.value_type,
      row.filter_mode ?? "required",
      row.sort_order ?? sortOrder,
    ],
  );

  if (row.value_type === "enum") {
    await upsertSpecOptionsTx(client, defId, row.options);
  } else {
    await deleteSpecOptionsForDefTx(client, defId);
  }
};

/**
 * Replace the spec definitions **owned by** `ownerCategoryId` from `rows`.
 * Owner is the `spec_def.item_id` column (037/038 owner model). Defs owned
 * elsewhere are untouched; this only manages the owner's own rows.
 */
export const replaceSpecDefinitionsTx = async (
  client: PoolClient,
  ownerCategoryId: string,
  rows: SpecDefinitionPatchRow[],
): Promise<string[]> => {
  assertSpecDefinitionShape(rows);

  const existingResult = await client.query<{ id: string }>(
    `SELECT id FROM spec_def WHERE item_id = $1`,
    [ownerCategoryId],
  );
  const existingIds = new Set(existingResult.rows.map((row) => row.id));
  const payloadIds = new Set(rows.filter((row) => row.id).map((row) => row.id!));

  const removedDefIds = [...existingIds].filter((id) => !payloadIds.has(id));
  for (const specDefId of removedDefIds) {
    await deleteSpecDefinitionTx(client, specDefId);
  }

  const newDefIds: string[] = [];
  for (const [index, row] of rows.entries()) {
    const defId = row.id ?? crypto.randomUUID();
    if (!row.id) {
      newDefIds.push(defId);
    }
    await upsertSpecDefinitionTx(client, ownerCategoryId, row, defId, index + 1);
  }

  return newDefIds;
};

export const applyCategorySpecDefinitionsTx = async (
  client: PoolClient,
  category: { id: string; is_root: boolean; root_item_id: string | null },
  rows: SpecDefinitionPatchRow[],
): Promise<void> => {
  assertSpecDefinitionShape(rows);

  const referencedIds = rows.filter((row) => row.id).map((row) => row.id!);
  if (referencedIds.length > 0) {
    const ownerResult = await client.query<{ item_id: string; id: string }>(
      `SELECT id, item_id FROM spec_def WHERE id = ANY($1::uuid[])`,
      [referencedIds],
    );
    for (const def of ownerResult.rows) {
      if (def.item_id !== category.id) {
        throw new ValidationError("Only the owning category may edit a spec definition", {
          field: "spec_definitions",
          code: "owner_only",
          spec_def_id: def.id,
          assign_item_id: def.item_id,
        });
      }
    }
  }

  await replaceSpecDefinitionsTx(client, category.id, rows);
};

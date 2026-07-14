import { ConflictError, ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";

import type { SpecDefinitionPatchRow } from "../descriptors/item-detail";
import {
  assertSpecDefTypeUnitMutable,
  assertSpecDefinitionShape,
  assertSpecOptionDeletable,
} from "./spec-detail-write";

export const assertScopeSpecDefinitionsPatch = (nodeType: string): void => {
  if (nodeType !== "scope") {
    throw new ValidationError("spec_definitions is scope-only", {
      field: "spec_definitions",
      code: "scope_only_field",
    });
  }
};

const loadSpecDefInUseCounts = async (
  client: PoolClient,
  specDefId: string,
): Promise<{ parts: number }> => {
  const partResult = await client.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM manufacturer_part_spec
     WHERE spec_def_id = $1`,
    [specDefId],
  );

  return {
    parts: partResult.rows[0]?.count ?? 0,
  };
};

const assertSpecDefDeletable = async (
  client: PoolClient,
  specDefId: string,
): Promise<void> => {
  const counts = await loadSpecDefInUseCounts(client, specDefId);
  if (counts.parts > 0) {
    throw new ConflictError("Cannot delete spec definition in use", {
      code: "in_use",
      in_use_part_count: counts.parts,
    });
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
      `INSERT INTO spec_option (id, spec_def_id, display_name, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         sort_order = EXCLUDED.sort_order`,
      [optionId, defId, option.display_name, option.sort_order ?? optionIndex + 1],
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
  await client.query(`DELETE FROM spec_option WHERE spec_def_id = $1`, [specDefId]);
  await client.query(`DELETE FROM spec_def WHERE id = $1`, [specDefId]);
};

const upsertSpecDefinitionTx = async (
  client: PoolClient,
  scopeRootId: string,
  row: SpecDefinitionPatchRow,
  defId: string,
  sortOrder: number,
): Promise<void> => {
  assertSpecDefinitionShape(row.value_type, row.options, row.unit_id);

  const existingResult = await client.query<{
    unit_id: string | null;
    value_type: string;
  }>(
    `SELECT value_type, unit_id FROM spec_def WHERE id = $1`,
    [defId],
  );
  const existing = existingResult.rows[0];
  if (existing) {
    await assertSpecDefTypeUnitMutable(
      client,
      defId,
      row.value_type,
      row.unit_id,
      existing,
    );
  }

  await client.query(
    `INSERT INTO spec_def (
       id, scope_root_item_id, display_name, value_type, unit_id, decimal_places, sort_order
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       value_type = EXCLUDED.value_type,
       unit_id = EXCLUDED.unit_id,
       decimal_places = EXCLUDED.decimal_places,
       sort_order = EXCLUDED.sort_order`,
    [
      defId,
      scopeRootId,
      row.display_name,
      row.value_type,
      row.unit_id ?? null,
      row.decimal_places ?? null,
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
 * Replace the spec definitions in a scope root's flat namespace from `rows`.
 */
export const replaceScopeSpecDefinitionsTx = async (
  client: PoolClient,
  scopeRootId: string,
  rows: SpecDefinitionPatchRow[],
): Promise<string[]> => {
  const existingResult = await client.query<{ id: string }>(
    `SELECT id FROM spec_def WHERE scope_root_item_id = $1`,
    [scopeRootId],
  );
  const existingIds = new Set(existingResult.rows.map((row) => row.id));
  const payloadIds = new Set(rows.filter((row) => row.id).map((row) => row.id!));

  const removedDefIds = [...existingIds].filter((id) => !payloadIds.has(id));
  for (const specDefId of removedDefIds) {
    await deleteSpecDefinitionTx(client, specDefId);
  }

  const referencedIds = rows.filter((row) => row.id).map((row) => row.id!);
  if (referencedIds.length > 0) {
    const ownerResult = await client.query<{ id: string; scope_root_item_id: string }>(
      `SELECT id, scope_root_item_id FROM spec_def WHERE id = ANY($1::uuid[])`,
      [referencedIds],
    );
    for (const def of ownerResult.rows) {
      if (def.scope_root_item_id !== scopeRootId) {
        throw new ValidationError("Spec definition does not belong to this scope", {
          field: "spec_definitions",
          code: "wrong_scope",
          spec_def_id: def.id,
        });
      }
    }
  }

  const newDefIds: string[] = [];
  for (const [index, row] of rows.entries()) {
    const defId = row.id ?? crypto.randomUUID();
    if (!row.id) {
      newDefIds.push(defId);
    }
    await upsertSpecDefinitionTx(client, scopeRootId, row, defId, index + 1);
  }

  return newDefIds;
};

export const applyScopeSpecDefinitionsTx = async (
  client: PoolClient,
  category: { id: string; node_type: string },
  rows: SpecDefinitionPatchRow[],
): Promise<void> => {
  assertScopeSpecDefinitionsPatch(category.node_type);
  await replaceScopeSpecDefinitionsTx(client, category.id, rows);
};

import { ConflictError, ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";

export type SpecDetailOptionPatchRow = {
  display_name: string;
  id?: string;
  sort_order?: number;
};

export type SpecValueType = "boolean" | "enum" | "number";

export type SpecDetailProfilePatchRow = {
  decimal_places?: number | null;
  display_name?: string;
  id?: string;
  scope_root_id?: string;
  sort_order?: number;
  unit_id?: string | null;
  value_type?: SpecValueType;
};

export const assertSpecDefinitionShape = (
  valueType: string,
  options: SpecDetailOptionPatchRow[],
  unitId: string | null | undefined,
): void => {
  if (valueType === "text") {
    throw new ValidationError("text value_type is no longer supported", {
      field: "profile",
      code: "invalid_value_type",
    });
  }

  if (valueType === "range") {
    throw new ValidationError("range value_type is no longer supported — use number", {
      field: "profile",
      code: "invalid_value_type",
    });
  }

  if (valueType === "enum" && options.length === 0) {
    throw new ValidationError("Enum spec definitions require options", {
      field: "options",
      code: "enum_requires_options",
    });
  }

  if (valueType !== "enum" && options.length > 0) {
    throw new ValidationError("Only enum spec definitions may include options", {
      field: "options",
      code: "options_not_allowed",
    });
  }

  if (valueType === "number" && !unitId) {
    throw new ValidationError("number spec definitions require unit_id", {
      field: "profile",
      code: "unit_required",
    });
  }

  if (
    (valueType === "enum" || valueType === "boolean") &&
    unitId !== undefined &&
    unitId !== null
  ) {
    throw new ValidationError("unit_id is only allowed for number spec definitions", {
      field: "profile",
      code: "unit_not_allowed",
    });
  }
};

export const assertScopeRootItem = async (
  client: PoolClient,
  scopeRootId: string,
): Promise<void> => {
  const result = await client.query<{ node_type: string }>(
    `SELECT node_type FROM item WHERE id = $1`,
    [scopeRootId],
  );
  if (result.rows[0]?.node_type !== "scope") {
    throw new ValidationError("scope_root_id must reference a scope root item", {
      field: "profile",
      code: "invalid_scope_root",
      scope_root_id: scopeRootId,
    });
  }
};

const countBucketOptionReferences = async (
  client: PoolClient,
  specOptionId: string,
): Promise<number> => {
  const result = await client.query<{ count: number }>(
    `SELECT (
       (SELECT COUNT(*)::int FROM estimate_scope_spec WHERE spec_option_id = $1)
       + (SELECT COUNT(*)::int FROM estimate_zone_spec WHERE spec_option_id = $1)
       + (SELECT COUNT(*)::int FROM estimate_line_spec WHERE spec_option_id = $1)
     ) AS count`,
    [specOptionId],
  );
  return result.rows[0]?.count ?? 0;
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
        field: "options",
        code: "spec_option_in_use",
        spec_option_id: specOptionId,
        part_count: partCount,
      },
    );
  }

  const bucketCount = await countBucketOptionReferences(client, specOptionId);
  if (bucketCount > 0) {
    throw new ValidationError(
      `${bucketCount} estimate bucket row(s) use this option — update those estimates first`,
      {
        field: "options",
        code: "spec_option_in_use",
        spec_option_id: specOptionId,
        bucket_count: bucketCount,
      },
    );
  }
};

export const loadSpecDefValueRowCount = async (
  client: PoolClient,
  specDefId: string,
): Promise<number> => {
  const result = await client.query<{ count: number }>(
    `SELECT (
       (SELECT COUNT(*)::int FROM manufacturer_part_spec WHERE spec_def_id = $1)
       + (SELECT COUNT(*)::int FROM estimate_scope_spec WHERE spec_def_id = $1)
       + (SELECT COUNT(*)::int FROM estimate_zone_spec WHERE spec_def_id = $1)
       + (SELECT COUNT(*)::int FROM estimate_line_spec WHERE spec_def_id = $1)
     ) AS count`,
    [specDefId],
  );
  return result.rows[0]?.count ?? 0;
};

export const assertSpecDefTypeUnitMutable = async (
  client: PoolClient,
  specDefId: string,
  nextValueType: string,
  nextUnitId: string | null | undefined,
  existing: { unit_id: string | null; value_type: string },
): Promise<void> => {
  const valueTypeChanged = nextValueType !== existing.value_type;
  const unitChanged =
    nextUnitId !== undefined && (nextUnitId ?? null) !== (existing.unit_id ?? null);
  if (!valueTypeChanged && !unitChanged) {
    return;
  }

  const valueRowCount = await loadSpecDefValueRowCount(client, specDefId);
  if (valueRowCount > 0) {
    throw new ValidationError(
      "Cannot change value_type or unit_id while part or estimate value rows exist",
      {
        field: "profile",
        code: "type_unit_locked",
        in_use_value_count: valueRowCount,
      },
    );
  }
};

const loadSpecDefInUseCounts = async (
  client: PoolClient,
  specDefId: string,
): Promise<{ participation: number; parts: number }> => {
  const [participationResult, partResult] = await Promise.all([
    client.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM item_spec_participation
       WHERE spec_def_id = $1`,
      [specDefId],
    ),
    client.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM manufacturer_part_spec
       WHERE spec_def_id = $1`,
      [specDefId],
    ),
  ]);

  return {
    participation: participationResult.rows[0]?.count ?? 0,
    parts: partResult.rows[0]?.count ?? 0,
  };
};

export const assertScopeRootReassignable = async (
  client: PoolClient,
  specDefId: string,
): Promise<void> => {
  const counts = await loadSpecDefInUseCounts(client, specDefId);
  if (counts.participation > 0 || counts.parts > 0) {
    throw new ValidationError("Cannot reassign scope while spec is in use", {
      field: "profile",
      code: "scope_reassign_blocked",
      in_use_participation_count: counts.participation,
      in_use_part_count: counts.parts,
    });
  }
};

const assertSpecDefDeletable = async (
  client: PoolClient,
  specDefId: string,
): Promise<void> => {
  const counts = await loadSpecDefInUseCounts(client, specDefId);
  if (counts.participation > 0 || counts.parts > 0) {
    throw new ConflictError("Cannot delete spec definition in use", {
      code: "in_use",
      in_use_participation_count: counts.participation,
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
  options: SpecDetailOptionPatchRow[],
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
      [
        optionId,
        defId,
        option.display_name,
        option.sort_order ?? optionIndex + 1,
      ],
    );
  }

  for (const optionId of removedIds) {
    await client.query(`DELETE FROM spec_option WHERE id = $1`, [optionId]);
  }
};

export const createSpecDetailTx = async (
  client: PoolClient,
  specDefId: string,
  profile: SpecDetailProfilePatchRow,
  options: SpecDetailOptionPatchRow[],
): Promise<void> => {
  const scopeRootId = profile.scope_root_id;
  if (!scopeRootId || !profile.display_name || !profile.value_type) {
    throw new ValidationError("scope_root_id, display_name, and value_type are required", {
      field: "profile",
      code: "required_fields",
    });
  }

  await assertScopeRootItem(client, scopeRootId);
  assertSpecDefinitionShape(profile.value_type, options, profile.unit_id);

  await client.query(
    `INSERT INTO spec_def (
       id, scope_root_item_id, display_name, value_type, unit_id, decimal_places, sort_order
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      specDefId,
      scopeRootId,
      profile.display_name,
      profile.value_type,
      profile.unit_id ?? null,
      profile.decimal_places ?? null,
      profile.sort_order ?? 0,
    ],
  );

  if (profile.value_type === "enum") {
    await upsertSpecOptionsTx(client, specDefId, options);
  }
};

export const patchSpecDetailTx = async (
  client: PoolClient,
  specDefId: string,
  profile: Partial<SpecDetailProfilePatchRow> | undefined,
  options: SpecDetailOptionPatchRow[] | undefined,
): Promise<void> => {
  const existingResult = await client.query<{
    scope_root_item_id: string;
    unit_id: string | null;
    value_type: string;
  }>(
    `SELECT scope_root_item_id, value_type, unit_id FROM spec_def WHERE id = $1`,
    [specDefId],
  );
  const existing = existingResult.rows[0];
  if (!existing) {
    throw new ValidationError("Spec definition not found", {
      field: "profile",
      code: "not_found",
    });
  }

  const nextValueType = profile?.value_type ?? existing.value_type;
  const nextUnitId =
    profile?.unit_id !== undefined ? profile.unit_id : existing.unit_id;

  if (profile?.scope_root_id !== undefined && profile.scope_root_id !== existing.scope_root_item_id) {
    await assertScopeRootReassignable(client, specDefId);
    await assertScopeRootItem(client, profile.scope_root_id);
  }

  if (
    profile?.value_type !== undefined ||
    profile?.unit_id !== undefined
  ) {
    await assertSpecDefTypeUnitMutable(
      client,
      specDefId,
      nextValueType,
      nextUnitId,
      existing,
    );
  }

  if (profile !== undefined) {
    await client.query(
      `UPDATE spec_def
       SET scope_root_item_id = COALESCE($2, scope_root_item_id),
           display_name = COALESCE($3, display_name),
           value_type = COALESCE($4, value_type),
           unit_id = CASE WHEN $6 THEN $5 ELSE unit_id END,
           decimal_places = COALESCE($7, decimal_places),
           sort_order = COALESCE($8, sort_order)
       WHERE id = $1`,
      [
        specDefId,
        profile.scope_root_id ?? null,
        profile.display_name ?? null,
        profile.value_type ?? null,
        profile.unit_id ?? null,
        profile.unit_id !== undefined,
        profile.decimal_places ?? null,
        profile.sort_order ?? null,
      ],
    );
  }

  if (options !== undefined) {
    assertSpecDefinitionShape(nextValueType, options, nextUnitId);
    if (nextValueType === "enum") {
      await upsertSpecOptionsTx(client, specDefId, options);
    } else {
      await deleteSpecOptionsForDefTx(client, specDefId);
    }
  }
};

export const deleteSpecDetailTx = async (
  client: PoolClient,
  specDefId: string,
): Promise<void> => {
  await assertSpecDefDeletable(client, specDefId);
  await client.query(`DELETE FROM spec_option WHERE spec_def_id = $1`, [specDefId]);
  await client.query(`DELETE FROM spec_def WHERE id = $1`, [specDefId]);
};

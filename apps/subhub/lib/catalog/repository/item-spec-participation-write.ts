import { ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";

import type { SpecParticipationPatchRow } from "../descriptors/item-detail";

export const assertSpecDefsBelongToRoot = async (
  client: PoolClient,
  rootItemId: string,
  specDefIds: string[],
): Promise<void> => {
  if (specDefIds.length === 0) {
    return;
  }

  const result = await client.query<{ id: string }>(
    `SELECT id
     FROM spec_def
     WHERE scope_root_item_id = $1
       AND id = ANY($2::uuid[])`,
    [rootItemId, specDefIds],
  );

  if (result.rows.length !== specDefIds.length) {
    throw new ValidationError("spec_def_id must belong to ancestor scope root namespace", {
      field: "spec_participation",
      code: "wrong_root_namespace",
      root_item_id: rootItemId,
    });
  }
};

export const applyCategorySpecParticipationTx = async (
  client: PoolClient,
  categoryId: string,
  rootItemId: string,
  rows: SpecParticipationPatchRow[],
): Promise<void> => {
  const nodeResult = await client.query<{ node_type: string }>(
    `SELECT node_type FROM item WHERE id = $1`,
    [categoryId],
  );
  const nodeType = nodeResult.rows[0]?.node_type;
  if (nodeType !== "item") {
    throw new ValidationError("spec_participation is leaf-item only", {
      field: "spec_participation",
      code: "leaf_only_field",
    });
  }

  const specDefIds = rows.map((row) => row.spec_def_id);
  await assertSpecDefsBelongToRoot(client, rootItemId, specDefIds);

  for (const row of rows) {
    const { spec_def_id: specDefId, active } = row;
    if (active) {
      await client.query(
        `INSERT INTO item_spec_participation (item_id, spec_def_id, sort_order)
         VALUES ($1, $2, 0)
         ON CONFLICT (item_id, spec_def_id) DO NOTHING`,
        [categoryId, specDefId],
      );
    } else {
      await client.query(
        `DELETE FROM item_spec_participation
         WHERE item_id = $1 AND spec_def_id = $2`,
        [categoryId, specDefId],
      );
    }
  }
};

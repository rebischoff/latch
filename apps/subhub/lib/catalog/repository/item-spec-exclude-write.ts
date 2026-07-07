import { ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";

import type { SpecParticipationPatchRow } from "../descriptors/item-detail";
import { assertSpecDefsBelongToRoot } from "./item-spec-participation-write";

export const assertNoReincludeBelowExclude = (
  rows: SpecParticipationPatchRow[],
  blockedSpecDefIds: Set<string>,
): void => {
  for (const row of rows) {
    if (row.active && blockedSpecDefIds.has(row.spec_def_id)) {
      throw new ValidationError("cannot re-include below ancestor exclude", {
        field: "spec_participation",
        code: "reinclude_below_exclude",
        spec_def_id: row.spec_def_id,
      });
    }
  }
};

/** @deprecated Branch exclude is applied via applyCategorySpecParticipationTx */
export const replaceCategorySpecExcludesTx = async (
  client: PoolClient,
  categoryId: string,
  rootItemId: string,
  rows: Array<{ spec_def_id: string }>,
): Promise<void> => {
  const specDefIds = rows.map((row) => row.spec_def_id);
  await assertSpecDefsBelongToRoot(client, rootItemId, specDefIds);

  await client.query(`DELETE FROM item_spec_exclude WHERE item_id = $1`, [
    categoryId,
  ]);

  for (const [index, row] of rows.entries()) {
    await client.query(
      `INSERT INTO item_spec_exclude (item_id, spec_def_id, sort_order)
       VALUES ($1, $2, $3)`,
      [categoryId, row.spec_def_id, index + 1],
    );
  }
};

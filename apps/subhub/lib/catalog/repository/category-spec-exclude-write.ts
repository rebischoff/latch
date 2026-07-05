import { ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";

import type { SpecParticipationPatchRow } from "../descriptors/category-detail";
import { assertSpecDefsBelongToRoot } from "./category-spec-participation-write";

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
  rootCategoryId: string,
  rows: Array<{ spec_def_id: string }>,
): Promise<void> => {
  const specDefIds = rows.map((row) => row.spec_def_id);
  await assertSpecDefsBelongToRoot(client, rootCategoryId, specDefIds);

  await client.query(`DELETE FROM category_spec_exclude WHERE category_id = $1`, [
    categoryId,
  ]);

  for (const [index, row] of rows.entries()) {
    await client.query(
      `INSERT INTO category_spec_exclude (category_id, spec_def_id, sort_order)
       VALUES ($1, $2, $3)`,
      [categoryId, row.spec_def_id, index + 1],
    );
  }
};

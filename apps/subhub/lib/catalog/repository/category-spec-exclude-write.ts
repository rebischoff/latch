import type { PoolClient } from "pg";

import type { SpecParticipationPatchRow } from "../descriptors/category-detail";
import { assertSpecDefsBelongToRoot } from "./category-spec-participation-write";

export const replaceCategorySpecExcludesTx = async (
  client: PoolClient,
  categoryId: string,
  rootCategoryId: string,
  rows: SpecParticipationPatchRow[],
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

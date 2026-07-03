import { ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";

import type { SpecParticipationPatchRow } from "../descriptors/category-detail";

export const assertRootSpecParticipationExcludes = (
  isRoot: boolean,
  excludes: SpecParticipationPatchRow[] | undefined,
): void => {
  if (isRoot && excludes !== undefined) {
    throw new ValidationError("excludes on root category are not allowed", {
      field: "spec_participation",
      code: "root_excludes_rejected",
    });
  }
};

export const assertIncludesExcludesNoOverlap = (
  includes: SpecParticipationPatchRow[],
  excludes: SpecParticipationPatchRow[],
): void => {
  const includeIds = new Set(includes.map((row) => row.spec_def_id));
  for (const row of excludes) {
    if (includeIds.has(row.spec_def_id)) {
      throw new ValidationError(
        "spec_def_id cannot appear in both includes and excludes",
        {
          field: "spec_participation",
          code: "include_exclude_overlap",
          spec_def_id: row.spec_def_id,
        },
      );
    }
  }
};

export const assertSpecDefsBelongToRoot = async (
  client: PoolClient,
  rootCategoryId: string,
  specDefIds: string[],
): Promise<void> => {
  if (specDefIds.length === 0) {
    return;
  }

  const result = await client.query<{ id: string }>(
    `SELECT id
     FROM spec_def
     WHERE root_category_id = $1 AND id = ANY($2::uuid[])`,
    [rootCategoryId, specDefIds],
  );

  if (result.rows.length !== specDefIds.length) {
    throw new ValidationError("spec_def_id must belong to ancestor root category", {
      field: "spec_participation",
      code: "wrong_root_namespace",
      root_category_id: rootCategoryId,
    });
  }
};

export const replaceCategorySpecIncludesTx = async (
  client: PoolClient,
  categoryId: string,
  rootCategoryId: string,
  rows: SpecParticipationPatchRow[],
): Promise<void> => {
  const specDefIds = rows.map((row) => row.spec_def_id);
  await assertSpecDefsBelongToRoot(client, rootCategoryId, specDefIds);

  await client.query(`DELETE FROM category_spec_def WHERE category_id = $1`, [
    categoryId,
  ]);

  for (const [index, row] of rows.entries()) {
    await client.query(
      `INSERT INTO category_spec_def (category_id, spec_def_id, sort_order)
       VALUES ($1, $2, $3)`,
      [categoryId, row.spec_def_id, index + 1],
    );
  }
};

/** @deprecated Use replaceCategorySpecIncludesTx */
export const replaceCategorySpecParticipationTx = replaceCategorySpecIncludesTx;

/** @deprecated Use assertRootSpecParticipationExcludes */
export const assertNestedSpecParticipationPatch = (isRoot: boolean): void => {
  if (isRoot) {
    throw new ValidationError("spec_participation is nested-only", {
      field: "spec_participation",
      code: "nested_only_field",
    });
  }
};

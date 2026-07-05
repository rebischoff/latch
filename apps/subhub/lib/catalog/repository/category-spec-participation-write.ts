import { ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";

import type { SpecParticipationPatchRow } from "../descriptors/category-detail";
import {
  isAncestorOrSelf,
  pathFromAncestorToNode,
} from "./category-effective-specs";
import type { CategoryFlatRow } from "./category-tree";

export const assertSpecDefsBelongToRoot = async (
  client: PoolClient,
  rootCategoryId: string,
  specDefIds: string[],
): Promise<void> => {
  if (specDefIds.length === 0) {
    return;
  }

  const result = await client.query<{ id: string }>(
    `WITH RECURSIVE subtree AS (
       SELECT id FROM category WHERE id = $1
       UNION ALL
       SELECT c.id FROM category c JOIN subtree s ON c.parent_id = s.id
     )
     SELECT id
     FROM spec_def
     WHERE category_id IN (SELECT id FROM subtree) AND id = ANY($2::uuid[])`,
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

const loadOwnerByDef = async (
  client: PoolClient,
  specDefIds: string[],
): Promise<Map<string, string>> => {
  if (specDefIds.length === 0) {
    return new Map();
  }

  const result = await client.query<{ category_id: string; spec_def_id: string }>(
    `SELECT id AS spec_def_id, category_id
     FROM spec_def
     WHERE id = ANY($1::uuid[])`,
    [specDefIds],
  );

  return new Map(result.rows.map((row) => [row.spec_def_id, row.category_id]));
};

/** True when a `category_spec_exclude` sits on the owner→node path **above** `nodeId`. */
const hasExcludeStrictlyAbove = (
  ownerCategoryId: string,
  nodeId: string,
  specDefId: string,
  excludesByCategory: Map<string, Set<string>>,
  categoriesById: Map<string, CategoryFlatRow>,
): boolean => {
  const path = pathFromAncestorToNode(ownerCategoryId, nodeId, categoriesById);
  for (const categoryId of path.slice(0, -1)) {
    if (excludesByCategory.get(categoryId)?.has(specDefId)) {
      return true;
    }
  }
  return false;
};

const loadExcludeIdsAtNode = async (
  client: PoolClient,
  categoryId: string,
): Promise<Set<string>> => {
  const result = await client.query<{ spec_def_id: string }>(
    `SELECT spec_def_id FROM category_spec_exclude WHERE category_id = $1`,
    [categoryId],
  );

  return new Set(result.rows.map((row) => row.spec_def_id));
};

const loadExcludesByCategory = async (client: PoolClient): Promise<Map<string, Set<string>>> => {
  const result = await client.query<{ category_id: string; spec_def_id: string }>(
    `SELECT category_id, spec_def_id FROM category_spec_exclude`,
  );

  const excludesByCategory = new Map<string, Set<string>>();
  for (const row of result.rows) {
    const bucket = excludesByCategory.get(row.category_id) ?? new Set<string>();
    bucket.add(row.spec_def_id);
    excludesByCategory.set(row.category_id, bucket);
  }

  return excludesByCategory;
};

export const applyCategorySpecParticipationTx = async (
  client: PoolClient,
  categoryId: string,
  rootCategoryId: string,
  rows: SpecParticipationPatchRow[],
  allCategories: CategoryFlatRow[],
): Promise<void> => {
  const specDefIds = rows.map((row) => row.spec_def_id);
  await assertSpecDefsBelongToRoot(client, rootCategoryId, specDefIds);

  const categoriesById = new Map(allCategories.map((row) => [row.id, row]));
  const ownerByDef = await loadOwnerByDef(client, specDefIds);
  const excludeHere = await loadExcludeIdsAtNode(client, categoryId);
  const excludesByCategory = await loadExcludesByCategory(client);

  for (const row of rows) {
    const { spec_def_id: specDefId, active } = row;
    // Owner lives on `spec_def.category_id`; participation only toggles excludes.
    const ownerCategoryId = ownerByDef.get(specDefId) ?? null;
    const isOwnerHere = ownerCategoryId === categoryId;
    const isInheritedHere =
      ownerCategoryId !== null &&
      !isOwnerHere &&
      isAncestorOrSelf(ownerCategoryId, categoryId, categoriesById);
    const hasExcludeHere = excludeHere.has(specDefId);

    if (active) {
      if (
        ownerCategoryId &&
        !isOwnerHere &&
        hasExcludeStrictlyAbove(
          ownerCategoryId,
          categoryId,
          specDefId,
          excludesByCategory,
          categoriesById,
        )
      ) {
        throw new ValidationError("cannot re-include below ancestor exclude", {
          field: "spec_participation",
          code: "reinclude_below_exclude",
          spec_def_id: specDefId,
        });
      }

      if (hasExcludeHere) {
        await client.query(
          `DELETE FROM category_spec_exclude WHERE category_id = $1 AND spec_def_id = $2`,
          [categoryId, specDefId],
        );
        excludeHere.delete(specDefId);
        excludesByCategory.get(categoryId)?.delete(specDefId);
      }
    } else if (isInheritedHere) {
      if (!hasExcludeHere) {
        await client.query(
          `INSERT INTO category_spec_exclude (category_id, spec_def_id, sort_order)
           VALUES ($1, $2, $3)`,
          [categoryId, specDefId, 1],
        );
        excludeHere.add(specDefId);
        const bucket = excludesByCategory.get(categoryId) ?? new Set<string>();
        bucket.add(specDefId);
        excludesByCategory.set(categoryId, bucket);
      }
    } else if (hasExcludeHere) {
      await client.query(
        `DELETE FROM category_spec_exclude WHERE category_id = $1 AND spec_def_id = $2`,
        [categoryId, specDefId],
      );
      excludeHere.delete(specDefId);
      excludesByCategory.get(categoryId)?.delete(specDefId);
    }
  }
};

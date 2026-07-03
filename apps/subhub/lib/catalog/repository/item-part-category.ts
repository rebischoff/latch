import type { Pool } from "pg";

import { tableExists } from "../../sites/repository/sql-utils";

export type ItemCategoryRow = {
  category_id: string;
  item_id: string;
  sort_order: number;
};

export type PartCategoryRow = {
  category_id: string;
  part_id: string;
  sort_order: number;
};

/** Read-only M:N stub — assignment UI deferred to item_detail / part_detail. */
export const loadItemCategories = async (
  pool: Pool,
  itemId: string,
): Promise<ItemCategoryRow[]> => {
  if (!(await tableExists(pool, "item_category"))) {
    return [];
  }

  const result = await pool.query<ItemCategoryRow>(
    `SELECT item_id, category_id, sort_order
     FROM item_category
     WHERE item_id = $1
     ORDER BY sort_order ASC, category_id ASC`,
    [itemId],
  );

  return result.rows;
};

/** Read-only M:N stub — assignment UI deferred to item_detail / part_detail. */
export const loadPartCategories = async (
  pool: Pool,
  partId: string,
): Promise<PartCategoryRow[]> => {
  if (!(await tableExists(pool, "part_category"))) {
    return [];
  }

  const result = await pool.query<PartCategoryRow>(
    `SELECT part_id, category_id, sort_order
     FROM part_category
     WHERE part_id = $1
     ORDER BY sort_order ASC, category_id ASC`,
    [partId],
  );

  return result.rows;
};

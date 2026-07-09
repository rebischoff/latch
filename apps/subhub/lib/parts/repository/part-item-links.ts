import { ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import {
  loadAllItems,
  resolveRootItemId,
  type ItemFlatRow,
} from "../../catalog/repository/item-tree";
import { tableExists } from "../../sites/repository/sql-utils";
import { prunePartSpecsToContextTx } from "./part-specs";

export type ItemLinkRow = {
  breadcrumb: string;
  item_id: string;
  name: string;
  sort_order: number;
};

export type ItemLinkPatchRow = {
  item_id: string;
  sort_order?: number;
};

const buildItemBreadcrumb = (
  itemId: string,
  itemsById: Map<string, ItemFlatRow>,
): string => {
  const parts: string[] = [];
  let current = itemsById.get(itemId);

  while (current) {
    parts.unshift(current.name);
    if (current.parent_id === null) {
      break;
    }
    current = itemsById.get(current.parent_id);
  }

  return parts.join(" / ");
};

const assertNoDuplicateItemLinks = (rows: ItemLinkPatchRow[]): void => {
  const seen = new Set<string>();

  for (const row of rows) {
    if (seen.has(row.item_id)) {
      throw new ValidationError("Duplicate item in item_links", {
        field: "item_links",
        code: "duplicate",
        item_id: row.item_id,
      });
    }
    seen.add(row.item_id);
  }
};

const assertItemsExistAndLeaf = async (
  client: PoolClient,
  rows: ItemLinkPatchRow[],
): Promise<void> => {
  if (rows.length === 0) {
    return;
  }

  const itemIds = rows.map((row) => row.item_id);
  const result = await client.query<{ id: string; node_type: string }>(
    `SELECT id, node_type FROM item WHERE id = ANY($1::text[])`,
    [itemIds],
  );

  const byId = new Map(result.rows.map((row) => [row.id, row]));
  for (const itemId of itemIds) {
    const item = byId.get(itemId);
    if (!item) {
      throw new ValidationError("Unknown item_id in item_links", {
        field: "item_links",
        code: "unknown_item",
        item_id: itemId,
      });
    }
    if (item.node_type !== "item") {
      throw new ValidationError("item_links may only reference leaf items", {
        field: "item_links",
        code: "not_leaf_item",
        item_id: itemId,
      });
    }
  }
};

export const loadItemLinks = async (
  pool: Pool | PoolClient,
  partId: string,
): Promise<ItemLinkRow[]> => {
  if (!(await tableExists(pool, "part_item"))) {
    return [];
  }

  const [linkResult, allItems] = await Promise.all([
    pool.query<{ item_id: string; sort_order: number }>(
      `SELECT item_id, sort_order
       FROM part_item
       WHERE part_id = $1
       ORDER BY sort_order ASC, item_id ASC`,
      [partId],
    ),
    loadAllItems(pool as Pool),
  ]);

  const itemsById = new Map(allItems.map((row) => [row.id, row]));

  return linkResult.rows.map((row) => {
    const item = itemsById.get(row.item_id);
    return {
      item_id: row.item_id,
      name: item?.name ?? row.item_id,
      breadcrumb: buildItemBreadcrumb(row.item_id, itemsById),
      sort_order: row.sort_order,
    };
  });
};

export const replaceItemLinksTx = async (
  client: PoolClient,
  partId: string,
  rows: ItemLinkPatchRow[],
): Promise<void> => {
  assertNoDuplicateItemLinks(rows);
  await assertItemsExistAndLeaf(client, rows);

  await client.query(`DELETE FROM part_item WHERE part_id = $1`, [partId]);

  await Promise.all(
    rows.map((row, index) => {
      const sortOrder = row.sort_order ?? index + 1;
      return client.query(
        `INSERT INTO part_item (part_id, item_id, sort_order)
         VALUES ($1, $2, $3)`,
        [partId, row.item_id, sortOrder],
      );
    }),
  );

  await prunePartSpecsToContextTx(client, partId);
};

export const replaceItemLinks = async (
  pool: Pool,
  actorId: string,
  partId: string,
  rows: ItemLinkPatchRow[],
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await replaceItemLinksTx(client, partId, rows);
  });
};

/** @deprecated Use loadItemLinks — kept for transitional imports. */
export const loadPartItems = loadItemLinks;

export const linkedItemScopeRootIds = (
  itemIds: string[],
  allItems: ItemFlatRow[],
): string[] => {
  const roots = new Set<string>();
  for (const itemId of itemIds) {
    const rootId = resolveRootItemId(allItems, itemId);
    if (rootId) {
      roots.add(rootId);
    }
  }
  return [...roots];
};

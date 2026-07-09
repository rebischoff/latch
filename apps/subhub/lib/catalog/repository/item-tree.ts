import type { Pool } from "pg";

export type ItemRootRow = {
  id: string;
  name: string;
  sort_order: number;
};

export type ItemFlatRow = {
  csi_code: string | null;
  freight_rate_type_id: string | null;
  id: string;
  incidental_rate_type_id: string | null;
  markup_type_id: string | null;
  name: string;
  node_type: "scope" | "category" | "item";
  parent_id: string | null;
  sort_order: number;
};

export type ItemTreeNode = {
  children: ItemTreeNode[];
  freight_rate_type_id: string | null;
  id: string;
  incidental_rate_type_id: string | null;
  is_root: boolean;
  markup_type_id: string | null;
  name: string;
  node_type: "scope" | "category" | "item";
  parent_id: string | null;
  sort_order: number;
};

/** Migration 039 backfill root — existing site scopes may reference it; not offered for new scopes. */
export const MIGRATION_GENERAL_SCOPE_ROOT_NAME = "General";

export const listRootItems = async (
  pool: Pool,
): Promise<ItemRootRow[]> => {
  const result = await pool.query<ItemRootRow>(
    `SELECT id, name, sort_order
     FROM item
     WHERE parent_id IS NULL
     ORDER BY sort_order ASC, name ASC, id ASC`,
  );

  return result.rows;
};

export const listSiteScopePickerRoots = async (
  pool: Pool,
): Promise<ItemRootRow[]> => {
  const result = await pool.query<ItemRootRow>(
    `SELECT id, name, sort_order
     FROM item
     WHERE parent_id IS NULL
       AND name <> $1
     ORDER BY sort_order ASC, name ASC, id ASC`,
    [MIGRATION_GENERAL_SCOPE_ROOT_NAME],
  );

  return result.rows;
};

export const loadAllItems = async (
  pool: Pool,
): Promise<ItemFlatRow[]> => {
  const result = await pool.query<ItemFlatRow>(
    `SELECT id, name, parent_id, node_type, sort_order, csi_code,
            freight_rate_type_id, incidental_rate_type_id, markup_type_id
     FROM item
     ORDER BY sort_order ASC, name ASC, id ASC`,
  );

  return result.rows;
};

export const nestItemTree = (
  rows: ItemFlatRow[],
  parentId: string | null,
): ItemTreeNode[] => {
  const children = rows
    .filter((row) => (row.parent_id ?? null) === parentId)
    .sort(
      (left, right) =>
        left.sort_order - right.sort_order ||
        left.name.localeCompare(right.name) ||
        left.id.localeCompare(right.id),
    );

  return children.map((row) => ({
    id: row.id,
    name: row.name,
    parent_id: row.parent_id,
    node_type: row.node_type,
    sort_order: row.sort_order,
    is_root: row.parent_id === null,
    freight_rate_type_id: row.freight_rate_type_id,
    incidental_rate_type_id: row.incidental_rate_type_id,
    markup_type_id: row.markup_type_id,
    children: nestItemTree(rows, row.id),
  }));
};

export const listItemTree = async (
  pool: Pool,
): Promise<ItemTreeNode[]> => {
  const rows = await loadAllItems(pool);
  return nestItemTree(rows, null);
};

export const resolveRootItemId = (
  rows: ItemFlatRow[],
  categoryId: string,
): string | undefined => {
  const byId = new Map(rows.map((row) => [row.id, row]));
  let current = byId.get(categoryId);

  while (current) {
    if (current.parent_id === null) {
      return current.id;
    }
    current = byId.get(current.parent_id);
  }

  return undefined;
};

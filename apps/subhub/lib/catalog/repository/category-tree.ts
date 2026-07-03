import type { Pool } from "pg";

export type CategoryRootRow = {
  id: string;
  name: string;
  sort_order: number;
};

export type CategoryFlatRow = {
  csi_code: string | null;
  default_phase_template_id: string | null;
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
};

export type CategoryTreeNode = {
  children: CategoryTreeNode[];
  id: string;
  is_root: boolean;
  name: string;
  parent_id: string | null;
  sort_order: number;
};

export const listRootCategories = async (
  pool: Pool,
): Promise<CategoryRootRow[]> => {
  const result = await pool.query<CategoryRootRow>(
    `SELECT id, name, sort_order
     FROM category
     WHERE parent_id IS NULL
     ORDER BY sort_order ASC, name ASC, id ASC`,
  );

  return result.rows;
};

export const loadAllCategories = async (
  pool: Pool,
): Promise<CategoryFlatRow[]> => {
  const result = await pool.query<CategoryFlatRow>(
    `SELECT id, name, parent_id, sort_order, csi_code, default_phase_template_id
     FROM category
     ORDER BY sort_order ASC, name ASC, id ASC`,
  );

  return result.rows;
};

export const nestCategoryTree = (
  rows: CategoryFlatRow[],
  parentId: string | null,
): CategoryTreeNode[] => {
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
    sort_order: row.sort_order,
    is_root: row.parent_id === null,
    children: nestCategoryTree(rows, row.id),
  }));
};

export const listCategoryTree = async (
  pool: Pool,
): Promise<CategoryTreeNode[]> => {
  const rows = await loadAllCategories(pool);
  return nestCategoryTree(rows, null);
};

export const resolveRootCategoryId = (
  rows: CategoryFlatRow[],
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

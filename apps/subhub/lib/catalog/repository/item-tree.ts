import type { Pool } from "pg";

import { loadAllCategories } from "./category-tree";

export type ItemTreeNode = {
  children?: ItemTreeNode[];
  id: string;
  label: string;
  selectable: boolean;
  type: "category" | "item";
  value: string;
};

type ItemRow = {
  id: string;
  name: string;
};

const collectSubtreeIds = (
  rootCategoryId: string,
  categoriesById: Map<string, { id: string; parent_id: string | null }>,
): Set<string> => {
  const ids = new Set<string>();
  const walk = (categoryId: string): void => {
    ids.add(categoryId);
    for (const [id, row] of categoriesById) {
      if (row.parent_id === categoryId) {
        walk(id);
      }
    }
  };
  walk(rootCategoryId);
  return ids;
};

export const loadItemTreeForRoot = async (
  pool: Pool,
  rootCategoryId: string,
  searchQuery?: string,
): Promise<ItemTreeNode[]> => {
  const allCategories = await loadAllCategories(pool);
  const categoriesById = new Map(allCategories.map((row) => [row.id, row]));
  const subtreeIds = collectSubtreeIds(rootCategoryId, categoriesById);

  if (!subtreeIds.has(rootCategoryId)) {
    return [];
  }

  const categoryIds = [...subtreeIds];

  const [itemsResult, itemCategoryResult, legacyItemsResult] = await Promise.all([
    pool.query<ItemRow>(`SELECT id, name FROM item ORDER BY name ASC, id ASC`),
    pool.query<{ item_id: string; category_id: string }>(
      `SELECT item_id, category_id
       FROM item_category
       WHERE category_id = ANY($1::text[])`,
      [categoryIds],
    ),
    pool.query<ItemRow>(
      `SELECT id, name FROM item
       WHERE category_id = ANY($1::text[])`,
      [categoryIds],
    ),
  ]);

  const itemsById = new Map(itemsResult.rows.map((row) => [row.id, row]));
  const itemsByCategory = new Map<string, ItemRow[]>();

  const linkItem = (categoryId: string, itemId: string): void => {
    const item = itemsById.get(itemId);
    if (!item) {
      return;
    }
    const bucket = itemsByCategory.get(categoryId) ?? [];
    if (!bucket.some((row) => row.id === itemId)) {
      bucket.push(item);
      itemsByCategory.set(categoryId, bucket);
    }
  };

  for (const link of itemCategoryResult.rows) {
    linkItem(link.category_id, link.item_id);
  }

  for (const item of legacyItemsResult.rows) {
    const categoryId = (
      await pool.query<{ category_id: string | null }>(
        `SELECT category_id FROM item WHERE id = $1`,
        [item.id],
      )
    ).rows[0]?.category_id;
    if (categoryId && subtreeIds.has(categoryId)) {
      linkItem(categoryId, item.id);
    }
  }

  const normalizedSearch = searchQuery?.trim().toLowerCase() ?? "";

  const buildFromCategory = (categoryId: string): ItemTreeNode | null => {
    const category = categoriesById.get(categoryId);
    if (!category) {
      return null;
    }

    const childCategories = allCategories
      .filter((row) => row.parent_id === categoryId && subtreeIds.has(row.id))
      .sort((left, right) => left.sort_order - right.sort_order || left.id.localeCompare(right.id));

    const items = (itemsByCategory.get(categoryId) ?? [])
      .filter((item) =>
        normalizedSearch === "" ? true : item.name.toLowerCase().includes(normalizedSearch),
      )
      .map((item) => ({
        id: `item:${item.id}`,
        value: item.id,
        label: item.name,
        type: "item" as const,
        selectable: true,
      }));

    const childNodes = childCategories
      .map((child) => buildFromCategory(child.id))
      .filter((node): node is ItemTreeNode => node !== null);

    const children = [...childNodes, ...items];
    if (children.length === 0 && normalizedSearch !== "") {
      return category.name.toLowerCase().includes(normalizedSearch)
        ? {
            id: `category:${categoryId}`,
            value: categoryId,
            label: category.name,
            type: "category",
            selectable: false,
            children: [],
          }
        : null;
    }

    return {
      id: `category:${categoryId}`,
      value: categoryId,
      label: category.name,
      type: "category",
      selectable: false,
      ...(children.length > 0 ? { children } : {}),
    };
  };

  const root = buildFromCategory(rootCategoryId);
  return root?.children ?? [];
};

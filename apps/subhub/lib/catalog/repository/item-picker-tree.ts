import type { Pool } from "pg";

import { loadAllItems } from "./item-tree";

export type ItemPickerTreeNode = {
  children?: ItemPickerTreeNode[];
  id: string;
  label: string;
  selectable: boolean;
  type: "node";
  value: string;
};

const collectSubtreeIds = (
  rootItemId: string,
  itemsById: Map<string, { id: string; parent_id: string | null }>,
): Set<string> => {
  const ids = new Set<string>();
  const walk = (itemId: string): void => {
    ids.add(itemId);
    for (const [id, row] of itemsById) {
      if (row.parent_id === itemId) {
        walk(id);
      }
    }
  };
  walk(rootItemId);
  return ids;
};

export const loadItemTreeForRoot = async (
  pool: Pool,
  rootItemId: string,
  searchQuery?: string,
): Promise<ItemPickerTreeNode[]> => {
  const allItems = await loadAllItems(pool);
  const itemsById = new Map(allItems.map((row) => [row.id, row]));
  const subtreeIds = collectSubtreeIds(rootItemId, itemsById);

  if (!subtreeIds.has(rootItemId)) {
    return [];
  }

  const normalizedSearch = searchQuery?.trim().toLowerCase() ?? "";

  const buildFromItem = (itemId: string): ItemPickerTreeNode | null => {
    const item = itemsById.get(itemId);
    if (!item || !subtreeIds.has(itemId)) {
      return null;
    }

    const childNodes = allItems
      .filter((row) => row.parent_id === itemId && subtreeIds.has(row.id))
      .sort(
        (left, right) =>
          left.sort_order - right.sort_order ||
          left.name.localeCompare(right.name) ||
          left.id.localeCompare(right.id),
      )
      .map((child) => buildFromItem(child.id))
      .filter((node): node is ItemPickerTreeNode => node !== null);

    const selfMatches =
      normalizedSearch === "" || item.name.toLowerCase().includes(normalizedSearch);

    if (!selfMatches && childNodes.length === 0) {
      return null;
    }

    return {
      id: `item:${itemId}`,
      value: itemId,
      label: item.name,
      type: "node",
      selectable: item.node_type === "item",
      ...(childNodes.length > 0 ? { children: childNodes } : {}),
    };
  };

  return allItems
    .filter((row) => row.parent_id === rootItemId && subtreeIds.has(row.id))
    .sort(
      (left, right) =>
        left.sort_order - right.sort_order ||
        left.name.localeCompare(right.name) ||
        left.id.localeCompare(right.id),
    )
    .map((row) => buildFromItem(row.id))
    .filter((node): node is ItemPickerTreeNode => node !== null);
};

export const subtreeItemIds = async (
  pool: Pool,
  anchorItemId: string,
): Promise<string[]> => {
  const allItems = await loadAllItems(pool);
  const itemsById = new Map(allItems.map((row) => [row.id, row]));
  return [...collectSubtreeIds(anchorItemId, itemsById)];
};

export const loadOrgItemTree = async (
  pool: Pool,
  searchQuery?: string,
): Promise<ItemPickerTreeNode[]> => {
  const allItems = await loadAllItems(pool);
  const itemsById = new Map(allItems.map((row) => [row.id, row]));
  const normalizedSearch = searchQuery?.trim().toLowerCase() ?? "";

  const buildFromItem = (itemId: string): ItemPickerTreeNode | null => {
    const item = itemsById.get(itemId);
    if (!item) {
      return null;
    }

    const childNodes = allItems
      .filter((row) => row.parent_id === itemId)
      .sort(
        (left, right) =>
          left.sort_order - right.sort_order ||
          left.name.localeCompare(right.name) ||
          left.id.localeCompare(right.id),
      )
      .map((child) => buildFromItem(child.id))
      .filter((node): node is ItemPickerTreeNode => node !== null);

    const selfMatches =
      normalizedSearch === "" || item.name.toLowerCase().includes(normalizedSearch);

    if (!selfMatches && childNodes.length === 0) {
      return null;
    }

    return {
      id: `item:${itemId}`,
      value: itemId,
      label: item.name,
      type: "node",
      selectable: item.node_type === "item",
      ...(childNodes.length > 0 ? { children: childNodes } : {}),
    };
  };

  return allItems
    .filter((row) => row.parent_id === null)
    .sort(
      (left, right) =>
        left.sort_order - right.sort_order ||
        left.name.localeCompare(right.name) ||
        left.id.localeCompare(right.id),
    )
    .map((row) => buildFromItem(row.id))
    .filter((node): node is ItemPickerTreeNode => node !== null);
};

import type { Pool } from "pg";

import {
  loadAllItems,
  nestItemTree,
  type ItemFlatRow,
  type ItemTreeNode,
} from "./item-tree";

export type EffectiveSpecDef = {
  display_name: string;
  spec_def_id: string;
  value_type: "boolean" | "enum" | "text";
};

type ParticipationMaps = {
  assignByDef: Map<string, string>;
  excludesByItem: Map<string, Set<string>>;
};

export const isAncestorOrSelf = (
  ancestorId: string,
  nodeId: string,
  categoriesById: Map<string, ItemFlatRow>,
): boolean => {
  let current = categoriesById.get(nodeId);
  while (current) {
    if (current.id === ancestorId) {
      return true;
    }
    if (current.parent_id === null) {
      return false;
    }
    current = categoriesById.get(current.parent_id);
  }
  return false;
};

export const pathFromAncestorToNode = (
  ancestorId: string,
  nodeId: string,
  categoriesById: Map<string, ItemFlatRow>,
): string[] => {
  const path: string[] = [];
  let current = categoriesById.get(nodeId);
  while (current) {
    path.unshift(current.id);
    if (current.id === ancestorId) {
      return path;
    }
    if (current.parent_id === null) {
      return [];
    }
    current = categoriesById.get(current.parent_id);
  }
  return [];
};

export const hasExcludeOnAssignPath = (
  assignItemId: string,
  nodeId: string,
  specDefId: string,
  excludesByItem: Map<string, Set<string>>,
  categoriesById: Map<string, ItemFlatRow>,
): boolean => {
  const path = pathFromAncestorToNode(assignItemId, nodeId, categoriesById);
  for (const categoryId of path) {
    const excludes = excludesByItem.get(categoryId);
    if (excludes?.has(specDefId)) {
      return true;
    }
  }
  return false;
};

export const isEffectiveSpecDef = (
  categoryId: string,
  specDefId: string,
  assignItemId: string | undefined,
  participation: ParticipationMaps,
  categoriesById: Map<string, ItemFlatRow>,
): boolean => {
  if (!assignItemId) {
    return false;
  }
  if (
    !isAncestorOrSelf(assignItemId, categoryId, categoriesById) &&
    assignItemId !== categoryId
  ) {
    return false;
  }
  return !hasExcludeOnAssignPath(
    assignItemId,
    categoryId,
    specDefId,
    participation.excludesByItem,
    categoriesById,
  );
};

const loadParticipationMaps = async (pool: Pool): Promise<ParticipationMaps> => {
  const [assignResult, excludesResult] = await Promise.all([
    pool.query<{ item_id: string; spec_def_id: string }>(
      `SELECT id AS spec_def_id, item_id FROM spec_def`,
    ),
    pool.query<{ item_id: string; spec_def_id: string }>(
      `SELECT item_id, spec_def_id FROM item_spec_exclude`,
    ),
  ]);

  const assignByDef = new Map<string, string>();
  for (const row of assignResult.rows) {
    assignByDef.set(row.spec_def_id, row.item_id);
  }

  const excludesByItem = new Map<string, Set<string>>();
  for (const row of excludesResult.rows) {
    const bucket = excludesByItem.get(row.item_id) ?? new Set<string>();
    bucket.add(row.spec_def_id);
    excludesByItem.set(row.item_id, bucket);
  }

  return { assignByDef, excludesByItem };
};

export const computeEffectiveSpecDefIds = (
  categoryId: string,
  categoriesById: Map<string, ItemFlatRow>,
  participation: ParticipationMaps,
  cache: Map<string, Set<string>> = new Map(),
): Set<string> => {
  const cached = cache.get(categoryId);
  if (cached) {
    return cached;
  }

  const effective = new Set<string>();
  for (const [specDefId, assignItemId] of participation.assignByDef) {
    if (
      isEffectiveSpecDef(
        categoryId,
        specDefId,
        assignItemId,
        participation,
        categoriesById,
      )
    ) {
      effective.add(specDefId);
    }
  }

  cache.set(categoryId, effective);
  return effective;
};

const collectSubtreeItemIds = (
  nodes: ItemTreeNode[],
  rootItemId: string,
): string[] => {
  const ids: string[] = [];

  const walk = (node: ItemTreeNode): void => {
    ids.push(node.id);
    for (const child of node.children) {
      walk(child);
    }
  };

  const rootNode = nodes.find((node) => node.id === rootItemId);
  if (rootNode) {
    walk(rootNode);
  }

  return ids;
};

const loadSpecDefLabels = async (
  pool: Pool,
  specDefIds: string[],
): Promise<Map<string, Omit<EffectiveSpecDef, "spec_def_id"> & { spec_def_id: string }>> => {
  if (specDefIds.length === 0) {
    return new Map();
  }

  const result = await pool.query<EffectiveSpecDef>(
    `SELECT id AS spec_def_id, display_name, value_type
     FROM spec_def
     WHERE id = ANY($1::uuid[])
     ORDER BY sort_order ASC, display_name ASC, id ASC`,
    [specDefIds],
  );

  return new Map(result.rows.map((row) => [row.spec_def_id, row]));
};

const toEffectiveSpecDefs = (
  specDefIds: Set<string>,
  labels: Map<string, EffectiveSpecDef>,
): EffectiveSpecDef[] =>
  [...specDefIds]
    .map((specDefId) => labels.get(specDefId))
    .filter((row): row is EffectiveSpecDef => row !== undefined);

export const effectiveParticipation = async (
  pool: Pool,
  categoryId: string,
): Promise<EffectiveSpecDef[]> => {
  const [allCategories, participation] = await Promise.all([
    loadAllItems(pool),
    loadParticipationMaps(pool),
  ]);
  const categoriesById = new Map(allCategories.map((row) => [row.id, row]));
  const effectiveIds = computeEffectiveSpecDefIds(categoryId, categoriesById, participation);
  const labels = await loadSpecDefLabels(pool, [...effectiveIds]);
  return toEffectiveSpecDefs(effectiveIds, labels);
};

export const scopePanelDefs = async (
  pool: Pool,
  rootItemId: string,
): Promise<EffectiveSpecDef[]> => {
  const [allCategories, participation] = await Promise.all([
    loadAllItems(pool),
    loadParticipationMaps(pool),
  ]);
  const categoriesById = new Map(allCategories.map((row) => [row.id, row]));
  const tree = nestItemTree(allCategories, null);
  const subtreeIds = collectSubtreeItemIds(tree, rootItemId);

  const unionIds = new Set<string>();
  const cache = new Map<string, Set<string>>();
  for (const categoryId of subtreeIds) {
    for (const specDefId of computeEffectiveSpecDefIds(
      categoryId,
      categoriesById,
      participation,
      cache,
    )) {
      unionIds.add(specDefId);
    }
  }

  const labels = await loadSpecDefLabels(pool, [...unionIds]);
  return toEffectiveSpecDefs(unionIds, labels);
};

export const unionEffectiveForItems = async (
  pool: Pool,
  categoryIds: string[],
): Promise<EffectiveSpecDef[]> => {
  if (categoryIds.length === 0) {
    return [];
  }

  const [allCategories, participation] = await Promise.all([
    loadAllItems(pool),
    loadParticipationMaps(pool),
  ]);
  const categoriesById = new Map(allCategories.map((row) => [row.id, row]));

  const unionIds = new Set<string>();
  const cache = new Map<string, Set<string>>();
  for (const categoryId of categoryIds) {
    for (const specDefId of computeEffectiveSpecDefIds(
      categoryId,
      categoriesById,
      participation,
      cache,
    )) {
      unionIds.add(specDefId);
    }
  }

  const labels = await loadSpecDefLabels(pool, [...unionIds]);
  return toEffectiveSpecDefs(unionIds, labels);
};

export const loadScopePanelDefIdSet = async (
  pool: Pool,
  rootItemId: string,
): Promise<Set<string>> => {
  const defs = await scopePanelDefs(pool, rootItemId);
  return new Set(defs.map((row) => row.spec_def_id));
};

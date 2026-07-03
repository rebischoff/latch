import type { Pool } from "pg";

import {
  loadAllCategories,
  nestCategoryTree,
  type CategoryFlatRow,
  type CategoryTreeNode,
} from "./category-tree";

export type EffectiveSpecDef = {
  display_name: string;
  spec_def_id: string;
  value_type: "boolean" | "enum" | "text";
};

type ParticipationMaps = {
  excludesByCategory: Map<string, Set<string>>;
  includesByCategory: Map<string, Set<string>>;
};

const loadParticipationMaps = async (pool: Pool): Promise<ParticipationMaps> => {
  const [includesResult, excludesResult] = await Promise.all([
    pool.query<{ category_id: string; spec_def_id: string }>(
      `SELECT category_id, spec_def_id FROM category_spec_def`,
    ),
    pool.query<{ category_id: string; spec_def_id: string }>(
      `SELECT category_id, spec_def_id FROM category_spec_exclude`,
    ),
  ]);

  const includesByCategory = new Map<string, Set<string>>();
  for (const row of includesResult.rows) {
    const bucket = includesByCategory.get(row.category_id) ?? new Set<string>();
    bucket.add(row.spec_def_id);
    includesByCategory.set(row.category_id, bucket);
  }

  const excludesByCategory = new Map<string, Set<string>>();
  for (const row of excludesResult.rows) {
    const bucket = excludesByCategory.get(row.category_id) ?? new Set<string>();
    bucket.add(row.spec_def_id);
    excludesByCategory.set(row.category_id, bucket);
  }

  return { includesByCategory, excludesByCategory };
};

export const computeEffectiveSpecDefIds = (
  categoryId: string,
  categoriesById: Map<string, CategoryFlatRow>,
  participation: ParticipationMaps,
  cache: Map<string, Set<string>> = new Map(),
): Set<string> => {
  const cached = cache.get(categoryId);
  if (cached) {
    return cached;
  }

  const category = categoriesById.get(categoryId);
  if (!category) {
    return new Set();
  }

  let effective: Set<string>;
  if (category.parent_id === null) {
    effective = new Set(participation.includesByCategory.get(categoryId) ?? []);
  } else {
    const inherited = computeEffectiveSpecDefIds(
      category.parent_id,
      categoriesById,
      participation,
      cache,
    );
    const includes = participation.includesByCategory.get(categoryId) ?? new Set<string>();
    const excludes = participation.excludesByCategory.get(categoryId) ?? new Set<string>();
    effective = new Set<string>();
    for (const specDefId of inherited) {
      if (!excludes.has(specDefId)) {
        effective.add(specDefId);
      }
    }
    for (const specDefId of includes) {
      if (!excludes.has(specDefId)) {
        effective.add(specDefId);
      }
    }
  }

  cache.set(categoryId, effective);
  return effective;
};

const collectSubtreeCategoryIds = (
  nodes: CategoryTreeNode[],
  rootCategoryId: string,
): string[] => {
  const ids: string[] = [];

  const walk = (node: CategoryTreeNode): void => {
    ids.push(node.id);
    for (const child of node.children) {
      walk(child);
    }
  };

  const rootNode = nodes.find((node) => node.id === rootCategoryId);
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
    loadAllCategories(pool),
    loadParticipationMaps(pool),
  ]);
  const categoriesById = new Map(allCategories.map((row) => [row.id, row]));
  const effectiveIds = computeEffectiveSpecDefIds(categoryId, categoriesById, participation);
  const labels = await loadSpecDefLabels(pool, [...effectiveIds]);
  return toEffectiveSpecDefs(effectiveIds, labels);
};

export const scopePanelDefs = async (
  pool: Pool,
  rootCategoryId: string,
): Promise<EffectiveSpecDef[]> => {
  const [allCategories, participation] = await Promise.all([
    loadAllCategories(pool),
    loadParticipationMaps(pool),
  ]);
  const categoriesById = new Map(allCategories.map((row) => [row.id, row]));
  const tree = nestCategoryTree(allCategories, null);
  const subtreeIds = collectSubtreeCategoryIds(tree, rootCategoryId);

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

export const unionEffectiveForCategories = async (
  pool: Pool,
  categoryIds: string[],
): Promise<EffectiveSpecDef[]> => {
  if (categoryIds.length === 0) {
    return [];
  }

  const [allCategories, participation] = await Promise.all([
    loadAllCategories(pool),
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
  rootCategoryId: string,
): Promise<Set<string>> => {
  const defs = await scopePanelDefs(pool, rootCategoryId);
  return new Set(defs.map((row) => row.spec_def_id));
};

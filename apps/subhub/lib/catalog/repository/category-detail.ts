import type { Pool } from "pg";

import { effectiveParticipation } from "./category-effective-specs";
import {
  loadAllCategories,
  resolveRootCategoryId,
} from "./category-tree";

export type CategoryDetailRow = {
  csi_code: string | null;
  default_phase_template_id: string | null;
  id: string;
  is_root: boolean;
  name: string;
  parent_id: string | null;
  parent_name: string | null;
  root_category_id: string | null;
  root_category_name: string | null;
  sort_order: number;
};

export type SpecOptionRow = {
  code: string | null;
  display_name: string;
  id: string;
  sort_order: number;
};

export type SpecDefinitionRow = {
  code: string | null;
  display_name: string;
  filter_mode: "prefer" | "required";
  id: string;
  options: SpecOptionRow[];
  sort_order: number;
  value_boolean: boolean | null;
  value_text: string | null;
  value_type: "boolean" | "enum" | "text";
};

export type SpecParticipationDefRow = {
  display_name: string;
  spec_def_id: string;
  value_type: "boolean" | "enum" | "text";
};

export type SpecParticipationActiveRow = SpecParticipationDefRow & {
  active: boolean;
};

export type SpecParticipationRow = {
  excludes: SpecParticipationActiveRow[];
  includes: SpecParticipationActiveRow[];
  inherited: SpecParticipationDefRow[];
};

export type CategoryDetailRelated = {
  spec_definitions: SpecDefinitionRow[];
  spec_participation: SpecParticipationRow;
};

export const loadCategoryDetail = async (
  pool: Pool,
  id: string,
): Promise<CategoryDetailRow | undefined> => {
  const result = await pool.query<{
    csi_code: string | null;
    default_phase_template_id: string | null;
    id: string;
    name: string;
    parent_id: string | null;
    parent_name: string | null;
    sort_order: number;
  }>(
    `SELECT
       c.id,
       c.name,
       c.parent_id,
       c.sort_order,
       c.csi_code,
       c.default_phase_template_id,
       parent.name AS parent_name
     FROM category c
     LEFT JOIN category parent ON parent.id = c.parent_id
     WHERE c.id = $1`,
    [id],
  );

  const row = result.rows[0];
  if (!row) {
    return undefined;
  }

  const allRows = await loadAllCategories(pool);
  const rootCategoryId = resolveRootCategoryId(allRows, id) ?? null;
  const rootRow = rootCategoryId
    ? allRows.find((category) => category.id === rootCategoryId)
    : undefined;

  return {
    id: row.id,
    name: row.name,
    parent_id: row.parent_id,
    parent_name: row.parent_name,
    sort_order: row.sort_order,
    csi_code: row.csi_code,
    default_phase_template_id: row.default_phase_template_id,
    is_root: row.parent_id === null,
    root_category_id: rootCategoryId,
    root_category_name: rootRow?.name ?? null,
  };
};

const loadSpecOptions = async (
  pool: Pool,
  specDefIds: string[],
): Promise<Map<string, SpecOptionRow[]>> => {
  if (specDefIds.length === 0) {
    return new Map();
  }

  const result = await pool.query<SpecOptionRow & { spec_def_id: string }>(
    `SELECT id, spec_def_id, code, display_name, sort_order
     FROM spec_option
     WHERE spec_def_id = ANY($1::uuid[])
     ORDER BY sort_order ASC, display_name ASC, id ASC`,
    [specDefIds],
  );

  const byDefId = new Map<string, SpecOptionRow[]>();
  for (const row of result.rows) {
    const options = byDefId.get(row.spec_def_id) ?? [];
    options.push({
      id: row.id,
      code: row.code,
      display_name: row.display_name,
      sort_order: row.sort_order,
    });
    byDefId.set(row.spec_def_id, options);
  }

  return byDefId;
};

export const loadRootSpecDefinitions = async (
  pool: Pool,
  rootCategoryId: string,
): Promise<SpecDefinitionRow[]> => {
  const defsResult = await pool.query<{
    code: string | null;
    display_name: string;
    filter_mode: "prefer" | "required";
    id: string;
    sort_order: number;
    value_type: "boolean" | "enum" | "text";
  }>(
    `SELECT id, code, display_name, value_type, filter_mode, sort_order
     FROM spec_def
     WHERE root_category_id = $1
     ORDER BY sort_order ASC, display_name ASC, id ASC`,
    [rootCategoryId],
  );

  const optionsByDefId = await loadSpecOptions(
    pool,
    defsResult.rows.map((row) => row.id),
  );

  return defsResult.rows.map((row) => ({
    id: row.id,
    code: row.code,
    display_name: row.display_name,
    value_type: row.value_type,
    filter_mode: row.filter_mode,
    sort_order: row.sort_order,
    value_text: null,
    value_boolean: null,
    options: optionsByDefId.get(row.id) ?? [],
  }));
};

const emptySpecParticipation = (): SpecParticipationRow => ({
  inherited: [],
  includes: [],
  excludes: [],
});

export const loadCategorySpecParticipation = async (
  pool: Pool,
  category: CategoryDetailRow,
): Promise<SpecParticipationRow> => {
  const rootCategoryId = category.is_root ? category.id : category.root_category_id;
  if (!rootCategoryId) {
    return emptySpecParticipation();
  }

  const defs = await loadRootSpecDefinitions(pool, rootCategoryId);
  if (defs.length === 0) {
    return emptySpecParticipation();
  }

  const [includesResult, excludesResult] = await Promise.all([
    pool.query<{ spec_def_id: string }>(
      `SELECT spec_def_id FROM category_spec_def WHERE category_id = $1`,
      [category.id],
    ),
    pool.query<{ spec_def_id: string }>(
      `SELECT spec_def_id FROM category_spec_exclude WHERE category_id = $1`,
      [category.id],
    ),
  ]);

  const includeIds = new Set(includesResult.rows.map((row) => row.spec_def_id));
  const excludeIds = new Set(excludesResult.rows.map((row) => row.spec_def_id));

  let inherited: SpecParticipationDefRow[] = [];
  if (!category.is_root && category.parent_id) {
    const parentEffective = await effectiveParticipation(pool, category.parent_id);
    inherited = parentEffective.map((row) => ({
      spec_def_id: row.spec_def_id,
      display_name: row.display_name,
      value_type: row.value_type,
    }));
  }

  const includes = defs.map((def) => ({
    spec_def_id: def.id,
    display_name: def.display_name,
    value_type: def.value_type,
    active: includeIds.has(def.id),
  }));

  const excludes = category.is_root
    ? []
    : defs.map((def) => ({
        spec_def_id: def.id,
        display_name: def.display_name,
        value_type: def.value_type,
        active: excludeIds.has(def.id),
      }));

  return { inherited, includes, excludes };
};

export const loadCategoryDetailRelated = async (
  pool: Pool,
  categoryId: string,
): Promise<CategoryDetailRelated> => {
  const category = await loadCategoryDetail(pool, categoryId);
  if (!category) {
    return { spec_definitions: [], spec_participation: emptySpecParticipation() };
  }

  const spec_participation = await loadCategorySpecParticipation(pool, category);

  if (category.is_root) {
    return {
      spec_definitions: await loadRootSpecDefinitions(pool, category.id),
      spec_participation,
    };
  }

  return {
    spec_definitions: [],
    spec_participation,
  };
};

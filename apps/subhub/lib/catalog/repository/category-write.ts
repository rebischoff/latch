import { ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { InUseError, type DeleteBlocker } from "../../errors";
import { tableExists } from "../../sites/repository/sql-utils";
import type { CategoryDetailRow } from "./category-detail";

const DELETE_BLOCKER_SAMPLE_LIMIT = 5;

export type CategoryWriteRow = {
  csi_code: string | null;
  default_phase_template_id: string | null;
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
};

export const assertParentCategoryExists = async (
  client: PoolClient,
  parentId: string,
): Promise<void> => {
  const result = await client.query<{ id: string }>(
    `SELECT id FROM category WHERE id = $1`,
    [parentId],
  );

  if (result.rows.length === 0) {
    throw new ValidationError("Unknown parent_id", {
      field: "profile",
      code: "unknown_parent",
      parent_id: parentId,
    });
  }
};

export const assertNestedProfileFields = (
  isRoot: boolean,
  patch: {
    default_phase_template_id?: string | null;
  },
): void => {
  if (!isRoot && patch.default_phase_template_id !== undefined) {
    throw new ValidationError("default_phase_template_id is root-only", {
      field: "profile",
      code: "root_only_field",
    });
  }
};

export const loadCategoryDeleteBlockers = async (
  pool: Pool | PoolClient,
  categoryId: string,
): Promise<DeleteBlocker[]> => {
  const blockers: DeleteBlocker[] = [];

  const childCountResult = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM category
     WHERE parent_id = $1`,
    [categoryId],
  );
  const childCount = childCountResult.rows[0]?.count ?? 0;
  if (childCount > 0) {
    const sampleResult = await pool.query<{ label: string }>(
      `SELECT name AS label
       FROM category
       WHERE parent_id = $1
       ORDER BY sort_order ASC, name ASC, id ASC
       LIMIT $2`,
      [categoryId, DELETE_BLOCKER_SAMPLE_LIMIT],
    );
    blockers.push({
      type: "category_child",
      count: childCount,
      samples: sampleResult.rows.map((row) => row.label),
    });
  }

  if (await tableExists(pool, "site_scope")) {
    const countResult = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM site_scope
       WHERE root_category_id = $1`,
      [categoryId],
    );
    const count = countResult.rows[0]?.count ?? 0;
    if (count > 0) {
      const sampleResult = await pool.query<{ label: string }>(
        `SELECT name AS label
         FROM site_scope
         WHERE root_category_id = $1
         ORDER BY name ASC, id ASC
         LIMIT $2`,
        [categoryId, DELETE_BLOCKER_SAMPLE_LIMIT],
      );
      blockers.push({
        type: "site_scope",
        count,
        samples: sampleResult.rows.map((row) => row.label),
      });
    }
  }

  if (await tableExists(pool, "estimate_scope")) {
    const countResult = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM estimate_scope
       WHERE root_category_id = $1`,
      [categoryId],
    );
    const count = countResult.rows[0]?.count ?? 0;
    if (count > 0) {
      blockers.push({ type: "estimate_scope", count });
    }
  }

  if (await tableExists(pool, "item_category")) {
    const countResult = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM item_category
       WHERE category_id = $1`,
      [categoryId],
    );
    const count = countResult.rows[0]?.count ?? 0;
    if (count > 0) {
      blockers.push({ type: "item_category", count });
    }
  }

  if (await tableExists(pool, "part_category")) {
    const countResult = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM part_category
       WHERE category_id = $1`,
      [categoryId],
    );
    const count = countResult.rows[0]?.count ?? 0;
    if (count > 0) {
      blockers.push({ type: "part_category", count });
    }
  }

  const partSpecCountResult = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM manufacturer_part_spec mps
     INNER JOIN spec_def sd ON sd.id = mps.spec_def_id
     WHERE sd.root_category_id = $1`,
    [categoryId],
  );
  const partSpecCount = partSpecCountResult.rows[0]?.count ?? 0;
  if (partSpecCount > 0) {
    blockers.push({ type: "manufacturer_part_spec", count: partSpecCount });
  }

  return blockers;
};

export const insertCategory = async (
  pool: Pool,
  actorId: string,
  row: CategoryWriteRow,
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    if (row.parent_id) {
      await assertParentCategoryExists(client, row.parent_id);
    }

    await client.query(
      `INSERT INTO category (
         id, name, parent_id, sort_order, csi_code, default_phase_template_id
       ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        row.id,
        row.name,
        row.parent_id,
        row.sort_order,
        row.csi_code,
        row.default_phase_template_id,
      ],
    );
  });
};

export const updateCategory = async (
  pool: Pool,
  actorId: string,
  row: CategoryWriteRow,
  existing: CategoryDetailRow,
): Promise<void> => {
  assertNestedProfileFields(existing.is_root, {
    default_phase_template_id: row.default_phase_template_id,
  });

  await withPermissionDb(pool, actorId, async (client) => {
    await client.query(
      `UPDATE category
       SET name = $2,
           sort_order = $3,
           csi_code = $4,
           default_phase_template_id = $5
       WHERE id = $1`,
      [
        row.id,
        row.name,
        row.sort_order,
        row.csi_code,
        existing.is_root ? row.default_phase_template_id : null,
      ],
    );
  });
};

export const deleteCategory = async (
  pool: Pool,
  actorId: string,
  categoryId: string,
): Promise<void> => {
  const blockers = await loadCategoryDeleteBlockers(pool, categoryId);
  if (blockers.length > 0) {
    throw new InUseError("category", blockers);
  }

  await withPermissionDb(pool, actorId, async (client) => {
    const result = await client.query(`DELETE FROM category WHERE id = $1`, [
      categoryId,
    ]);
    if (result.rowCount === 0) {
      return;
    }
  });
};

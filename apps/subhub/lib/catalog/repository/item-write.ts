import { ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { InUseError, type DeleteBlocker } from "../../errors";
import { tableExists } from "../../sites/repository/sql-utils";
import type { ItemDetailRow } from "./item-detail";
import { loadAllItems, resolveRootItemId, type ItemFlatRow } from "./item-tree";

const DELETE_BLOCKER_SAMPLE_LIMIT = 5;

export type ItemNodeType = "scope" | "category" | "item";

export type ItemWriteRow = {
  csi_code: string | null;
  fallback_unit_cost?: number;
  freight_rate_type_id: string | null;
  id: string;
  incidental_rate_type_id: string | null;
  markup_type_id: string | null;
  name: string;
  node_type?: ItemNodeType;
  parent_id: string | null;
  sort_order: number;
};

export type ItemLaborPhaseWriteRow = {
  hours_per_unit: number;
  labor_phase_id: string;
  labor_rate_type_id: string;
  sort_order: number;
};

export const assertParentItemExists = async (
  client: PoolClient,
  parentId: string,
): Promise<void> => {
  const result = await client.query<{ id: string }>(
    `SELECT id FROM item WHERE id = $1`,
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

export const assertParentNotQuotable = async (
  client: PoolClient,
  parentId: string,
): Promise<void> => {
  const { rows } = await client.query<{ node_type: string }>(
    `SELECT node_type FROM item WHERE id = $1`,
    [parentId],
  );
  if (rows[0]?.node_type === "item") {
    throw new ValidationError("Cannot add a child under a quotable item", {
      field: "profile",
      code: "parent_not_selectable",
      parent_id: parentId,
    });
  }
};

export const assertReparentAllowed = async (
  client: PoolClient,
  itemId: string,
  newParentId: string | null,
): Promise<void> => {
  if (newParentId === null) {
    return;
  }

  const rows = (await client.query<ItemFlatRow>(`SELECT id, parent_id FROM item`)).rows;
  const rootOf = (id: string) => resolveRootItemId(rows, id);
  if (rootOf(itemId) !== rootOf(newParentId)) {
    throw new ValidationError("Cannot move item to a different scope root", {
      field: "profile",
      code: "cross_root_move",
    });
  }

  let cur: string | null = newParentId;
  const byId = new Map(rows.map((row) => [row.id, row]));
  while (cur) {
    if (cur === itemId) {
      throw new ValidationError("Cannot move item under its own descendant", {
        field: "profile",
        code: "cycle_move",
      });
    }
    cur = byId.get(cur)?.parent_id ?? null;
  }
};

const countLineReferences = async (
  client: PoolClient,
  itemId: string,
): Promise<number> => {
  let total = 0;

  if (await tableExists(client, "estimate_line")) {
    const estimateResult = await client.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM estimate_line WHERE item_id = $1`,
      [itemId],
    );
    total += estimateResult.rows[0]?.count ?? 0;
  }

  if (await tableExists(client, "job_line")) {
    const jobResult = await client.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM job_line WHERE item_id = $1`,
      [itemId],
    );
    total += jobResult.rows[0]?.count ?? 0;
  }

  return total;
};

const countChildItems = async (
  client: PoolClient,
  itemId: string,
): Promise<number> => {
  const result = await client.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM item WHERE parent_id = $1`,
    [itemId],
  );
  return result.rows[0]?.count ?? 0;
};

const resolveInsertNodeType = (row: ItemWriteRow): ItemNodeType => {
  if (row.parent_id === null) {
    return "scope";
  }
  return row.node_type ?? "category";
};

export const assertItemLaborPhaseWritable = async (
  client: PoolClient,
  itemId: string,
): Promise<ItemNodeType> => {
  const result = await client.query<{ node_type: ItemNodeType }>(
    `SELECT node_type FROM item WHERE id = $1`,
    [itemId],
  );
  const nodeType = result.rows[0]?.node_type;
  if (!nodeType) {
    throw new ValidationError("Unknown item", {
      field: "item_labor_phase",
      code: "unknown_item",
      item_id: itemId,
    });
  }

  if (nodeType === "scope") {
    throw new ValidationError("Labor phases cannot be authored on scope roots", {
      field: "item_labor_phase",
      code: "scope_root",
      item_id: itemId,
    });
  }

  return nodeType;
};

export const replaceItemLaborPhases = async (
  client: PoolClient,
  itemId: string,
  rows: ItemLaborPhaseWriteRow[],
): Promise<void> => {
  await assertItemLaborPhaseWritable(client, itemId);
  const seenPhases = new Set<string>();
  for (const row of rows) {
    if (seenPhases.has(row.labor_phase_id)) {
      throw new ValidationError("Duplicate labor_phase_id on item", {
        field: "item_labor_phase",
        code: "duplicate_phase",
        labor_phase_id: row.labor_phase_id,
      });
    }
    seenPhases.add(row.labor_phase_id);
  }

  await client.query(`DELETE FROM item_labor_phase WHERE item_id = $1`, [itemId]);

  for (const [index, row] of rows.entries()) {
    await client.query(
      `INSERT INTO item_labor_phase (
         item_id, labor_phase_id, labor_rate_type_id, hours_per_unit, sort_order
       ) VALUES ($1, $2, $3, $4, $5)`,
      [
        itemId,
        row.labor_phase_id,
        row.labor_rate_type_id,
        row.hours_per_unit,
        index + 1,
      ],
    );
  }
};

export const loadItemDeleteBlockers = async (
  pool: Pool | PoolClient,
  categoryId: string,
): Promise<DeleteBlocker[]> => {
  const blockers: DeleteBlocker[] = [];

  const childCountResult = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM item
     WHERE parent_id = $1`,
    [categoryId],
  );
  const childCount = childCountResult.rows[0]?.count ?? 0;
  if (childCount > 0) {
    const sampleResult = await pool.query<{ label: string }>(
      `SELECT name AS label
       FROM item
       WHERE parent_id = $1
       ORDER BY sort_order ASC, name ASC, id ASC
       LIMIT $2`,
      [categoryId, DELETE_BLOCKER_SAMPLE_LIMIT],
    );
    blockers.push({
      type: "item_child",
      count: childCount,
      samples: sampleResult.rows.map((row) => row.label),
    });
  }

  if (await tableExists(pool, "site_scope")) {
    const countResult = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM site_scope
       WHERE root_item_id = $1`,
      [categoryId],
    );
    const count = countResult.rows[0]?.count ?? 0;
    if (count > 0) {
      const sampleResult = await pool.query<{ label: string }>(
        `SELECT name AS label
         FROM site_scope
         WHERE root_item_id = $1
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

  if (await tableExists(pool, "estimate_condition")) {
    const countResult = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM estimate_condition
       WHERE root_item_id = $1`,
      [categoryId],
    );
    const count = countResult.rows[0]?.count ?? 0;
    if (count > 0) {
      blockers.push({ type: "estimate_condition", count });
    }
  }

  if (await tableExists(pool, "estimate_line")) {
    const countResult = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM estimate_line
       WHERE item_id = $1`,
      [categoryId],
    );
    const count = countResult.rows[0]?.count ?? 0;
    if (count > 0) {
      blockers.push({ type: "estimate_line", count });
    }
  }

  if (await tableExists(pool, "item_placement_removed")) {
    const countResult = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM item_placement_removed
       WHERE item_id = $1`,
      [categoryId],
    );
    const count = countResult.rows[0]?.count ?? 0;
    if (count > 0) {
      blockers.push({ type: "item_child_removed", count });
    }
  }

  if (await tableExists(pool, "part_item")) {
    const countResult = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM part_item
       WHERE item_id = $1`,
      [categoryId],
    );
    const count = countResult.rows[0]?.count ?? 0;
    if (count > 0) {
      blockers.push({ type: "part_item", count });
    }
  }

  const partSpecCountResult = await pool.query<{ count: number }>(
    `WITH RECURSIVE subtree AS (
       SELECT id FROM item WHERE id = $1
       UNION ALL
       SELECT c.id FROM item c JOIN subtree s ON c.parent_id = s.id
     )
     SELECT COUNT(*)::int AS count
     FROM manufacturer_part_spec mps
     INNER JOIN spec_def sd ON sd.id = mps.spec_def_id
     WHERE sd.item_id IN (SELECT id FROM subtree)`,
    [categoryId],
  );
  const partSpecCount = partSpecCountResult.rows[0]?.count ?? 0;
  if (partSpecCount > 0) {
    blockers.push({ type: "manufacturer_part_spec", count: partSpecCount });
  }

  return blockers;
};

export const insertItem = async (
  pool: Pool,
  actorId: string,
  row: ItemWriteRow,
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    if (row.parent_id) {
      await assertParentItemExists(client, row.parent_id);
      await assertParentNotQuotable(client, row.parent_id);
    }

    const nodeType = resolveInsertNodeType(row);

    await client.query(
      `INSERT INTO item (
         id, name, parent_id, node_type, sort_order, csi_code,
         freight_rate_type_id, incidental_rate_type_id, markup_type_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        row.id,
        row.name,
        row.parent_id,
        nodeType,
        row.sort_order,
        row.csi_code,
        row.freight_rate_type_id,
        row.incidental_rate_type_id,
        row.markup_type_id,
      ],
    );
  });
};

export const updateItem = async (
  pool: Pool,
  actorId: string,
  row: ItemWriteRow,
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    const existing = await client.query<{
      node_type: ItemNodeType;
      parent_id: string | null;
    }>(`SELECT node_type, parent_id FROM item WHERE id = $1`, [row.id]);

    const current = existing.rows[0];
    if (!current) {
      return;
    }

    const nextParentId =
      row.parent_id !== undefined ? row.parent_id : current.parent_id;
    const nextNodeType = row.node_type ?? current.node_type;

    if (nextParentId !== current.parent_id) {
      if (nextParentId) {
        await assertParentItemExists(client, nextParentId);
        await assertParentNotQuotable(client, nextParentId);
      }
      await assertReparentAllowed(client, row.id, nextParentId);
    }

    if (nextNodeType === "item") {
      const childCount = await countChildItems(client, row.id);
      if (childCount > 0) {
        throw new ValidationError("Cannot mark a branch node as quotable while it has children", {
          field: "profile",
          code: "item_has_children",
          id: row.id,
        });
      }
    }

    if (current.node_type === "item" && nextNodeType !== "item") {
      const lineRefs = await countLineReferences(client, row.id);
      if (lineRefs > 0) {
        throw new ValidationError(
          "Cannot demote a quotable item referenced by estimate or job lines",
          {
            field: "profile",
            code: "item_in_use",
            id: row.id,
            line_count: lineRefs,
          },
        );
      }
    }

    await client.query(
      `UPDATE item
       SET name = $2,
           parent_id = $3,
           node_type = $4,
           sort_order = $5,
           csi_code = $6,
           freight_rate_type_id = $7,
           incidental_rate_type_id = $8,
           markup_type_id = $9,
           fallback_unit_cost = COALESCE($10, fallback_unit_cost)
       WHERE id = $1`,
      [
        row.id,
        row.name,
        nextParentId,
        nextNodeType,
        row.sort_order,
        row.csi_code,
        row.freight_rate_type_id,
        row.incidental_rate_type_id,
        row.markup_type_id,
        row.fallback_unit_cost ?? null,
      ],
    );
  });
};

export const deleteItem = async (
  pool: Pool,
  actorId: string,
  categoryId: string,
): Promise<void> => {
  const blockers = await loadItemDeleteBlockers(pool, categoryId);
  if (blockers.length > 0) {
    throw new InUseError("item", blockers);
  }

  await withPermissionDb(pool, actorId, async (client) => {
    const result = await client.query(`DELETE FROM item WHERE id = $1`, [
      categoryId,
    ]);
    if (result.rowCount === 0) {
      return;
    }
  });
};

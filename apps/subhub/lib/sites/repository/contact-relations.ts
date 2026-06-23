import { ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { InUseError } from "../../errors";
import type { SiteContactRelationTableRow } from "../descriptors/contact-relation-table";
import { isUniqueViolation } from "./sql-utils";

export const countSiteContactsUsingRelation = async (
  pool: Pool | PoolClient,
  relationId: string,
): Promise<number> => {
  const result = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM site_contact
     WHERE relation_id = $1`,
    [relationId],
  );
  return result.rows[0]?.count ?? 0;
};

const assertUniqueDisplayName = async (
  client: PoolClient,
  displayName: string,
  excludeId?: string,
): Promise<void> => {
  const params: unknown[] = [displayName];
  let sql =
    "SELECT id FROM site_contact_relation WHERE display_name = $1";

  if (excludeId !== undefined) {
    params.push(excludeId);
    sql += ` AND id <> $${params.length}`;
  }

  const result = await client.query<{ id: string }>(sql, params);
  if (result.rows.length > 0) {
    throw new ValidationError("display_name already exists", {
      field: "display_name",
      code: "duplicate",
    });
  }
};

export const loadSiteContactRelationList = async (
  pool: Pool,
): Promise<SiteContactRelationTableRow[]> => {
  const result = await pool.query<SiteContactRelationTableRow>(
    `SELECT id, display_name, sort_order
     FROM site_contact_relation
     ORDER BY sort_order ASC, display_name ASC, id ASC`,
  );
  return result.rows;
};

export const loadSiteContactRelation = async (
  pool: Pool,
  id: string,
): Promise<SiteContactRelationTableRow | undefined> => {
  const result = await pool.query<SiteContactRelationTableRow>(
    `SELECT id, display_name, sort_order
     FROM site_contact_relation
     WHERE id = $1`,
    [id],
  );
  return result.rows[0];
};

const assertNoDuplicateDisplayNames = (
  rows: Array<{ display_name: string }>,
): void => {
  const seen = new Set<string>();
  for (const row of rows) {
    const key = row.display_name.trim().toLowerCase();
    if (seen.has(key)) {
      throw new ValidationError("display_name already exists", {
        field: "display_name",
        code: "duplicate",
      });
    }
    seen.add(key);
  }
};

const assertRelationIdsExist = async (
  client: PoolClient,
  ids: string[],
): Promise<void> => {
  if (ids.length === 0) {
    return;
  }

  const result = await client.query<{ id: string }>(
    `SELECT id FROM site_contact_relation WHERE id = ANY($1::text[])`,
    [ids],
  );

  if (result.rows.length !== ids.length) {
    throw new ValidationError("Unknown id in catalog replace", {
      field: "rows",
      code: "unknown_id",
    });
  }
};

export type SiteContactRelationReplaceRow = {
  display_name: string;
  id?: string;
  sort_order: number;
};

const replaceSiteContactRelationsTx = async (
  client: PoolClient,
  rows: SiteContactRelationReplaceRow[],
): Promise<SiteContactRelationTableRow[]> => {
  assertNoDuplicateDisplayNames(rows);

  const keepIds = rows
    .map((row) => row.id)
    .filter((id): id is string => id !== undefined);

  await assertRelationIdsExist(client, keepIds);

  const existing = await client.query<{ id: string }>(
    `SELECT id FROM site_contact_relation`,
  );
  const deleteIds = existing.rows
    .map((row) => row.id)
    .filter((id) => !keepIds.includes(id));

  for (const id of deleteIds) {
    const usageCount = await countSiteContactsUsingRelation(client, id);
    if (usageCount > 0) {
      throw new InUseError("site_contact_relation", [
        { type: "site_contact", count: usageCount },
      ]);
    }
  }

  if (deleteIds.length > 0) {
    await client.query(
      `DELETE FROM site_contact_relation WHERE id = ANY($1::text[])`,
      [deleteIds],
    );
  }

  const saved: SiteContactRelationTableRow[] = [];

  for (const row of rows) {
    const id = row.id ?? crypto.randomUUID();
    await assertUniqueDisplayName(client, row.display_name, row.id);

    try {
      await client.query(
        `INSERT INTO site_contact_relation (id, display_name, sort_order)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           sort_order = EXCLUDED.sort_order`,
        [id, row.display_name, row.sort_order],
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ValidationError("display_name already exists", {
          field: "display_name",
          code: "duplicate",
        });
      }
      throw error;
    }

    saved.push({ id, display_name: row.display_name, sort_order: row.sort_order });
  }

  return saved;
};

export const replaceSiteContactRelations = async (
  pool: Pool,
  actorId: string,
  rows: SiteContactRelationReplaceRow[],
): Promise<SiteContactRelationTableRow[]> => {
  let saved: SiteContactRelationTableRow[] = [];

  await withPermissionDb(pool, actorId, async (client) => {
    saved = await replaceSiteContactRelationsTx(client, rows);
  });

  return saved;
};

export const insertSiteContactRelation = async (
  pool: Pool,
  actorId: string,
  row: Pick<SiteContactRelationTableRow, "display_name" | "sort_order">,
): Promise<SiteContactRelationTableRow> => {
  const id = crypto.randomUUID();

  try {
    await withPermissionDb(pool, actorId, async (client) => {
      await assertUniqueDisplayName(client, row.display_name);
      await client.query(
        `INSERT INTO site_contact_relation (id, display_name, sort_order)
         VALUES ($1, $2, $3)`,
        [id, row.display_name, row.sort_order],
      );
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ValidationError("display_name already exists", {
        field: "display_name",
        code: "duplicate",
      });
    }
    throw error;
  }

  return { id, ...row };
};

export const updateSiteContactRelation = async (
  pool: Pool,
  actorId: string,
  row: SiteContactRelationTableRow,
): Promise<void> => {
  try {
    await withPermissionDb(pool, actorId, async (client) => {
      await assertUniqueDisplayName(client, row.display_name, row.id);
      await client.query(
        `UPDATE site_contact_relation
         SET display_name = $2, sort_order = $3
         WHERE id = $1`,
        [row.id, row.display_name, row.sort_order],
      );
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ValidationError("display_name already exists", {
        field: "display_name",
        code: "duplicate",
      });
    }
    throw error;
  }
};

export const deleteSiteContactRelation = async (
  pool: Pool,
  actorId: string,
  id: string,
): Promise<void> => {
  const usageCount = await countSiteContactsUsingRelation(pool, id);
  if (usageCount > 0) {
    throw new InUseError("site_contact_relation", [
      { type: "site_contact", count: usageCount },
    ]);
  }

  await withPermissionDb(pool, actorId, async (client) => {
    await client.query(`DELETE FROM site_contact_relation WHERE id = $1`, [id]);
  });
};

import { ConflictError, ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { InUseError } from "../../errors";
import type { SiteContactPatchRow, SiteDetailRow } from "../descriptors/site-detail";
import type { SiteListRow } from "../descriptors/site-list";
import { replaceSiteContactsTx } from "./site-contacts";
import {
  escapeLikePattern,
  isForeignKeyViolation,
  isUniqueViolation,
  tableExists,
} from "./sql-utils";

export type SiteListQuery = {
  limit: number;
  offset: number;
  q?: string;
  rowScope?: "all" | "own" | "scope";
};

export type SiteDetailWriteRow = Pick<
  SiteDetailRow,
  "id" | "name" | "customer_party_id" | "property_owner_party_id"
>;

const assertValidCustomerParty = async (
  client: Pool | PoolClient,
  partyId: string,
): Promise<void> => {
  const result = await client.query<{ kind: string }>(
    `SELECT p.kind
     FROM party p
     INNER JOIN party_role pr ON pr.party_id = p.id AND pr.role = 'customer'
     WHERE p.id = $1`,
    [partyId],
  );

  if (result.rows.length === 0) {
    throw new ValidationError("Invalid customer_party_id", {
      field: "customer_party",
      code: "invalid_party",
    });
  }

  if (result.rows[0]?.kind !== "organization") {
    throw new ValidationError("customer_party must be an organization", {
      field: "customer_party",
      code: "invalid_kind",
    });
  }
};

const assertValidPropertyOwnerParty = async (
  client: Pool | PoolClient,
  partyId: string,
): Promise<void> => {
  const result = await client.query<{ id: string }>(
    `SELECT p.id
     FROM party p
     INNER JOIN party_role pr ON pr.party_id = p.id AND pr.role = 'property_owner'
     WHERE p.id = $1`,
    [partyId],
  );

  if (result.rows.length === 0) {
    throw new ValidationError("Invalid property_owner_party_id", {
      field: "property_owner_party",
      code: "invalid_party",
    });
  }
};

const validatePortfolioFks = async (
  client: Pool | PoolClient,
  row: SiteDetailWriteRow,
): Promise<void> => {
  if (row.customer_party_id !== null) {
    await assertValidCustomerParty(client, row.customer_party_id);
  }

  if (row.property_owner_party_id !== null) {
    await assertValidPropertyOwnerParty(client, row.property_owner_party_id);
  }
};

export const insertSite = async (
  pool: Pool,
  actorId: string,
  row: SiteDetailWriteRow,
  contacts?: SiteContactPatchRow[],
): Promise<void> => {
  try {
    await withPermissionDb(pool, actorId, async (client) => {
      await validatePortfolioFks(client, row);
      await client.query(
        `INSERT INTO site (id, name, customer_party_id, property_owner_party_id)
         VALUES ($1, $2, $3, $4)`,
        [row.id, row.name, row.customer_party_id, row.property_owner_party_id],
      );

      if (contacts !== undefined) {
        await replaceSiteContactsTx(client, row.id, contacts);
      }
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("Site already exists");
    }
    throw error;
  }
};

export const updateSite = async (
  pool: Pool,
  actorId: string,
  row: SiteDetailWriteRow,
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await validatePortfolioFks(client, row);
    await client.query(
      `UPDATE site
       SET name = $2,
           customer_party_id = $3,
           property_owner_party_id = $4,
           updated_at = now()
       WHERE id = $1`,
      [row.id, row.name, row.customer_party_id, row.property_owner_party_id],
    );
  });
};

export const loadSiteDeleteBlockers = async (
  pool: Pool,
  siteId: string,
): Promise<Array<{ type: string; count: number }>> => {
  const blockers: Array<{ type: string; count: number }> = [];

  const childResult = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM site
     WHERE parent_site_id = $1`,
    [siteId],
  );
  const childCount = childResult.rows[0]?.count ?? 0;
  if (childCount > 0) {
    blockers.push({ type: "child_site", count: childCount });
  }

  for (const table of ["estimate", "job"] as const) {
    if (!(await tableExists(pool, table))) {
      continue;
    }

    const result = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM ${table} WHERE site_id = $1`,
      [siteId],
    );
    const count = result.rows[0]?.count ?? 0;
    if (count > 0) {
      blockers.push({ type: table, count });
    }
  }

  return blockers;
};

export const deleteSite = async (
  pool: Pool,
  actorId: string,
  id: string,
): Promise<void> => {
  const blockers = await loadSiteDeleteBlockers(pool, id);
  if (blockers.length > 0) {
    throw new InUseError("site", blockers);
  }

  try {
    await withPermissionDb(pool, actorId, async (client) => {
      await client.query(`DELETE FROM site WHERE id = $1`, [id]);
    });
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      const refreshed = await loadSiteDeleteBlockers(pool, id);
      if (refreshed.length > 0) {
        throw new InUseError("site", refreshed);
      }
    }
    throw error;
  }
};

const buildSiteListWhere = (
  query: SiteListQuery,
  params: unknown[],
): string | null => {
  if (query.rowScope === "own" || query.rowScope === "scope") {
    return null;
  }

  const q = query.q?.trim();
  if (!q) {
    return "TRUE";
  }

  params.push(`%${escapeLikePattern(q)}%`);
  return `s.name ILIKE $${params.length} ESCAPE '\\'`;
};

export const loadSiteList = async (
  pool: Pool,
  query: SiteListQuery,
): Promise<{ rows: SiteListRow[]; total: number }> => {
  const params: unknown[] = [];
  const whereSql = buildSiteListWhere(query, params);
  if (!whereSql) {
    return { rows: [], total: 0 };
  }

  const countResult = await pool.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total
     FROM site s
     WHERE ${whereSql}`,
    params,
  );

  const listParams = [...params, query.limit, query.offset];
  const limitIdx = listParams.length - 1;
  const offsetIdx = listParams.length;
  const listResult = await pool.query<SiteListRow>(
    `SELECT s.id, s.name
     FROM site s
     WHERE ${whereSql}
     ORDER BY s.name ASC, s.id ASC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    listParams,
  );

  return {
    rows: listResult.rows,
    total: countResult.rows[0]?.total ?? 0,
  };
};

export const loadSiteDetail = async (
  pool: Pool,
  id: string,
): Promise<SiteDetailRow | undefined> => {
  const result = await pool.query<SiteDetailRow>(
    `SELECT
       s.id,
       s.name,
       s.customer_party_id,
       customer.display_name AS customer_display_name,
       s.property_owner_party_id,
       property_owner.display_name AS property_owner_display_name
     FROM site s
     LEFT JOIN party customer ON customer.id = s.customer_party_id
     LEFT JOIN party property_owner ON property_owner.id = s.property_owner_party_id
     WHERE s.id = $1`,
    [id],
  );

  return result.rows[0];
};

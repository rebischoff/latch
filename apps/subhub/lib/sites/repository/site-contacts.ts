import { ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import type {
  SiteContactPatchRow,
  SiteContactRow,
  SiteDetailRelated,
} from "../descriptors/site-detail";
import { loadSiteScopes } from "./site-scopes";
import { isUniqueViolation } from "./sql-utils";

const assertContactIdsBelongToSite = async (
  client: PoolClient,
  siteId: string,
  ids: string[],
): Promise<void> => {
  if (ids.length === 0) {
    return;
  }

  const result = await client.query<{ id: string }>(
    `SELECT id FROM site_contact WHERE site_id = $1 AND id = ANY($2::text[])`,
    [siteId, ids],
  );

  if (result.rows.length !== ids.length) {
    throw new ValidationError("Unknown id in contacts collection patch");
  }
};

const assertPartyExists = async (
  client: PoolClient,
  partyId: string,
): Promise<void> => {
  const result = await client.query<{ id: string }>(
    `SELECT id FROM party WHERE id = $1`,
    [partyId],
  );

  if (result.rows.length === 0) {
    throw new ValidationError("Unknown party_id in contacts", {
      field: "contacts",
      code: "unknown_party",
    });
  }
};

const assertRelationExists = async (
  client: PoolClient,
  relationId: string,
): Promise<void> => {
  const result = await client.query<{ id: string }>(
    `SELECT id FROM site_contact_relation WHERE id = $1`,
    [relationId],
  );

  if (result.rows.length === 0) {
    throw new ValidationError("Unknown relation_id in contacts", {
      field: "contacts",
      code: "unknown_relation",
    });
  }
};

const assertNoDuplicateContacts = (rows: SiteContactPatchRow[]): void => {
  const seen = new Set<string>();

  for (const row of rows) {
    const key = `${row.party_id}:${row.relation_id}`;
    if (seen.has(key)) {
      throw new ValidationError("Duplicate contact row", {
        field: "contacts",
        code: "duplicate",
        party_id: row.party_id,
        relation_id: row.relation_id,
      });
    }
    seen.add(key);
  }
};

export const replaceSiteContactsTx = async (
  client: PoolClient,
  siteId: string,
  rows: SiteContactPatchRow[],
): Promise<void> => {
  assertNoDuplicateContacts(rows);

  const keepIds = rows
    .map((row) => row.id)
    .filter((id): id is string => id !== undefined);

  await assertContactIdsBelongToSite(client, siteId, keepIds);

  for (const row of rows) {
    await assertPartyExists(client, row.party_id);
    await assertRelationExists(client, row.relation_id);
  }

  if (keepIds.length > 0) {
    await client.query(
      `DELETE FROM site_contact
       WHERE site_id = $1
         AND id <> ALL($2::text[])`,
      [siteId, keepIds],
    );
  } else {
    await client.query(`DELETE FROM site_contact WHERE site_id = $1`, [siteId]);
  }

  for (const [index, row] of rows.entries()) {
    const id = row.id ?? crypto.randomUUID();
    try {
      await client.query(
        `INSERT INTO site_contact (id, site_id, party_id, relation_id, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           party_id = EXCLUDED.party_id,
           relation_id = EXCLUDED.relation_id,
           sort_order = EXCLUDED.sort_order`,
        [id, siteId, row.party_id, row.relation_id, index],
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ValidationError("Duplicate contact row", {
          field: "contacts",
          code: "duplicate",
          party_id: row.party_id,
          relation_id: row.relation_id,
        });
      }
      throw error;
    }
  }
};

export const replaceSiteContacts = async (
  pool: Pool,
  actorId: string,
  siteId: string,
  rows: SiteContactPatchRow[],
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await replaceSiteContactsTx(client, siteId, rows);
  });
};

export const loadSiteContacts = async (
  pool: Pool,
  siteId: string,
): Promise<SiteContactRow[]> => {
  const result = await pool.query<SiteContactRow>(
    `SELECT
       sc.id,
       sc.party_id,
       p.display_name,
       p.kind,
       sc.relation_id,
       scr.display_name AS relation_label,
       sc.sort_order
     FROM site_contact sc
     INNER JOIN party p ON p.id = sc.party_id
     INNER JOIN site_contact_relation scr ON scr.id = sc.relation_id
     WHERE sc.site_id = $1
     ORDER BY sc.sort_order ASC, p.display_name ASC, sc.id ASC`,
    [siteId],
  );

  return result.rows;
};

export const loadSiteDetailRelated = async (
  pool: Pool,
  siteId: string,
): Promise<SiteDetailRelated> => {
  const [contacts, scopesData] = await Promise.all([
    loadSiteContacts(pool, siteId),
    loadSiteScopes(pool, siteId),
  ]);

  return {
    contacts,
    ...scopesData,
  };
};

import { ValidationError } from "@latch/contracts";
import type { ListQuery, ListResult, StoreAdapter } from "@latch/dal";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import type {
  ContactDetailRelated,
  ContactDetailRow,
  ContactDetailStoreRelated,
  PartyEmailPatchRow,
  PartyEmailRow,
  PartyPhonePatchRow,
  PartyPhoneRow,
} from "./descriptors.js";

export type PartyRoleFilter = "customer" | "vendor" | "manufacturer";

export type PartyListRow = {
  id: string;
  display_name: string;
  kind: string;
};

const PARTY_LIST_COLUMNS = "p.id, p.display_name, p.kind";

const partyHasRole = async (
  pool: Pool,
  partyId: string,
  role: PartyRoleFilter,
): Promise<boolean> => {
  const result = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM party_role
       WHERE party_id = $1 AND role = $2
     ) AS exists`,
    [partyId, role],
  );
  return result.rows[0]?.exists ?? false;
};

const buildListScopeClause = (
  query: ListQuery,
  params: unknown[],
): string | null => {
  if (query.rowScope === "own" || query.rowScope === "scope") {
    return null;
  }
  return "TRUE";
};

const buildPartyListQuery = (
  partyRole: PartyRoleFilter | undefined,
  query: ListQuery,
): { fromSql: string; whereSql: string; params: unknown[] } | null => {
  const params: unknown[] = [];
  let fromSql = "party p";

  if (partyRole) {
    params.push(partyRole);
    fromSql += ` INNER JOIN party_role pr ON pr.party_id = p.id AND pr.role = $${params.length}`;
  }

  const scopeClause = buildListScopeClause(query, params);
  if (!scopeClause) {
    return null;
  }

  return {
    fromSql,
    whereSql: scopeClause,
    params,
  };
};

const mapPartyListRow = (raw: Record<string, unknown>): PartyListRow => ({
  id: String(raw.id),
  display_name: String(raw.display_name),
  kind: String(raw.kind),
});

export const loadPartyList = async (
  pool: Pool,
  query: ListQuery,
  partyRole?: PartyRoleFilter,
): Promise<ListResult<PartyListRow>> => {
  const built = buildPartyListQuery(partyRole, query);
  if (!built) {
    return { rows: [], total: 0 };
  }

  const { fromSql, whereSql, params } = built;
  const countResult = await pool.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM ${fromSql} WHERE ${whereSql}`,
    params,
  );
  const total = countResult.rows[0]?.total ?? 0;

  const listParams = [...params, query.limit, query.offset];
  const limitIdx = listParams.length - 1;
  const offsetIdx = listParams.length;
  const listResult = await pool.query<Record<string, unknown>>(
    `SELECT ${PARTY_LIST_COLUMNS}
     FROM ${fromSql}
     WHERE ${whereSql}
     ORDER BY p.display_name, p.id
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    listParams,
  );

  return {
    rows: listResult.rows.map(mapPartyListRow),
    total,
  };
};

export const loadPartyDetail = async (
  pool: Pool,
  id: string,
): Promise<ContactDetailRow | undefined> => {
  const result = await pool.query<ContactDetailRow>(
    `SELECT id, kind, display_name, legal_name, notes
     FROM party
     WHERE id = $1`,
    [id],
  );
  return result.rows[0];
};

export const loadPartyPhones = async (
  pool: Pool,
  partyId: string,
): Promise<PartyPhoneRow[]> => {
  const result = await pool.query<PartyPhoneRow>(
    `SELECT id, label, number, is_primary
     FROM party_phone
     WHERE party_id = $1
     ORDER BY sort_order, id`,
    [partyId],
  );
  return result.rows;
};

export const loadPartyEmails = async (
  pool: Pool,
  partyId: string,
): Promise<PartyEmailRow[]> => {
  const result = await pool.query<PartyEmailRow>(
    `SELECT id, label, address, is_primary
     FROM party_email
     WHERE party_id = $1
     ORDER BY sort_order, id`,
    [partyId],
  );
  return result.rows;
};

export const loadContactDetailRelated = async (
  pool: Pool,
  partyId: string,
): Promise<ContactDetailRelated> => {
  const [phones, emails] = await Promise.all([
    loadPartyPhones(pool, partyId),
    loadPartyEmails(pool, partyId),
  ]);
  return { phones, emails };
};

const assertChildIdsBelongToParty = async (
  client: PoolClient,
  table: "party_phone" | "party_email",
  partyId: string,
  ids: string[],
): Promise<void> => {
  if (ids.length === 0) {
    return;
  }

  const result = await client.query<{ id: string }>(
    `SELECT id FROM ${table} WHERE party_id = $1 AND id = ANY($2::text[])`,
    [partyId, ids],
  );

  if (result.rows.length !== ids.length) {
    throw new ValidationError(`Unknown id in ${table} collection patch`);
  }
};

const replacePartyCollection = async (
  client: PoolClient,
  table: "party_phone" | "party_email",
  partyId: string,
  rows: Array<{
    id?: string;
    label: string;
    is_primary: boolean;
    sort_order: number;
    value: string;
  }>,
  valueColumn: "number" | "address",
): Promise<void> => {
  const keepIds = rows
    .map((row) => row.id)
    .filter((id): id is string => id !== undefined);

  await assertChildIdsBelongToParty(client, table, partyId, keepIds);

  if (keepIds.length > 0) {
    await client.query(
      `DELETE FROM ${table}
       WHERE party_id = $1
         AND id <> ALL($2::text[])`,
      [partyId, keepIds],
    );
  } else {
    await client.query(`DELETE FROM ${table} WHERE party_id = $1`, [partyId]);
  }

  for (const row of rows) {
    const id = row.id ?? crypto.randomUUID();
    await client.query(
      `INSERT INTO ${table} (id, party_id, label, ${valueColumn}, is_primary, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         label = EXCLUDED.label,
         ${valueColumn} = EXCLUDED.${valueColumn},
         is_primary = EXCLUDED.is_primary,
         sort_order = EXCLUDED.sort_order`,
      [id, partyId, row.label, row.value, row.is_primary, row.sort_order],
    );
  }
};

export const replacePartyPhones = async (
  pool: Pool,
  actorId: string,
  partyId: string,
  rows: PartyPhonePatchRow[],
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await replacePartyCollection(
      client,
      "party_phone",
      partyId,
      rows.map((row, index) => ({
        id: row.id,
        label: row.label,
        is_primary: row.is_primary,
        sort_order: index,
        value: row.number,
      })),
      "number",
    );
  });
};

export const replacePartyEmails = async (
  pool: Pool,
  actorId: string,
  partyId: string,
  rows: PartyEmailPatchRow[],
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await replacePartyCollection(
      client,
      "party_email",
      partyId,
      rows.map((row, index) => ({
        id: row.id,
        label: row.label,
        is_primary: row.is_primary,
        sort_order: index,
        value: row.address,
      })),
      "address",
    );
  });
};

export const updateParty = async (
  pool: Pool,
  actorId: string,
  row: ContactDetailRow,
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await client.query(
      `UPDATE party
       SET kind = $2,
           display_name = $3,
           legal_name = $4,
           notes = $5,
           updated_at = now()
       WHERE id = $1`,
      [row.id, row.kind, row.display_name, row.legal_name, row.notes],
    );
  });
};

export const deleteParty = async (
  pool: Pool,
  actorId: string,
  id: string,
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await client.query(`DELETE FROM party WHERE id = $1`, [id]);
  });
};

export const createPartyListStore = <TRow extends PartyListRow>(
  pool: Pool,
  getActorId: () => Promise<string>,
  partyRole?: PartyRoleFilter,
  mapRow: (row: PartyListRow) => TRow = (row) => row as TRow,
): StoreAdapter<TRow> => ({
  get: async (id: string): Promise<TRow | undefined> => {
    const row = await loadPartyDetail(pool, id);
    if (!row) {
      return undefined;
    }
    if (partyRole && !(await partyHasRole(pool, id, partyRole))) {
      return undefined;
    }
    return mapRow({
      id: row.id,
      display_name: row.display_name,
      kind: row.kind,
    });
  },

  list: async (query: ListQuery): Promise<ListResult<TRow>> => {
    const result = await loadPartyList(pool, query, partyRole);
    return {
      rows: result.rows.map(mapRow),
      total: result.total,
    };
  },

  upsert: async (row: TRow): Promise<void> => {
    const actorId = await getActorId();
    const existing = await loadPartyDetail(pool, row.id);
    if (!existing) {
      return;
    }
    await updateParty(pool, actorId, {
      ...existing,
      display_name: row.display_name,
      kind: row.kind,
    });
  },

  delete: async (id: string): Promise<void> => {
    const actorId = await getActorId();
    await deleteParty(pool, actorId, id);
  },

  getRelated: async () => undefined as never,

  replaceRelated: async () => {},

  isRowVisibleToPrincipal: async (
    entityId: string,
    _principalId: string,
    rowScope: ListQuery["rowScope"] | undefined,
  ): Promise<boolean> => {
    if (rowScope === "own" || rowScope === "scope") {
      return false;
    }

    const row = await loadPartyDetail(pool, entityId);
    if (!row) {
      return false;
    }

    if (!partyRole) {
      return true;
    }

    return partyHasRole(pool, entityId, partyRole);
  },
});

export const createContactDetailStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
): StoreAdapter<ContactDetailRow, ContactDetailStoreRelated> => ({
  get: (id) => loadPartyDetail(pool, id),
  list: async () => ({ rows: [], total: 0 }),
  upsert: async (row) => {
    const actorId = await getActorId();
    await updateParty(pool, actorId, row);
  },
  delete: async (id) => {
    const actorId = await getActorId();
    await deleteParty(pool, actorId, id);
  },
  getRelated: (partyId) => loadContactDetailRelated(pool, partyId),
  replaceRelated: async (partyId, related) => {
    const actorId = await getActorId();
    const patch = related as ContactDetailStoreRelated;

    if (patch.phones !== undefined) {
      await replacePartyPhones(pool, actorId, partyId, patch.phones);
    }

    if (patch.emails !== undefined) {
      await replacePartyEmails(pool, actorId, partyId, patch.emails);
    }
  },
  isRowVisibleToPrincipal: async (entityId, _principalId, rowScope) => {
    if (rowScope === "own" || rowScope === "scope") {
      return false;
    }
    return (await loadPartyDetail(pool, entityId)) !== undefined;
  },
});

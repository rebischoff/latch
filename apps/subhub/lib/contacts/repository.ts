import { ValidationError } from "@latch/contracts";
import type { ListQuery, ListResult, StoreAdapter } from "@latch/dal";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { InUseError, type DeleteBlocker } from "../errors";
import {
  isForeignKeyViolation,
  tableExists,
} from "../sites/repository/sql-utils";
import type {
  ContactDetailRelated,
  ContactDetailRow,
  ContactDetailStoreRelated,
  PartyEmailPatchRow,
  PartyEmailRow,
  PartyPhonePatchRow,
  PartyPhoneRow,
} from "./descriptors";

export type PartyRoleFilter =
  | "customer"
  | "vendor"
  | "manufacturer"
  | "employee"
  | "property_owner";

export {
  loadManufacturerDetail,
  loadManufacturerDetailRelated,
  loadPartyOtherRoles,
} from "./repository/manufacturer";

export {
  loadEmployeeDetail,
  loadEmployeeDetailRelated,
} from "./repository/employee-write";

export { loadEmployeeList } from "./repository/employee";

export type PartyListRow = {
  id: string;
  display_name: string;
  kind: string;
};

const PARTY_LIST_COLUMNS = "p.id, p.display_name, p.kind";

export const partyHasRole = async (
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

const PARTY_NOTES_ENTITY = "party";

const loadPartyNotesBody = async (
  pool: Pool,
  partyId: string,
): Promise<string | null> => {
  const result = await pool.query<{ body: string }>(
    `SELECT body
     FROM note
     WHERE entity_type = $1 AND entity_id = $2
     ORDER BY sort_order, id
     LIMIT 1`,
    [PARTY_NOTES_ENTITY, partyId],
  );
  return result.rows[0]?.body ?? null;
};

export const loadPartyDetail = async (
  pool: Pool,
  id: string,
): Promise<ContactDetailRow | undefined> => {
  const result = await pool.query<
    Omit<ContactDetailRow, "notes">
  >(
    `SELECT id, kind, display_name, legal_name
     FROM party
     WHERE id = $1`,
    [id],
  );
  const row = result.rows[0];
  if (!row) {
    return undefined;
  }

  const notes = await loadPartyNotesBody(pool, id);
  return { ...row, notes };
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
    `SELECT id, label, address, is_primary, is_login_email
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
    is_login_email?: boolean;
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
    if (table === "party_email") {
      await client.query(
        `INSERT INTO party_email (id, party_id, label, address, is_primary, is_login_email, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           label = EXCLUDED.label,
           address = EXCLUDED.address,
           is_primary = EXCLUDED.is_primary,
           is_login_email = EXCLUDED.is_login_email,
           sort_order = EXCLUDED.sort_order`,
        [
          id,
          partyId,
          row.label,
          row.value,
          row.is_primary,
          row.is_login_email ?? false,
          row.sort_order,
        ],
      );
      continue;
    }

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

export const replacePartyPhonesTx = async (
  client: PoolClient,
  partyId: string,
  rows: PartyPhonePatchRow[],
): Promise<void> => {
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
};

export const replacePartyEmailsTx = async (
  client: PoolClient,
  partyId: string,
  rows: PartyEmailPatchRow[],
): Promise<void> => {
  const loginCount = rows.filter((row) => row.is_login_email).length;
  if (loginCount > 1) {
    throw new ValidationError("At most one login email per party");
  }

  await replacePartyCollection(
    client,
    "party_email",
    partyId,
    rows.map((row, index) => ({
      id: row.id,
      label: row.label,
      is_primary: row.is_primary,
      is_login_email: row.is_login_email,
      sort_order: index,
      value: row.address,
    })),
    "address",
  );
};

export const replacePartyPhones = async (
  pool: Pool,
  actorId: string,
  partyId: string,
  rows: PartyPhonePatchRow[],
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await replacePartyPhonesTx(client, partyId, rows);
  });
};

export const replacePartyEmails = async (
  pool: Pool,
  actorId: string,
  partyId: string,
  rows: PartyEmailPatchRow[],
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await replacePartyEmailsTx(client, partyId, rows);
  });
};

const replacePartyNotes = async (
  client: PoolClient,
  partyId: string,
  notes: string | null,
): Promise<void> => {
  await client.query(
    `DELETE FROM note
     WHERE entity_type = $1 AND entity_id = $2`,
    [PARTY_NOTES_ENTITY, partyId],
  );

  const body = notes?.trim();
  if (!body) {
    return;
  }

  await client.query(
    `INSERT INTO note (entity_type, entity_id, body)
     VALUES ($1, $2, $3)`,
    [PARTY_NOTES_ENTITY, partyId, body],
  );
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
           updated_at = now()
       WHERE id = $1`,
      [row.id, row.kind, row.display_name, row.legal_name],
    );
    await replacePartyNotes(client, row.id, row.notes);
  });
};

const MANUFACTURER_PART_MPN_SAMPLE_LIMIT = 5;

export const countManufacturerPartsForParty = async (
  pool: Pool | PoolClient,
  partyId: string,
): Promise<number> => {
  const result = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM manufacturer_part
     WHERE manufacturer_party_id = $1`,
    [partyId],
  );
  return result.rows[0]?.count ?? 0;
};

const loadManufacturerPartMpnSamples = async (
  pool: Pool | PoolClient,
  partyId: string,
  limit: number,
): Promise<string[]> => {
  const result = await pool.query<{ mpn: string }>(
    `SELECT mpn
     FROM manufacturer_part
     WHERE manufacturer_party_id = $1
     ORDER BY mpn ASC, id ASC
     LIMIT $2`,
    [partyId, limit],
  );
  return result.rows.map((row) => row.mpn);
};

export const loadManufacturerDeleteBlockers = async (
  pool: Pool | PoolClient,
  partyId: string,
): Promise<DeleteBlocker[]> => {
  if (!(await tableExists(pool, "manufacturer_part"))) {
    return [];
  }

  const count = await countManufacturerPartsForParty(pool, partyId);
  if (count === 0) {
    return [];
  }

  const samples = await loadManufacturerPartMpnSamples(
    pool,
    partyId,
    MANUFACTURER_PART_MPN_SAMPLE_LIMIT,
  );

  return [{ type: "manufacturer_part", count, samples }];
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

/** Hard delete manufacturer party — blocked when MPN catalog rows reference party. */
export const deleteManufacturerParty = async (
  pool: Pool,
  actorId: string,
  id: string,
): Promise<void> => {
  const blockers = await loadManufacturerDeleteBlockers(pool, id);
  if (blockers.length > 0) {
    throw new InUseError("manufacturer", blockers);
  }

  try {
    await withPermissionDb(pool, actorId, async (client) => {
      await client.query(`DELETE FROM party WHERE id = $1`, [id]);
    });
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      const refreshed = await loadManufacturerDeleteBlockers(pool, id);
      if (refreshed.length > 0) {
        throw new InUseError("manufacturer", refreshed);
      }
    }
    throw error;
  }
};

export type CreatePersonPartyInput = {
  display_name: string;
  phone?: string;
};

/** Minimal person party for site standing-contact quick-create — no role tags. */
export const createPersonParty = async (
  pool: Pool,
  actorId: string,
  input: CreatePersonPartyInput,
): Promise<PartyListRow> => {
  const id = crypto.randomUUID();
  const displayName = input.display_name.trim();
  const phone = input.phone?.trim();

  await withPermissionDb(pool, actorId, async (client) => {
    await client.query(
      `INSERT INTO party (id, kind, display_name, legal_name)
       VALUES ($1, 'person', $2, '')`,
      [id, displayName],
    );
    await client.query(
      `INSERT INTO party_person (party_id, first_name, last_name, display_name)
       VALUES ($1, $2, '', $2)`,
      [id, displayName],
    );

    if (phone) {
      await client.query(
        `INSERT INTO party_phone (id, party_id, label, number, is_primary, sort_order)
         VALUES ($1, $2, 'main', $3, true, 0)`,
        [crypto.randomUUID(), id, phone],
      );
    }
  });

  return { id, display_name: displayName, kind: "person" };
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
    if (partyRole === "manufacturer") {
      await deleteManufacturerParty(pool, actorId, id);
      return;
    }
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

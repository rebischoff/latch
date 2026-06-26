import { ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { isUniqueViolation } from "../../sites/repository/sql-utils";
import type {
  EmployeeDetailRelated,
  EmployeeDetailRow,
  EmployeeDetailRelatedPatch,
} from "../descriptors/employee-detail";
import {
  loadPartyEmails,
  loadPartyPhones,
  partyHasRole,
  replacePartyEmailsTx,
  replacePartyPhonesTx,
} from "../repository";
import { syncLoginEmailFromEmailsTx } from "../identity/party-person-identity";
import { computePersonDisplayName } from "./manufacturer-write";

export const loadEmployeeDetail = async (
  pool: Pool,
  id: string,
): Promise<EmployeeDetailRow | undefined> => {
  const result = await pool.query<{
    avatar_url: string | null;
    display_name: string;
    first_name: string;
    id: string;
    last_name: string;
    latch_user_id: string | null;
    nick_name: string | null;
  }>(
    `SELECT
       p.id,
       p.display_name,
       pp.first_name,
       pp.last_name,
       pp.nick_name,
       pp.avatar_url,
       pp.latch_user_id
     FROM party p
     INNER JOIN party_person pp ON pp.party_id = p.id
     INNER JOIN employee e ON e.party_id = p.id
     WHERE p.id = $1`,
    [id],
  );

  const row = result.rows[0];
  if (!row) {
    return undefined;
  }

  return {
    id: row.id,
    display_name: row.display_name,
    first_name: row.first_name,
    last_name: row.last_name,
    nick_name: row.nick_name,
    avatar_url: row.avatar_url,
    latch_user_id: row.latch_user_id,
  };
};

export const loadEmployeeDetailRelated = async (
  pool: Pool,
  partyId: string,
): Promise<EmployeeDetailRelated> => {
  const [phones, emails] = await Promise.all([
    loadPartyPhones(pool, partyId),
    loadPartyEmails(pool, partyId),
  ]);

  return {
    phones,
    emails,
    staff: {
      party_id: partyId,
      is_staff: true,
    },
  };
};

export const employeePartyHasLens = async (
  pool: Pool,
  partyId: string,
): Promise<boolean> => partyHasRole(pool, partyId, "employee");

const insertEmployeeExtension = async (
  client: PoolClient,
  partyId: string,
): Promise<void> => {
  await client.query(`INSERT INTO employee (party_id) VALUES ($1)`, [partyId]);
};

export const insertEmployeeParty = async (
  pool: Pool,
  actorId: string,
  row: EmployeeDetailRow,
  related?: EmployeeDetailRelatedPatch,
): Promise<void> => {
  try {
    await withPermissionDb(pool, actorId, async (client) => {
      const displayName = computePersonDisplayName(row.first_name, row.last_name);

      await client.query(
        `INSERT INTO party (id, kind, display_name, legal_name)
         VALUES ($1, 'person', $2, '')`,
        [row.id, displayName],
      );

      await client.query(
        `INSERT INTO party_person (party_id, first_name, last_name, nick_name, avatar_url)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          row.id,
          row.first_name,
          row.last_name,
          row.nick_name,
          row.avatar_url,
        ],
      );

      await client.query(
        `INSERT INTO party_role (party_id, role) VALUES ($1, 'employee')`,
        [row.id],
      );

      await insertEmployeeExtension(client, row.id);

      if (related?.phones !== undefined) {
        await replacePartyPhonesTx(client, row.id, related.phones);
      }
      if (related?.emails !== undefined) {
        await replacePartyEmailsTx(client, row.id, related.emails);
      }
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw error;
    }
    throw error;
  }
};

export const updateEmployeeParty = async (
  pool: Pool,
  actorId: string,
  row: EmployeeDetailRow,
): Promise<void> => {
  if (!(await employeePartyHasLens(pool, row.id))) {
    throw new ValidationError("Party is not an employee", {
      field: "profile",
      code: "missing_lens_role",
    });
  }

  const displayName = computePersonDisplayName(row.first_name, row.last_name);

  await withPermissionDb(pool, actorId, async (client) => {
    await client.query(
      `UPDATE party
       SET display_name = $2, updated_at = now()
       WHERE id = $1`,
      [row.id, displayName],
    );
    await client.query(
      `UPDATE party_person
       SET first_name = $2,
           last_name = $3,
           nick_name = $4,
           avatar_url = $5
       WHERE party_id = $1`,
      [row.id, row.first_name, row.last_name, row.nick_name, row.avatar_url],
    );
  });
};

export const replaceEmployeeEmails = async (
  pool: Pool,
  actorId: string,
  partyId: string,
  rows: EmployeeDetailRelatedPatch["emails"],
): Promise<void> => {
  if (rows === undefined) {
    return;
  }

  await withPermissionDb(pool, actorId, async (client) => {
    await replacePartyEmailsTx(client, partyId, rows);
    await syncLoginEmailFromEmailsTx(client, partyId);
  });
};

export const deleteEmployeeParty = async (
  pool: Pool,
  actorId: string,
  id: string,
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await client.query(`DELETE FROM party WHERE id = $1`, [id]);
  });
};

import type { Pool } from "pg";

import type {
  ManufacturerDetailRelated,
  ManufacturerDetailRow,
  PartyAlsoRoleRow,
} from "../descriptors/manufacturer-detail";
import {
  loadPartyEmails,
  loadPartyPhones,
  type PartyRoleFilter,
} from "../repository";

export const loadPartyOtherRoles = async (
  pool: Pool,
  partyId: string,
  excludeRole: PartyRoleFilter = "manufacturer",
): Promise<PartyAlsoRoleRow[]> => {
  const result = await pool.query<{ role: string }>(
    `SELECT role
     FROM party_role
     WHERE party_id = $1 AND role <> $2
     ORDER BY role`,
    [partyId, excludeRole],
  );

  return result.rows.map((row) => ({ role: row.role }));
};

export const loadManufacturerDetail = async (
  pool: Pool,
  id: string,
): Promise<ManufacturerDetailRow | undefined> => {
  const result = await pool.query<{
    dba_name: string | null;
    display_name: string;
    first_name: string | null;
    id: string;
    kind: string;
    last_name: string | null;
    legal_name: string | null;
  }>(
    `SELECT
       p.id,
       p.kind,
       p.display_name,
       p.legal_name,
       pp.first_name,
       pp.last_name,
       po.dba_name
     FROM party p
     LEFT JOIN party_person pp ON pp.party_id = p.id AND p.kind = 'person'
     LEFT JOIN party_organization po ON po.party_id = p.id AND p.kind = 'organization'
     WHERE p.id = $1`,
    [id],
  );

  const row = result.rows[0];
  if (!row) {
    return undefined;
  }

  return {
    id: row.id,
    kind: row.kind,
    display_name: row.display_name,
    legal_name: row.legal_name,
    first_name: row.first_name,
    last_name: row.last_name,
    dba_name: row.dba_name,
  };
};

export const loadManufacturerDetailRelated = async (
  pool: Pool,
  partyId: string,
): Promise<ManufacturerDetailRelated> => {
  const [phones, emails, also_roles] = await Promise.all([
    loadPartyPhones(pool, partyId),
    loadPartyEmails(pool, partyId),
    loadPartyOtherRoles(pool, partyId),
  ]);

  return { phones, emails, also_roles };
};

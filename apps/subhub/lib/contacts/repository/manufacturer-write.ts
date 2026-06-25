import { ConflictError, ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";

import { InUseError } from "../../errors";
import { isUniqueViolation } from "../../sites/repository/sql-utils";
import type {
  ManufacturerDetailRelatedPatch,
  ManufacturerDetailRow,
  ManufacturerDetailWriteRow,
} from "../descriptors/manufacturer-detail";
import {
  loadManufacturerDeleteBlockers,
  partyHasRole,
  replacePartyEmailsTx,
  replacePartyPhonesTx,
} from "../repository";

export const PARTY_ROLE_VALUES = [
  "customer",
  "vendor",
  "manufacturer",
  "employee",
  "property_owner",
  "other",
] as const;

export type PartyRoleValue = (typeof PARTY_ROLE_VALUES)[number];

export const PartyRoleActionSchema = z
  .object({
    role: z.enum(PARTY_ROLE_VALUES),
  })
  .strict();

export const computePersonDisplayName = (
  firstName: string,
  lastName: string,
): string => {
  const first = firstName.trim();
  const last = lastName.trim();
  const full = [first, last].filter(Boolean).join(" ");
  return full || first || last;
};

export const computeOrgDisplayName = (
  legalName: string,
  dbaName: string | null | undefined,
): string => {
  const dba = dbaName?.trim();
  if (dba) {
    return dba;
  }
  return legalName.trim();
};

export const assertManufacturerKindImmutable = (
  existing: ManufacturerDetailRow,
  nextKind: string | undefined,
): void => {
  if (nextKind !== undefined && nextKind !== existing.kind) {
    throw new ValidationError("party.kind is immutable", {
      field: "profile",
      code: "immutable_kind",
    });
  }
};

const insertPersonExtension = async (
  client: PoolClient,
  partyId: string,
  firstName: string,
  lastName: string,
): Promise<void> => {
  await client.query(
    `INSERT INTO party_person (party_id, first_name, last_name)
     VALUES ($1, $2, $3)`,
    [partyId, firstName, lastName],
  );
};

const insertOrgExtension = async (
  client: PoolClient,
  partyId: string,
  dbaName: string | null | undefined,
): Promise<void> => {
  await client.query(
    `INSERT INTO party_organization (party_id, dba_name, parent_party_id)
     VALUES ($1, $2, NULL)`,
    [partyId, dbaName ?? null],
  );
};

export const insertManufacturerParty = async (
  pool: Pool,
  actorId: string,
  row: ManufacturerDetailWriteRow,
  related?: ManufacturerDetailRelatedPatch,
): Promise<void> => {
  try {
    await withPermissionDb(pool, actorId, async (client) => {
      const displayName =
        row.kind === "person"
          ? computePersonDisplayName(row.first_name ?? "", row.last_name ?? "")
          : computeOrgDisplayName(row.legal_name ?? "", row.dba_name);

      const legalName = row.kind === "organization" ? (row.legal_name ?? "") : "";

      await client.query(
        `INSERT INTO party (id, kind, display_name, legal_name)
         VALUES ($1, $2, $3, $4)`,
        [row.id, row.kind, displayName, legalName],
      );

      if (row.kind === "person") {
        await insertPersonExtension(
          client,
          row.id,
          row.first_name ?? "",
          row.last_name ?? "",
        );
      } else {
        await insertOrgExtension(client, row.id, row.dba_name);
      }

      await client.query(
        `INSERT INTO party_role (party_id, role) VALUES ($1, 'manufacturer')`,
        [row.id],
      );

      if (related?.phones !== undefined) {
        await replacePartyPhonesTx(client, row.id, related.phones);
      }
      if (related?.emails !== undefined) {
        await replacePartyEmailsTx(client, row.id, related.emails);
      }
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("Manufacturer already exists");
    }
    throw error;
  }
};

export const updateManufacturerParty = async (
  pool: Pool,
  actorId: string,
  row: ManufacturerDetailWriteRow,
  existing: ManufacturerDetailRow,
): Promise<void> => {
  assertManufacturerKindImmutable(existing, row.kind);

  if (!(await partyHasRole(pool, row.id, "manufacturer"))) {
    throw new ValidationError("Party is not a manufacturer", {
      field: "profile",
      code: "missing_lens_role",
    });
  }

  await withPermissionDb(pool, actorId, async (client) => {
    if (existing.kind === "person") {
      const displayName = computePersonDisplayName(
        row.first_name ?? "",
        row.last_name ?? "",
      );

      await client.query(
        `UPDATE party
         SET display_name = $2, updated_at = now()
         WHERE id = $1`,
        [row.id, displayName],
      );
      await client.query(
        `UPDATE party_person
         SET first_name = $2, last_name = $3
         WHERE party_id = $1`,
        [row.id, row.first_name ?? "", row.last_name ?? ""],
      );
      return;
    }

    const displayName = computeOrgDisplayName(row.legal_name ?? "", row.dba_name);

    await client.query(
      `UPDATE party
       SET display_name = $2, legal_name = $3, updated_at = now()
       WHERE id = $1`,
      [row.id, displayName, row.legal_name ?? ""],
    );
    await client.query(
      `UPDATE party_organization
       SET dba_name = $2, parent_party_id = NULL
       WHERE party_id = $1`,
      [row.id, row.dba_name ?? null],
    );
  });
};

export const addPartyRole = async (
  pool: Pool,
  actorId: string,
  partyId: string,
  role: PartyRoleValue,
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    const party = await client.query<{ id: string }>(
      `SELECT id FROM party WHERE id = $1`,
      [partyId],
    );
    if (party.rows.length === 0) {
      throw new ValidationError("Unknown party", {
        field: "role",
        code: "unknown_party",
        party_id: partyId,
      });
    }

    const existing = await client.query(
      `SELECT 1 FROM party_role WHERE party_id = $1 AND role = $2`,
      [partyId, role],
    );
    if (existing.rows.length > 0) {
      return;
    }

    await client.query(
      `INSERT INTO party_role (party_id, role) VALUES ($1, $2)`,
      [partyId, role],
    );
  });
};

export const removePartyRole = async (
  pool: Pool,
  actorId: string,
  partyId: string,
  role: PartyRoleValue,
): Promise<void> => {
  if (role === "manufacturer") {
    const blockers = await loadManufacturerDeleteBlockers(pool, partyId);
    if (blockers.length > 0) {
      throw new InUseError(
        "manufacturer",
        blockers,
        "Cannot remove manufacturer tag while parts reference this party",
      );
    }
  }

  await withPermissionDb(pool, actorId, async (client) => {
    const party = await client.query<{ id: string }>(
      `SELECT id FROM party WHERE id = $1`,
      [partyId],
    );
    if (party.rows.length === 0) {
      throw new ValidationError("Unknown party", {
        field: "role",
        code: "unknown_party",
        party_id: partyId,
      });
    }

    await client.query(
      `DELETE FROM party_role WHERE party_id = $1 AND role = $2`,
      [partyId, role],
    );
  });
};

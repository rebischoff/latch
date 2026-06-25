import { ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { isUniqueViolation } from "../../sites/repository/sql-utils";
import type { VendorPricingPatchRow } from "../descriptors/part-detail";

const assertPartyHasRole = async (
  client: PoolClient,
  partyId: string,
  role: "vendor",
): Promise<void> => {
  const result = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM party_role
       WHERE party_id = $1 AND role = $2
     ) AS exists`,
    [partyId, role],
  );

  if (!result.rows[0]?.exists) {
    throw new ValidationError("Party is not a vendor", {
      field: "vendor_pricing",
      code: "invalid_vendor",
      vendor_party_id: partyId,
    });
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
    throw new ValidationError("Unknown vendor_party_id in vendor_pricing", {
      field: "vendor_pricing",
      code: "unknown_party",
      vendor_party_id: partyId,
    });
  }
};

const assertNoDuplicateVendorPricing = (rows: VendorPricingPatchRow[]): void => {
  const seen = new Set<string>();

  for (const row of rows) {
    const key = `${row.vendor_party_id}:${row.vendor_pn}`;
    if (seen.has(key)) {
      throw new ValidationError("Duplicate vendor pricing row", {
        field: "vendor_pricing",
        code: "duplicate",
        vendor_party_id: row.vendor_party_id,
        vendor_pn: row.vendor_pn,
      });
    }
    seen.add(key);
  }
};

const assertAtMostOnePreferred = (rows: VendorPricingPatchRow[]): void => {
  const preferredCount = rows.filter((row) => row.is_preferred).length;
  if (preferredCount > 1) {
    throw new ValidationError("At most one preferred vendor per part", {
      field: "vendor_pricing",
      code: "multiple_preferred",
    });
  }
};

export const replaceVendorPricingTx = async (
  client: PoolClient,
  manufacturerPartId: string,
  rows: VendorPricingPatchRow[],
): Promise<void> => {
  assertNoDuplicateVendorPricing(rows);
  assertAtMostOnePreferred(rows);

  for (const row of rows) {
    await assertPartyExists(client, row.vendor_party_id);
    await assertPartyHasRole(client, row.vendor_party_id, "vendor");
  }

  await client.query(
    `DELETE FROM vendor_part WHERE manufacturer_part_id = $1`,
    [manufacturerPartId],
  );

  for (const row of rows) {
    const id = row.id ?? crypto.randomUUID();
    try {
      await client.query(
        `INSERT INTO vendor_part (
           id,
           vendor_party_id,
           manufacturer_part_id,
           vendor_pn,
           vendor_description,
           unit_price,
           is_preferred
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          id,
          row.vendor_party_id,
          manufacturerPartId,
          row.vendor_pn,
          row.vendor_description,
          row.unit_price,
          row.is_preferred,
        ],
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ValidationError("Vendor part number already exists for this vendor", {
          field: "vendor_pricing",
          code: "duplicate_vendor_pn",
          vendor_party_id: row.vendor_party_id,
          vendor_pn: row.vendor_pn,
        });
      }
      throw error;
    }
  }
};

export const replaceVendorPricing = async (
  pool: Pool,
  actorId: string,
  manufacturerPartId: string,
  rows: VendorPricingPatchRow[],
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await replaceVendorPricingTx(client, manufacturerPartId, rows);
  });
};

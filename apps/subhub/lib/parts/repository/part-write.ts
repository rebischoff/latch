import { ConflictError, ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { InUseError, type DeleteBlocker } from "../../errors";
import {
  isForeignKeyViolation,
  isUniqueViolation,
  tableExists,
} from "../../sites/repository/sql-utils";
import type {
  PartDetailRelatedPatch,
  PartDetailRow,
  PartDetailWriteRow,
} from "../descriptors/part-detail";
import { replaceItemLinksTx } from "./part-item-links";
import { replacePartSpecsTx } from "./part-specs";
import { replaceVendorPricingTx } from "./vendor-pricing-write";

const DELETE_BLOCKER_SAMPLE_LIMIT = 5;

const assertPartyHasRole = async (
  client: PoolClient,
  partyId: string,
  role: "manufacturer",
): Promise<void> => {
  const result = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM party_role
       WHERE party_id = $1 AND role = $2
     ) AS exists`,
    [partyId, role],
  );

  if (!result.rows[0]?.exists) {
    throw new ValidationError("Party is not a manufacturer", {
      field: "profile",
      code: "invalid_manufacturer",
      manufacturer_party_id: partyId,
    });
  }
};

const assertManufacturerPartyExists = async (
  client: PoolClient,
  partyId: string,
): Promise<void> => {
  const result = await client.query<{ id: string }>(
    `SELECT id FROM party WHERE id = $1`,
    [partyId],
  );

  if (result.rows.length === 0) {
    throw new ValidationError("Unknown manufacturer_party_id", {
      field: "profile",
      code: "unknown_party",
      manufacturer_party_id: partyId,
    });
  }

  await assertPartyHasRole(client, partyId, "manufacturer");
};

const validatePartWriteRow = async (
  client: PoolClient,
  row: PartDetailWriteRow,
): Promise<void> => {
  await assertManufacturerPartyExists(client, row.manufacturer_party_id);
};

const mapUniqueViolationToConflict = (error: unknown): never => {
  if (isUniqueViolation(error)) {
    throw new ConflictError("MPN already exists for this manufacturer");
  }
  throw error;
};

export const loadPartDeleteBlockers = async (
  pool: Pool | PoolClient,
  partId: string,
): Promise<DeleteBlocker[]> => {
  const blockers: DeleteBlocker[] = [];

  if (await tableExists(pool, "item_part_link")) {
    const countResult = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM item_part_link
       WHERE part_id = $1`,
      [partId],
    );
    const count = countResult.rows[0]?.count ?? 0;
    if (count > 0) {
      let samples: string[] | undefined;
      if (await tableExists(pool, "item")) {
        const sampleResult = await pool.query<{ label: string }>(
          `SELECT COALESCE(NULLIF(i.sku, ''), i.name) AS label
           FROM item_part_link ipl
           INNER JOIN item i ON i.id = ipl.item_id
           WHERE ipl.part_id = $1
           ORDER BY i.name ASC, i.id ASC
           LIMIT $2`,
          [partId, DELETE_BLOCKER_SAMPLE_LIMIT],
        );
        samples = sampleResult.rows.map((row) => row.label);
      }
      blockers.push({ type: "item_part_link", count, samples });
    }
  }

  if (await tableExists(pool, "job_line_part")) {
    const countResult = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM job_line_part
       WHERE part_id = $1`,
      [partId],
    );
    const count = countResult.rows[0]?.count ?? 0;
    if (count > 0) {
      let samples: string[] | undefined;
      if (await tableExists(pool, "job_line") && (await tableExists(pool, "job"))) {
        const sampleResult = await pool.query<{ label: string }>(
          `SELECT j.title AS label
           FROM job_line_part jlp
           INNER JOIN job_line jl ON jl.id = jlp.job_line_id
           INNER JOIN job j ON j.id = jl.job_id
           WHERE jlp.part_id = $1
           ORDER BY j.title ASC, j.id ASC
           LIMIT $2`,
          [partId, DELETE_BLOCKER_SAMPLE_LIMIT],
        );
        samples = sampleResult.rows.map((row) => row.label);
      }
      blockers.push({ type: "job_line_part", count, samples });
    }
  }

  if (await tableExists(pool, "material_receipt_line")) {
    const countResult = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM material_receipt_line
       WHERE part_id = $1`,
      [partId],
    );
    const count = countResult.rows[0]?.count ?? 0;
    if (count > 0) {
      const sampleResult = await pool.query<{ label: string }>(
        `SELECT id AS label
         FROM material_receipt_line
         WHERE part_id = $1
         ORDER BY id ASC
         LIMIT $2`,
        [partId, DELETE_BLOCKER_SAMPLE_LIMIT],
      );
      blockers.push({
        type: "material_receipt_line",
        count,
        samples: sampleResult.rows.map((row) => row.label),
      });
    }
  }

  if (await tableExists(pool, "job_material_movement")) {
    const countResult = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM job_material_movement
       WHERE part_id = $1`,
      [partId],
    );
    const count = countResult.rows[0]?.count ?? 0;
    if (count > 0) {
      const sampleResult = await pool.query<{ label: string }>(
        `SELECT id AS label
         FROM job_material_movement
         WHERE part_id = $1
         ORDER BY id ASC
         LIMIT $2`,
        [partId, DELETE_BLOCKER_SAMPLE_LIMIT],
      );
      blockers.push({
        type: "job_material_movement",
        count,
        samples: sampleResult.rows.map((row) => row.label),
      });
    }
  }

  return blockers;
};

export const insertPart = async (
  pool: Pool,
  actorId: string,
  row: PartDetailWriteRow,
  related?: PartDetailRelatedPatch,
): Promise<void> => {
  try {
    await withPermissionDb(pool, actorId, async (client) => {
      await validatePartWriteRow(client, row);

      await client.query(
        `INSERT INTO manufacturer_part (
           id,
           manufacturer_party_id,
           mpn,
           description,
           unit,
           purchase_unit,
           units_per_purchase,
           discontinued
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          row.id,
          row.manufacturer_party_id,
          row.mpn,
          row.description,
          row.unit,
          row.purchase_unit,
          row.units_per_purchase,
          row.discontinued,
        ],
      );

      if (related?.vendor_pricing !== undefined) {
        await replaceVendorPricingTx(client, row.id, related.vendor_pricing);
      }
      if (related?.item_links !== undefined) {
        await replaceItemLinksTx(client, row.id, related.item_links);
      }
      if (related?.part_specs !== undefined) {
        await replacePartSpecsTx(client, row.id, related.part_specs);
      }
    });
  } catch (error) {
    mapUniqueViolationToConflict(error);
  }
};

export const updatePart = async (
  pool: Pool,
  actorId: string,
  row: PartDetailWriteRow,
  _existing: PartDetailRow,
): Promise<void> => {
  try {
    await withPermissionDb(pool, actorId, async (client) => {
      await validatePartWriteRow(client, row);

      await client.query(
        `UPDATE manufacturer_part
         SET manufacturer_party_id = $2,
             mpn = $3,
             description = $4,
             unit = $5,
             purchase_unit = $6,
             units_per_purchase = $7,
             discontinued = $8,
             updated_at = now()
         WHERE id = $1`,
        [
          row.id,
          row.manufacturer_party_id,
          row.mpn,
          row.description,
          row.unit,
          row.purchase_unit,
          row.units_per_purchase,
          row.discontinued,
        ],
      );
    });
  } catch (error) {
    mapUniqueViolationToConflict(error);
  }
};

export const deletePart = async (
  pool: Pool,
  actorId: string,
  id: string,
): Promise<void> => {
  const blockers = await loadPartDeleteBlockers(pool, id);
  if (blockers.length > 0) {
    throw new InUseError("part", blockers);
  }

  try {
    await withPermissionDb(pool, actorId, async (client) => {
      await client.query(`DELETE FROM manufacturer_part WHERE id = $1`, [id]);
    });
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      const refreshed = await loadPartDeleteBlockers(pool, id);
      if (refreshed.length > 0) {
        throw new InUseError("part", refreshed);
      }
    }
    throw error;
  }
};

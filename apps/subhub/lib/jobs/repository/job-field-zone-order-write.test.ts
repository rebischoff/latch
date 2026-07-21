import type { PoolClient } from "pg";
import { describe, expect, it } from "vitest";

import { applyFieldZoneOrdersTx } from "./job-field-zone-order-write";

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[]; rowCount?: number }>;

const createClient = (query: QueryFn): PoolClient =>
  ({ query } as unknown as PoolClient);

/**
 * Task 59 IT1: Field ☐ Order snapshots `item_id` from `job_line.item_id`
 * (via `job_line_part`) onto the newly created `job_material_request` row.
 */
describe("applyFieldZoneOrdersTx — item_id snapshot (task 59 IT1)", () => {
  it("copies job_line.item_id onto the new request when the line has one", async () => {
    const calls: Array<{ sql: string; params?: unknown[] }> = [];

    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });

      if (sql.includes("INSERT INTO job_material_request")) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes("to_regclass")) {
        return { rows: [{ exists: true }] };
      }
      if (sql.includes("FROM job_line WHERE job_id")) {
        return { rows: [{ id: "jl-1", quantity: 5 }] };
      }
      if (sql.includes("FROM job_line_allocation")) {
        return { rows: [] };
      }
      if (sql.includes("FROM job_material_request") && sql.includes("GROUP BY")) {
        return { rows: [] };
      }
      if (sql.includes("FROM job_material_request WHERE job_id")) {
        return { rows: [] };
      }
      if (sql.includes("FROM job_line_part jlp") && sql.includes("ANY")) {
        return { rows: [{ id: "jlp-1", quantity: 5 }] };
      }
      if (sql.includes("FROM job_line_part jlp")) {
        return {
          rows: [
            {
              id: "jlp-1",
              job_line_id: "jl-1",
              item_id: "item-1",
              part_id: "part-1",
              description: "Cable",
              quantity: 5,
              unit: "ea",
            },
          ],
        };
      }
      if (sql.includes("FROM job WHERE id")) {
        return { rows: [{ id: "job-1" }] };
      }
      return { rows: [] };
    });

    const result = await applyFieldZoneOrdersTx(client, {
      desired: [{ site_zone_id: null, ordered: true }],
      jobId: "job-1",
      requestedBy: null,
    });

    expect(result.createdRequestCount).toBe(1);

    const insert = calls.find((c) =>
      c.sql.includes("INSERT INTO job_material_request"),
    );
    expect(insert).toBeTruthy();
    // id, job_id, site_zone_id, job_line_part_id, item_id, part_id, ...
    expect(insert?.params?.[3]).toBe("jlp-1");
    expect(insert?.params?.[4]).toBe("item-1");
    expect(insert?.params?.[5]).toBe("part-1");
  });

  it("stores null item_id when the job line has no catalog item (IT3)", async () => {
    const calls: Array<{ sql: string; params?: unknown[] }> = [];

    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });

      if (sql.includes("INSERT INTO job_material_request")) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes("to_regclass")) {
        return { rows: [{ exists: true }] };
      }
      if (sql.includes("FROM job_line WHERE job_id")) {
        return { rows: [{ id: "jl-1", quantity: 5 }] };
      }
      if (sql.includes("FROM job_line_allocation")) {
        return { rows: [] };
      }
      if (sql.includes("FROM job_material_request") && sql.includes("GROUP BY")) {
        return { rows: [] };
      }
      if (sql.includes("FROM job_material_request WHERE job_id")) {
        return { rows: [] };
      }
      if (sql.includes("FROM job_line_part jlp") && sql.includes("ANY")) {
        return { rows: [{ id: "jlp-1", quantity: 5 }] };
      }
      if (sql.includes("FROM job_line_part jlp")) {
        return {
          rows: [
            {
              id: "jlp-1",
              job_line_id: "jl-1",
              item_id: null,
              part_id: "part-1",
              description: "Cable",
              quantity: 5,
              unit: "ea",
            },
          ],
        };
      }
      if (sql.includes("FROM job WHERE id")) {
        return { rows: [{ id: "job-1" }] };
      }
      return { rows: [] };
    });

    const result = await applyFieldZoneOrdersTx(client, {
      desired: [{ site_zone_id: null, ordered: true }],
      jobId: "job-1",
      requestedBy: null,
    });

    expect(result.createdRequestCount).toBe(1);
    const insert = calls.find((c) =>
      c.sql.includes("INSERT INTO job_material_request"),
    );
    expect(insert?.params?.[4]).toBeNull();
  });
});

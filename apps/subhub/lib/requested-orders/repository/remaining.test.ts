import type { Pool } from "pg";
import { describe, expect, it } from "vitest";

import {
  computeBomOrderStatus,
  computeRemaining,
  loadBomPoolForJob,
  loadRemainingForJobLinePart,
} from "./remaining";

describe("computeRemaining", () => {
  it("subtracts covered from demand", () => {
    expect(computeRemaining(10, 4)).toBe(6);
  });

  it("floors at zero when covered exceeds demand", () => {
    expect(computeRemaining(5, 8)).toBe(0);
  });

  it("second request on the same BOM row only sees the leftover", () => {
    const demand = 10;
    const firstRequestCovers = 6;
    const remainingAfterFirst = computeRemaining(demand, firstRequestCovers);
    expect(remainingAfterFirst).toBe(4);

    const secondRequestCovers = firstRequestCovers + remainingAfterFirst;
    expect(computeRemaining(demand, secondRequestCovers)).toBe(0);
  });
});

describe("computeBomOrderStatus", () => {
  it("is open with no activity", () => {
    expect(
      computeBomOrderStatus({
        demand: 10,
        openQty: 0,
        onPurchaseOrderQty: 0,
        fulfilledQty: 0,
      }),
    ).toBe("open");
  });

  it("is requested when an open material request exists", () => {
    expect(
      computeBomOrderStatus({
        demand: 10,
        openQty: 4,
        onPurchaseOrderQty: 0,
        fulfilledQty: 0,
      }),
    ).toBe("requested");
  });

  it("is on_purchase_order once any qty is on a PO", () => {
    expect(
      computeBomOrderStatus({
        demand: 10,
        openQty: 4,
        onPurchaseOrderQty: 6,
        fulfilledQty: 0,
      }),
    ).toBe("on_purchase_order");
  });

  it("is fulfilled once fulfilled qty covers demand", () => {
    expect(
      computeBomOrderStatus({
        demand: 10,
        openQty: 0,
        onPurchaseOrderQty: 0,
        fulfilledQty: 10,
      }),
    ).toBe("fulfilled");
  });
});

describe("loadRemainingForJobLinePart", () => {
  it("excludes the given request's own current coverage from covered", async () => {
    const queries: string[] = [];
    const pool = {
      query: async (sql: string, params?: unknown[]) => {
        queries.push(sql);
        if (sql.includes("FROM job_line_part")) {
          return { rows: [{ quantity: 10 }] };
        }
        if (sql.includes("to_regclass")) {
          return { rows: [{ exists: true }] };
        }
        expect(params?.[2]).toBe("jmr-1");
        return { rows: [{ covered: 3 }] };
      },
    } as unknown as Pool;

    const remaining = await loadRemainingForJobLinePart(pool, {
      jobId: "job-1",
      jobLinePartId: "jlp-1",
      excludeRequestId: "jmr-1",
    });

    expect(remaining).toBe(7);
    expect(queries.some((sql) => sql.includes("FROM job_material_request"))).toBe(
      true,
    );
  });

  it("uses full covered qty when no request is excluded", async () => {
    const pool = {
      query: async (sql: string) => {
        if (sql.includes("FROM job_line_part")) {
          return { rows: [{ quantity: 10 }] };
        }
        if (sql.includes("to_regclass")) {
          return { rows: [{ exists: true }] };
        }
        return { rows: [{ covered: 10 }] };
      },
    } as unknown as Pool;

    const remaining = await loadRemainingForJobLinePart(pool, {
      jobId: "job-1",
      jobLinePartId: "jlp-1",
    });

    expect(remaining).toBe(0);
  });
});

describe("loadBomPoolForJob", () => {
  it("only returns BOM rows with remaining > 0", async () => {
    const pool = {
      query: async (sql: string) => {
        if (sql.includes("FROM job_line_part")) {
          return {
            rows: [
              {
                job_line_part_id: "jlp-1",
                job_line_id: "jl-1",
                part_id: "part-1",
                part_mpn: "MPN-1",
                part_description: "Cable",
                description: "",
                unit: "ft",
                quantity: 10,
              },
              {
                job_line_part_id: "jlp-2",
                job_line_id: "jl-1",
                part_id: "part-2",
                part_mpn: "MPN-2",
                part_description: "Camera",
                description: "",
                unit: "ea",
                quantity: 4,
              },
            ],
          };
        }
        if (sql.includes("to_regclass")) {
          return { rows: [{ exists: true }] };
        }
        if (sql.includes("FROM job_material_request")) {
          return {
            rows: [{ job_line_part_id: "jlp-2", covered: 4 }],
          };
        }
        return { rows: [] };
      },
    } as unknown as Pool;

    const pool_rows = await loadBomPoolForJob(pool, "job-1");
    expect(pool_rows.map((row) => row.job_line_part_id)).toEqual(["jlp-1"]);
    expect(pool_rows[0]?.remaining).toBe(10);
  });
});

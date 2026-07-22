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

describe("loadRemainingForJobLinePart (RP3 — PO coverage only)", () => {
  it("ignores open JMRs and uses PO coverage", async () => {
    const pool = {
      query: async (sql: string) => {
        if (sql.includes("FROM job_line_part")) {
          return { rows: [{ quantity: 10 }] };
        }
        if (sql.includes("to_regclass")) {
          return { rows: [{ exists: true }] };
        }
        if (sql.includes("SUM(pols.quantity)")) {
          return {
            rows: [{ job_line_part_id: "jlp-1", covered: 3 }],
          };
        }
        return { rows: [] };
      },
    } as unknown as Pool;

    const remaining = await loadRemainingForJobLinePart(pool, {
      jobId: "job-1",
      jobLinePartId: "jlp-1",
      excludeRequestId: "jmr-1",
    });

    expect(remaining).toBe(7);
  });

  it("returns full demand when there is no PO coverage", async () => {
    const pool = {
      query: async (sql: string) => {
        if (sql.includes("FROM job_line_part")) {
          return { rows: [{ quantity: 10 }] };
        }
        if (sql.includes("to_regclass")) {
          return { rows: [{ exists: true }] };
        }
        return { rows: [] };
      },
    } as unknown as Pool;

    const remaining = await loadRemainingForJobLinePart(pool, {
      jobId: "job-1",
      jobLinePartId: "jlp-1",
    });

    expect(remaining).toBe(10);
  });
});

describe("loadBomPoolForJob", () => {
  it("only returns BOM rows with remaining > 0 after PO coverage", async () => {
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
        if (sql.includes("SUM(pols.quantity)")) {
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

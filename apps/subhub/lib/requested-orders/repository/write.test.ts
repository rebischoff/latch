import { ConflictError, ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import {
  assertFreeformOrEngineered,
  assertNotFrozen,
  assertWithinRemaining,
  type PriorRequestRow,
} from "./write";

const priorRequest = (overrides: Partial<PriorRequestRow> = {}): PriorRequestRow => ({
  id: "jmr-1",
  job_id: "job-1",
  site_zone_id: null,
  job_line_part_id: null,
  part_id: null,
  description: "Existing request",
  quantity: 1,
  unit: "ea",
  status: "open",
  ...overrides,
});

describe("assertFreeformOrEngineered", () => {
  it("allows an engineered pick (job_line_part_id set)", () => {
    expect(() =>
      assertFreeformOrEngineered({
        id: "l1",
        job_line_part_id: "jlp-1",
      }),
    ).not.toThrow();
  });

  it("allows an ad-hoc request with a description", () => {
    expect(() =>
      assertFreeformOrEngineered({ id: "l1", description: "10ft CAT6" }),
    ).not.toThrow();
  });

  it("allows an ad-hoc request with a part_id", () => {
    expect(() =>
      assertFreeformOrEngineered({ id: "l1", part_id: "part-1" }),
    ).not.toThrow();
  });

  it("rejects an ad-hoc request with neither description nor part_id", () => {
    expect(() => assertFreeformOrEngineered({ id: "l1" })).toThrow(ValidationError);
  });

  it("rejects an ad-hoc request with a blank description", () => {
    expect(() =>
      assertFreeformOrEngineered({ id: "l1", description: "   " }),
    ).toThrow(ValidationError);
  });
});

describe("assertNotFrozen", () => {
  it("allows edits when there is no prior row (new request)", () => {
    expect(() =>
      assertNotFrozen(undefined, {
        id: "l1",
        job_id: "job-1",
        quantity: 2,
      }),
    ).not.toThrow();
  });

  it("allows edits when prior status is open", () => {
    const prior = priorRequest({ status: "open" });
    expect(() =>
      assertNotFrozen(prior, { id: "jmr-1", job_id: "job-1", quantity: 5 }),
    ).not.toThrow();
  });

  it("allows re-sending identical values for a frozen request", () => {
    const prior = priorRequest({
      status: "on_purchase_order",
      quantity: 3,
      description: "Frozen",
      unit: "ea",
    });
    expect(() =>
      assertNotFrozen(prior, {
        id: "jmr-1",
        job_id: "job-1",
        quantity: 3,
        description: "Frozen",
        unit: "ea",
        status: "on_purchase_order",
      }),
    ).not.toThrow();
  });

  it("rejects quantity change when frozen", () => {
    const prior = priorRequest({ status: "fulfilled", quantity: 2 });
    expect(() =>
      assertNotFrozen(prior, { id: "jmr-1", job_id: "job-1", quantity: 5 }),
    ).toThrow(ConflictError);
  });
});

describe("assertWithinRemaining", () => {
  it("allows qty within job-wide remaining after netting own prior coverage", async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("FROM job_line_part jlp")) {
        return { rows: [{ id: "jlp-1", quantity: 10 }] };
      }
      if (sql.includes("to_regclass")) {
        return { rows: [{ exists: true }] };
      }
      if (sql.includes("FROM job_material_request")) {
        return { rows: [{ job_line_part_id: "jlp-1", covered: 4 }] };
      }
      return { rows: [] };
    });
    const client = { query } as unknown as PoolClient;

    await expect(
      assertWithinRemaining(
        client,
        "job-1",
        [priorRequest({ job_line_part_id: "jlp-1", quantity: 2 })],
        [
          {
            id: "jmr-1",
            job_id: "job-1",
            job_line_part_id: "jlp-1",
            quantity: 3,
          },
        ],
      ),
    ).resolves.toBeUndefined();
  });

  it("rejects qty that exceeds remaining", async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("FROM job_line_part jlp")) {
        return { rows: [{ id: "jlp-1", quantity: 5 }] };
      }
      if (sql.includes("to_regclass")) {
        return { rows: [{ exists: true }] };
      }
      if (sql.includes("FROM job_material_request")) {
        return { rows: [{ job_line_part_id: "jlp-1", covered: 4 }] };
      }
      return { rows: [] };
    });
    const client = { query } as unknown as PoolClient;

    await expect(
      assertWithinRemaining(client, "job-1", [], [
        {
          id: "jmr-new",
          job_id: "job-1",
          job_line_part_id: "jlp-1",
          quantity: 3,
        },
      ]),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

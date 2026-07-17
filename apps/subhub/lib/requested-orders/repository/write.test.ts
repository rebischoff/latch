import { ConflictError, ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import {
  assertFreeformOrEngineered,
  assertFrozenLinesNotRemoved,
  assertNotFrozen,
  assertWithdrawalNote,
  assertWithinRemaining,
  loadRequestedOrderDeleteBlockers,
  type PriorLineRow,
} from "./write";

const priorLine = (overrides: Partial<PriorLineRow> = {}): PriorLineRow => ({
  id: "line-1",
  line_number: 1,
  job_line_part_id: null,
  part_id: null,
  description: "Existing line",
  quantity: 1,
  unit: "ea",
  status: "open",
  withdrawal_note: "",
  ...overrides,
});

describe("assertFreeformOrEngineered", () => {
  it("allows an engineered pick (job_line_part_id set)", () => {
    expect(() =>
      assertFreeformOrEngineered({ id: "l1", job_line_part_id: "jlp-1", quantity: 1 }),
    ).not.toThrow();
  });

  it("allows an ad-hoc line with a description", () => {
    expect(() =>
      assertFreeformOrEngineered({ id: "l1", description: "10ft CAT6", quantity: 1 }),
    ).not.toThrow();
  });

  it("allows an ad-hoc line with a part_id", () => {
    expect(() =>
      assertFreeformOrEngineered({ id: "l1", part_id: "part-1", quantity: 1 }),
    ).not.toThrow();
  });

  it("rejects an ad-hoc line with neither description nor part_id", () => {
    expect(() => assertFreeformOrEngineered({ id: "l1", quantity: 1 })).toThrow(
      ValidationError,
    );
  });

  it("rejects an ad-hoc line with a blank description", () => {
    expect(() =>
      assertFreeformOrEngineered({ id: "l1", description: "   ", quantity: 1 }),
    ).toThrow(ValidationError);
  });
});

describe("assertWithdrawalNote", () => {
  it("requires a withdrawal_note when status is withdrawn", () => {
    expect(() =>
      assertWithdrawalNote({ id: "l1", status: "withdrawn", quantity: 1 }),
    ).toThrow(ValidationError);
  });

  it("accepts withdrawn status with a note", () => {
    expect(() =>
      assertWithdrawalNote({
        id: "l1",
        status: "withdrawn",
        withdrawal_note: "Customer cancelled",
        quantity: 1,
      }),
    ).not.toThrow();
  });

  it("does not require a note for open lines", () => {
    expect(() =>
      assertWithdrawalNote({ id: "l1", status: "open", quantity: 1 }),
    ).not.toThrow();
  });
});

describe("assertNotFrozen", () => {
  it("allows edits when there is no prior line (new line)", () => {
    expect(() =>
      assertNotFrozen(undefined, { id: "l1", quantity: 2 }),
    ).not.toThrow();
  });

  it("allows edits when prior status is open", () => {
    const prior = priorLine({ status: "open" });
    expect(() =>
      assertNotFrozen(prior, { id: "line-1", quantity: 5 }),
    ).not.toThrow();
  });

  it("allows re-sending identical values for a frozen line", () => {
    const prior = priorLine({ status: "on_purchase_order", quantity: 3 });
    expect(() =>
      assertNotFrozen(prior, { id: "line-1", quantity: 3 }),
    ).not.toThrow();
  });

  it("rejects quantity changes on a frozen (on_purchase_order) line", () => {
    const prior = priorLine({ status: "on_purchase_order", quantity: 3 });
    expect(() =>
      assertNotFrozen(prior, { id: "line-1", quantity: 10 }),
    ).toThrow(ConflictError);
  });

  it("rejects edits on a fulfilled line", () => {
    const prior = priorLine({ status: "fulfilled", quantity: 3 });
    expect(() =>
      assertNotFrozen(prior, { id: "line-1", quantity: 3, description: "changed" }),
    ).toThrow(ConflictError);
  });
});

describe("assertFrozenLinesNotRemoved", () => {
  it("allows removing open/withdrawn lines", () => {
    const prior = [priorLine({ id: "l1", status: "open" }), priorLine({ id: "l2", status: "withdrawn" })];
    expect(() => assertFrozenLinesNotRemoved(prior, new Set())).not.toThrow();
  });

  it("blocks removing an on_purchase_order line", () => {
    const prior = [priorLine({ id: "l1", status: "on_purchase_order" })];
    expect(() => assertFrozenLinesNotRemoved(prior, new Set())).toThrow(ConflictError);
  });

  it("blocks removing a fulfilled line", () => {
    const prior = [priorLine({ id: "l1", status: "fulfilled" })];
    expect(() => assertFrozenLinesNotRemoved(prior, new Set())).toThrow(ConflictError);
  });

  it("allows keeping a frozen line present in the incoming set", () => {
    const prior = [priorLine({ id: "l1", status: "on_purchase_order" })];
    expect(() =>
      assertFrozenLinesNotRemoved(prior, new Set(["l1"])),
    ).not.toThrow();
  });
});

describe("assertWithinRemaining", () => {
  const makeClient = (demandQty: number, jobWideCovered: number): PoolClient => {
    const query = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes("FROM job_line_part jlp")) {
        return Promise.resolve({ rows: [{ id: "jlp-1", quantity: demandQty }] });
      }
      if (sql.includes("FROM requested_order_line rol")) {
        return Promise.resolve({
          rows: jobWideCovered > 0 ? [{ job_line_part_id: "jlp-1", covered: jobWideCovered }] : [],
        });
      }
      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: false }] });
      }
      return Promise.resolve({ rows: [] });
    });
    return { query } as unknown as PoolClient;
  };

  it("allows a fresh pick within remaining", async () => {
    const client = makeClient(10, 0);
    const normalized = [{ id: "l1", job_line_part_id: "jlp-1", quantity: 5 }];
    await expect(
      assertWithinRemaining(client, "job-1", [], normalized),
    ).resolves.toBeUndefined();
  });

  it("rejects a pick that exceeds job-wide remaining", async () => {
    const client = makeClient(10, 8);
    const normalized = [{ id: "l1", job_line_part_id: "jlp-1", quantity: 5 }];
    await expect(
      assertWithinRemaining(client, "job-1", [], normalized),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("nets out this header's own prior contribution when editing", async () => {
    // demand 10, job-wide covered 8 (all from this same header's prior line of qty 8) ->
    // editing that line up to 10 should be allowed since other headers cover 0.
    const client = makeClient(10, 8);
    const prior = [
      priorLine({ id: "l1", job_line_part_id: "jlp-1", quantity: 8, status: "open" }),
    ];
    const normalized = [{ id: "l1", job_line_part_id: "jlp-1", quantity: 10 }];
    await expect(
      assertWithinRemaining(client, "job-1", prior, normalized),
    ).resolves.toBeUndefined();
  });

  it("rejects unknown job_line_part_id", async () => {
    const client = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    } as unknown as PoolClient;
    const normalized = [{ id: "l1", job_line_part_id: "jlp-missing", quantity: 1 }];
    await expect(
      assertWithinRemaining(client, "job-1", [], normalized),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("no-ops when there are no BOM picks in the payload", async () => {
    const client = { query: vi.fn() } as unknown as PoolClient;
    const normalized = [{ id: "l1", description: "ad hoc", quantity: 1 }];
    await expect(
      assertWithinRemaining(client, "job-1", [], normalized),
    ).resolves.toBeUndefined();
    expect(client.query).not.toHaveBeenCalled();
  });
});

describe("loadRequestedOrderDeleteBlockers", () => {
  it("returns no blockers when the table check short-circuits (defensive tableExists guard)", async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({ rows: [{ exists: false }] }),
    };
    const blockers = await loadRequestedOrderDeleteBlockers(
      pool as unknown as Parameters<typeof loadRequestedOrderDeleteBlockers>[0],
      "ro-1",
    );
    expect(blockers).toEqual([]);
  });

  it("returns blockers for on_purchase_order / fulfilled lines", async () => {
    let call = 0;
    const pool = {
      query: vi.fn().mockImplementation(() => {
        call += 1;
        if (call === 1) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        return Promise.resolve({
          rows: [{ status: "on_purchase_order", count: 2 }],
        });
      }),
    };
    const blockers = await loadRequestedOrderDeleteBlockers(
      pool as unknown as Parameters<typeof loadRequestedOrderDeleteBlockers>[0],
      "ro-1",
    );
    expect(blockers).toEqual([{ status: "on_purchase_order", count: 2 }]);
  });
});

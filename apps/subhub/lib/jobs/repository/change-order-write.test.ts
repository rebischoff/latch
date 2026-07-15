import { ConflictError, isConflictError } from "@latch/contracts";
import { describe, expect, it } from "vitest";

import {
  carryForwardCompletedQty,
  hasCommittedBomStatus,
} from "./change-order-write";

describe("hasCommittedBomStatus", () => {
  it("returns false for open-only BOM", () => {
    expect(hasCommittedBomStatus(["open", "open"])).toBe(false);
  });

  it("blocks when any part is on_purchase_order", () => {
    expect(hasCommittedBomStatus(["open", "on_purchase_order"])).toBe(true);
  });

  it("blocks when any part is received", () => {
    expect(hasCommittedBomStatus(["received"])).toBe(true);
  });
});

describe("carryForwardCompletedQty (C6)", () => {
  it("matches by name and copies completed_qty", () => {
    const updates = carryForwardCompletedQty(
      [
        {
          id: "old-install",
          name: "Install",
          sequence: 1,
          planned_qty: 10,
          completed_qty: 4,
        },
        {
          id: "old-test",
          name: "Test",
          sequence: 2,
          planned_qty: 10,
          completed_qty: 0,
        },
      ],
      [
        { id: "new-install", name: "Install", sequence: 1, planned_qty: 10 },
        { id: "new-test", name: "Test", sequence: 2, planned_qty: 10 },
      ],
    );

    expect(updates).toEqual([
      { id: "new-install", completed_qty: 4 },
      { id: "new-test", completed_qty: 0 },
    ]);
  });

  it("falls back to sequence when names differ", () => {
    const updates = carryForwardCompletedQty(
      [
        {
          id: "old-1",
          name: "Old Install",
          sequence: 1,
          planned_qty: 5,
          completed_qty: 2,
        },
      ],
      [{ id: "new-1", name: "Install", sequence: 1, planned_qty: 5 }],
    );

    expect(updates).toEqual([{ id: "new-1", completed_qty: 2 }]);
  });

  it("scales proportionally when planned_qty changes", () => {
    const updates = carryForwardCompletedQty(
      [
        {
          id: "old-1",
          name: "Install",
          sequence: 1,
          planned_qty: 10,
          completed_qty: 4,
        },
      ],
      [{ id: "new-1", name: "Install", sequence: 1, planned_qty: 20 }],
    );

    expect(updates).toEqual([{ id: "new-1", completed_qty: 8 }]);
  });

  it("caps at new planned_qty", () => {
    const updates = carryForwardCompletedQty(
      [
        {
          id: "old-1",
          name: "Install",
          sequence: 1,
          planned_qty: 10,
          completed_qty: 10,
        },
      ],
      [{ id: "new-1", name: "Install", sequence: 1, planned_qty: 5 }],
    );

    expect(updates).toEqual([{ id: "new-1", completed_qty: 5 }]);
  });
});

describe("bom_committed conflict shape (C5)", () => {
  it("uses structured ConflictError details", () => {
    const error = new ConflictError(
      "Cannot approve change order: BOM already committed on one or more lines",
      {
        field: "change_order",
        code: "bom_committed",
        blocked: [
          {
            change_order_line_id: "col-1",
            target_job_line_id: "jl-1",
            line_action: "deduct",
            reason: "bom_committed",
            bom_statuses: ["on_purchase_order"],
          },
        ],
        warned: [],
      },
    );

    expect(isConflictError(error)).toBe(true);
    expect(error.details).toMatchObject({
      code: "bom_committed",
      field: "change_order",
    });
  });
});

import { ConflictError, isConflictError } from "@latch/contracts";
import { describe, expect, it, vi } from "vitest";

import { assertMaterialUnlockAllowed } from "./job-material-unlock";

const mockClient = (opts: { poTableExists: boolean; onPo: boolean }) => ({
  query: vi.fn(async (sql: string, params?: unknown[]) => {
    if (sql.includes("to_regclass")) {
      const table = String(params?.[0] ?? "");
      const exists =
        opts.poTableExists && table.includes("purchase_order_line");
      return { rows: [{ exists }] };
    }
    if (sql.includes("purchase_order_line")) {
      return { rows: [{ exists: opts.onPo }] };
    }
    return { rows: [] };
  }),
});

describe("assertMaterialUnlockAllowed (JML4)", () => {
  it("no-ops when not unlocking", async () => {
    const client = mockClient({ poTableExists: true, onPo: true });
    await expect(
      assertMaterialUnlockAllowed(client as never, "line-1", true, true),
    ).resolves.toBeUndefined();
    expect(client.query).not.toHaveBeenCalled();
  });

  it("allows unlock when the line is not on a PO", async () => {
    const client = mockClient({ poTableExists: true, onPo: false });
    await expect(
      assertMaterialUnlockAllowed(client as never, "line-1", true, false),
    ).resolves.toBeUndefined();
  });

  it("rejects unlock with part_on_purchase_order when on a PO", async () => {
    const client = mockClient({ poTableExists: true, onPo: true });
    await expect(
      assertMaterialUnlockAllowed(client as never, "line-1", true, false),
    ).rejects.toBeInstanceOf(ConflictError);

    try {
      await assertMaterialUnlockAllowed(client as never, "line-1", true, false);
    } catch (error) {
      expect(isConflictError(error)).toBe(true);
      expect((error as ConflictError).details).toMatchObject({
        code: "part_on_purchase_order",
        job_line_id: "line-1",
      });
    }
  });
});

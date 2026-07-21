import type { Pool } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";

const applyFieldZoneOrdersTx = vi.fn(
  async (_client: unknown, _args: unknown) => ({ createdRequestCount: 0 }),
);
const applyFieldIssuesTx = vi.fn(
  async (_client: unknown, _args: unknown) => ({
    created: 0,
    updated: 0,
    resolved: 0,
    cancelled: 0,
  }),
);
const resolveEmployeePartyIdForPrincipal = vi.fn(
  async (_client: unknown, _actorId: string) => "emp-1",
);
const withPermissionDb = vi.fn(
  async (
    _pool: Pool,
    _actorId: string,
    fn: (client: unknown) => Promise<void>,
  ) => fn({}),
);

vi.mock("@latch/pg-session", () => ({
  withPermissionDb: (
    pool: Pool,
    actorId: string,
    fn: (client: unknown) => Promise<void>,
  ) => withPermissionDb(pool, actorId, fn),
}));

vi.mock("@/lib/requested-orders/repository/employee-resolve", () => ({
  resolveEmployeePartyIdForPrincipal: (
    client: unknown,
    actorId: string,
  ) => resolveEmployeePartyIdForPrincipal(client, actorId),
}));

vi.mock("./job-field-progress-load", () => ({
  buildFieldProgressSlices: vi.fn(),
  loadJobFieldProgress: vi.fn(),
}));

vi.mock("./job-progress-report", () => ({
  appendJobProgressReportIfChangedTx: vi.fn(),
  reportCellWeightKey: vi.fn(),
}));

vi.mock("./job-field-zone-order-write", () => ({
  applyFieldZoneOrdersTx: (
    client: unknown,
    args: unknown,
  ) => applyFieldZoneOrdersTx(client, args),
}));

vi.mock("./job-issue", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./job-issue")>();
  return {
    ...actual,
    applyFieldIssuesTx: (client: unknown, args: unknown) =>
      applyFieldIssuesTx(client, args),
  };
});

describe("applyJobFieldSave batched slices (task 60)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveEmployeePartyIdForPrincipal.mockResolvedValue("emp-1");
    withPermissionDb.mockImplementation(
      async (
        _pool: Pool,
        _actorId: string,
        fn: (client: unknown) => Promise<void>,
      ) => fn({}),
    );
  });

  it("commits issues + zone orders in one withPermissionDb session", async () => {
    const { applyJobFieldSave } = await import("./job-field-progress-write");

    await applyJobFieldSave({} as Pool, "user-1", "job-1", {
      zoneOrders: [{ site_zone_id: "zone-a", ordered: true }],
      issues: [
        {
          op: "create",
          temp_id: "tmp_1",
          site_zone_id: "zone-a",
          description: "Blocked",
        },
      ],
    });

    expect(withPermissionDb).toHaveBeenCalledTimes(1);
    expect(applyFieldZoneOrdersTx).toHaveBeenCalledTimes(1);
    expect(applyFieldIssuesTx).toHaveBeenCalledTimes(1);
    expect(applyFieldIssuesTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        jobId: "job-1",
        patches: [
          expect.objectContaining({ op: "create", description: "Blocked" }),
        ],
      }),
    );
  });
});

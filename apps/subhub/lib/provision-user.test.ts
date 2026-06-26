import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getPool: vi.fn(),
}));

vi.mock("./latch", () => ({
  resolveContextFresh: vi.fn(),
}));

vi.mock("./surfaces/assert-surface-read", () => ({
  assertSurfaceRead: vi.fn(),
}));

vi.mock("./contacts/repository/employee-write", () => ({
  employeePartyHasLens: vi.fn(),
}));

import { employeePartyHasLens } from "./contacts/repository/employee-write";
import { getPool } from "./db";
import { resolveContextFresh } from "./latch";
import {
  loadProvisionPersonState,
  resolveCoveringPersonSurface,
  resolveProvisionPersonState,
} from "./provision-user";

describe("resolveCoveringPersonSurface", () => {
  it("returns employee_detail when party has employee lens", async () => {
    vi.mocked(employeePartyHasLens).mockResolvedValue(true);

    await expect(
      resolveCoveringPersonSurface({} as never, "party-1"),
    ).resolves.toBe("employee_detail");
  });

  it("returns null when no covering lens", async () => {
    vi.mocked(employeePartyHasLens).mockResolvedValue(false);

    await expect(
      resolveCoveringPersonSurface({} as never, "party-1"),
    ).resolves.toBeNull();
  });
});

describe("loadProvisionPersonState", () => {
  it("returns null when party is not a person", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    vi.mocked(getPool).mockReturnValue({ query } as never);

    await expect(loadProvisionPersonState({ query } as never, "party-1")).resolves.toBeNull();
  });

  it("returns provision state for unlinked employee person", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [{ display_name: "Alex Kim", latch_user_id: null }],
      });
    vi.mocked(getPool).mockReturnValue({ query } as never);
    vi.mocked(employeePartyHasLens).mockResolvedValue(true);

    await expect(loadProvisionPersonState({ query } as never, "party-1")).resolves.toEqual({
      partyId: "party-1",
      displayName: "Alex Kim",
      latchUserId: null,
      coveringSurfaceId: "employee_detail",
    });
  });
});

describe("resolveProvisionPersonState", () => {
  it("returns null when linkPartyId is missing", async () => {
    await expect(resolveProvisionPersonState(null)).resolves.toBeNull();
  });

  it("returns null when add_as_db_user is not granted", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{ display_name: "Alex Kim", latch_user_id: null }],
    });
    vi.mocked(getPool).mockReturnValue({ query } as never);
    vi.mocked(employeePartyHasLens).mockResolvedValue(true);
    vi.mocked(resolveContextFresh).mockResolvedValue({
      manifest: { actions: ["read"] },
    } as never);

    await expect(resolveProvisionPersonState("party-1")).resolves.toBeNull();
  });

  it("returns state when person is eligible and action is granted", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{ display_name: "Alex Kim", latch_user_id: null }],
    });
    vi.mocked(getPool).mockReturnValue({ query } as never);
    vi.mocked(employeePartyHasLens).mockResolvedValue(true);
    vi.mocked(resolveContextFresh).mockResolvedValue({
      manifest: { actions: ["read", "add_as_db_user"] },
    } as never);

    await expect(resolveProvisionPersonState("party-1")).resolves.toEqual({
      partyId: "party-1",
      displayName: "Alex Kim",
      latchUserId: null,
      coveringSurfaceId: "employee_detail",
    });
  });
});

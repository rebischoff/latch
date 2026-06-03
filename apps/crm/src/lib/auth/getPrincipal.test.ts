import { afterEach, describe, expect, it, vi } from "vitest";

import { SEED_ADMIN_ID, SEED_TECH_ID } from "../../../db/seed.js";

import { getPrincipal } from "./getPrincipal.js";
import * as providerSession from "./provider-session.js";

vi.mock("./provider-session.js", () => ({
  readProviderSession: vi.fn(),
}));

const readProviderSession = vi.mocked(providerSession.readProviderSession);

describe("getPrincipal", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("loads field_tech roles from DB for tech session", async () => {
    readProviderSession.mockResolvedValue({
      userId: SEED_TECH_ID,
      label: "tech@demo.local",
    });

    await expect(getPrincipal()).resolves.toEqual({
      id: SEED_TECH_ID,
      roles: ["field_tech"],
    });
  });

  it("loads office_admin roles from DB for admin session", async () => {
    readProviderSession.mockResolvedValue({
      userId: SEED_ADMIN_ID,
      label: "admin@demo.local",
    });

    await expect(getPrincipal()).resolves.toEqual({
      id: SEED_ADMIN_ID,
      roles: ["office_admin"],
    });
  });

  it("uses LATCH_STUB_* when no provider session (CI)", async () => {
    readProviderSession.mockResolvedValue(null);
    vi.stubEnv("LATCH_STUB_USER", "stub-user");
    vi.stubEnv("LATCH_STUB_ROLE", "field_tech");

    await expect(getPrincipal()).resolves.toEqual({
      id: "stub-user",
      roles: ["field_tech"],
    });
  });

  it("throws when there is no session and no stub env", async () => {
    readProviderSession.mockResolvedValue(null);

    await expect(getPrincipal()).rejects.toThrow("No session");
  });
});

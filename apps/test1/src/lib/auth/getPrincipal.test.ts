import { afterEach, describe, expect, it, vi } from "vitest";

import { getPrincipal } from "./getPrincipal";
import * as providerSession from "./provider-session";

vi.mock("./provider-session", () => ({
  readProviderSession: vi.fn(),
}));

const readProviderSession = vi.mocked(providerSession.readProviderSession);

describe("getPrincipal", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("returns empty roles for a logged-in session until task 05 loads DB roles", async () => {
    readProviderSession.mockResolvedValue({
      userId: "user-1",
      label: "user@test1.local",
    });

    await expect(getPrincipal()).resolves.toEqual({
      id: "user-1",
      roles: [],
    });
  });

  it("uses LATCH_STUB_* when no provider session (CI) without policyVersion", async () => {
    readProviderSession.mockResolvedValue(null);
    vi.stubEnv("LATCH_STUB_USER", "stub-user");
    vi.stubEnv("LATCH_STUB_ROLE", "field_tech");

    const principal = await getPrincipal();
    expect(principal).toEqual({
      id: "stub-user",
      roles: ["field_tech"],
    });
    expect(principal).not.toHaveProperty("policyVersion");
  });

  it("throws when there is no session and no stub env", async () => {
    readProviderSession.mockResolvedValue(null);

    await expect(getPrincipal()).rejects.toThrow("No session");
  });
});

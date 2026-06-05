import { afterEach, describe, expect, it, vi } from "vitest";

import { SEED_ADMIN_EMAIL, SEED_ADMIN_ID } from "../../../db/seed";

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

  it("loads roles from memory store for a logged-in admin (no DATABASE_URL)", async () => {
    readProviderSession.mockResolvedValue({
      userId: "better-auth-uuid",
      label: "Admin (dev)",
      email: SEED_ADMIN_EMAIL,
    });

    await expect(getPrincipal()).resolves.toEqual({
      id: SEED_ADMIN_ID,
      roles: ["data_master", "iam_master"],
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

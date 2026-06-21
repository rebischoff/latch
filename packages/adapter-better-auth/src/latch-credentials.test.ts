import { describe, expect, it, vi } from "vitest";

import {
  authCredentialLookupKeys,
  toAuthCredentialEmail,
} from "./latch-credential-keys";
import { verifyLatchPassword, hashLatchPassword } from "./latch-password";

describe("latch credential keys", () => {
  it("maps login names to synthetic Better Auth emails", () => {
    expect(toAuthCredentialEmail("Reb")).toBe("reb@latch.local");
    expect(toAuthCredentialEmail("user@example.com")).toBe("user@example.com");
  });

  it("derives latch lookup keys from credential emails", () => {
    expect(authCredentialLookupKeys("reb@latch.local")).toEqual([
      "reb@latch.local",
      "reb",
    ]);
  });
});

describe("latch password", () => {
  it("hashes and verifies passwords", async () => {
    const hash = await hashLatchPassword("secret");
    expect(await verifyLatchPassword(hash, "secret")).toBe(true);
    expect(await verifyLatchPassword(hash, "wrong")).toBe(false);
  });
});

describe("latchCredentialsPlugin", () => {
  it("exports a plugin id", async () => {
    const { latchCredentialsPlugin } = await import(
      "./latch-credentials-plugin"
    );
    const pool = { query: vi.fn() } as never;
    const getAuth = () => ({}) as never;
    expect(latchCredentialsPlugin(pool, getAuth).id).toBe("latch-credentials");
  });
});

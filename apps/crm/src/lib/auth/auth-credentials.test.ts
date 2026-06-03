import { afterEach, describe, expect, it, vi } from "vitest";

import { getDevPassword, lookupUser } from "./users.js";

describe("Auth.js Credentials (dev)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts seed logins with CRM_DEV_PASSWORD", () => {
    vi.stubEnv("CRM_DEV_PASSWORD", "demo");
    const tech = lookupUser("tech@demo.local");
    const admin = lookupUser("admin@demo.local");
    const iam = lookupUser("iam@demo.local");
    expect(tech?.id).toBe("seed-field-tech");
    expect(admin?.id).toBe("seed-office-admin");
    expect(iam?.id).toBe("seed-iam-admin");
    expect(getDevPassword()).toBe("demo");
  });

  it("rejects unknown login", () => {
    expect(lookupUser("nobody@demo.local")).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";

import {
  applyLatchAppRole,
  LATCH_APP_ROLE_PASSWORD_DEFAULT,
  resolveDatabaseEnv,
} from "./resolve-database-env";

const POOLED =
  "postgresql://owner:secret@ep-abc-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require";
const DIRECT =
  "postgresql://owner:secret@ep-abc.us-east-2.aws.neon.tech/neondb?sslmode=require";

describe("resolveDatabaseEnv", () => {
  it("throws when DATABASE_URL is missing", () => {
    expect(() => resolveDatabaseEnv({})).toThrow("DATABASE_URL is not set");
  });

  it("selects pooled runtime vs direct migrate URLs", () => {
    const resolved = resolveDatabaseEnv({
      DATABASE_URL: POOLED,
      DATABASE_URL_DIRECT: DIRECT,
      LATCH_APP_ROLE_PASSWORD: "app-secret",
    });

    expect(resolved.pooledUrl).toBe(POOLED);
    expect(resolved.directUrl).toBe(DIRECT);
    expect(resolved.directConnectionString).toBe(DIRECT);
    expect(resolved.runtimeConnectionString).toBe(
      applyLatchAppRole(POOLED, "app-secret"),
    );
  });

  it("defaults direct URL to DATABASE_URL when DATABASE_URL_DIRECT is omitted", () => {
    const resolved = resolveDatabaseEnv({
      DATABASE_URL: POOLED,
      LATCH_APP_ROLE_PASSWORD: "app-secret",
    });

    expect(resolved.directUrl).toBe(POOLED);
    expect(resolved.directConnectionString).toBe(POOLED);
  });

  it("rejects Neon host with default latch_app password", () => {
    expect(() =>
      resolveDatabaseEnv({
        DATABASE_URL: POOLED,
      }),
    ).toThrow("Neon rejects the default latch_app role password");
  });

  it("allows default password on non-Neon hosts", () => {
    const local =
      "postgresql://owner:secret@localhost:5432/latch?sslmode=disable";

    const resolved = resolveDatabaseEnv({
      DATABASE_URL: local,
    });

    expect(resolved.runtimeConnectionString).toBe(
      applyLatchAppRole(local, LATCH_APP_ROLE_PASSWORD_DEFAULT),
    );
  });
});

describe("applyLatchAppRole", () => {
  it("rewrites username and password", () => {
    const url = applyLatchAppRole(POOLED, "role-pass");

    expect(url).toBe(
      "postgresql://latch_app:role-pass@ep-abc-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require",
    );
  });
});

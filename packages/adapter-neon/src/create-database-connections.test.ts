import { beforeEach, describe, expect, it, vi } from "vitest";

const poolInstances: Array<{ connectionString?: string; end: ReturnType<typeof vi.fn> }> = [];

vi.mock("pg", () => ({
  Pool: vi.fn((config: { connectionString: string }) => {
    const instance = {
      connectionString: config.connectionString,
      end: vi.fn(async () => undefined),
    };
    poolInstances.push(instance);
    return instance;
  }),
}));

import { Pool } from "pg";

import { createDatabaseConnections } from "./create-database-connections";

const POOLED =
  "postgresql://owner:secret@ep-abc-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require";
const DIRECT =
  "postgresql://owner:secret@ep-abc.us-east-2.aws.neon.tech/neondb?sslmode=require";

describe("createDatabaseConnections", () => {
  beforeEach(() => {
    poolInstances.length = 0;
    vi.mocked(Pool).mockClear();
  });

  it("returns pooled runtime and direct pools from env", () => {
    const connections = createDatabaseConnections({
      DATABASE_URL: POOLED,
      DATABASE_URL_DIRECT: DIRECT,
      LATCH_APP_ROLE_PASSWORD: "app-secret",
    });

    expect(Pool).toHaveBeenCalledTimes(2);
    expect(poolInstances[0]?.connectionString).toBe(
      "postgresql://latch_app:app-secret@ep-abc-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require",
    );
    expect(poolInstances[1]?.connectionString).toBe(DIRECT);
    expect(connections.pool).toBe(poolInstances[0]);
    expect(connections.directPool).toBe(poolInstances[1]);
  });
});

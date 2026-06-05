import { describe, expect, it } from "vitest";

import { MemoryUserStore } from "./memory-store";
import {
  SEED_ADMIN_EMAIL,
  SEED_ADMIN_ID,
  seedTest1Users,
} from "./seed";

describe("seedTest1Users", () => {
  it("seeds admin with iam_master and data_master", () => {
    const store = new MemoryUserStore();
    seedTest1Users(store);

    expect(store.resolveUserIdByEmail(SEED_ADMIN_EMAIL)).toBe(SEED_ADMIN_ID);
    expect(store.listRolesForUser(SEED_ADMIN_ID)).toEqual([
      "iam_master",
      "data_master",
    ]);
  });
});

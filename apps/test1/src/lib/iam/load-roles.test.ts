import { describe, expect, it } from "vitest";

import { MemoryUserStore } from "../../../db/memory-store";
import { seedTest1Users, SEED_ADMIN_ID } from "../../../db/seed";

import { loadRolesForUser } from "./load-roles";

describe("loadRolesForUser", () => {
  it("returns seeded admin roles from memory store", async () => {
    const store = new MemoryUserStore();
    seedTest1Users(store);

    await expect(loadRolesForUser(SEED_ADMIN_ID, store)).resolves.toEqual([
      "data_master",
      "iam_master",
    ]);
  });

  it("returns empty array when user has no assignments", async () => {
    const store = new MemoryUserStore();
    seedTest1Users(store);

    await expect(loadRolesForUser("missing", store)).resolves.toEqual([]);
  });
});

import { describe, expect, it } from "vitest";

import type { Principal } from "@latch/contracts";
import { PolicyService } from "@latch/policy";

import { MemoryJobStore } from "../../../db/memory-store.js";
import { jobPolicyRegistry } from "../policy/registry.js";
import { loadRolesForUser } from "./load-roles.js";

const principal = (roles: string[]): Principal => ({
  id: "multi-role-user",
  roles,
});

describe("loadRolesForUser", () => {
  it("returns sorted role ids from the store", async () => {
    const store = new MemoryJobStore();
    store.setUserRoles("user-a", ["office_admin", "field_tech"]);

    await expect(loadRolesForUser("user-a", store)).resolves.toEqual([
      "field_tech",
      "office_admin",
    ]);
  });

  it("returns [] when the user has no role rows", async () => {
    const store = new MemoryJobStore();

    await expect(loadRolesForUser("missing", store)).resolves.toEqual([]);
  });
});

describe("loadRolesForUser — union_grants via PolicyService", () => {
  const policy = new PolicyService({ registry: jobPolicyRegistry });

  it("two DB roles produce a manifest wider than either role alone", async () => {
    const store = new MemoryJobStore();
    const userId = "union-user";
    store.setUserRoles(userId, ["field_tech", "office_admin"]);

    const roles = await loadRolesForUser(userId, store);
    const techOnly = policy.resolve(principal(["field_tech"]), {
      surface: "job_detail",
    });
    const adminOnly = policy.resolve(principal(["office_admin"]), {
      surface: "job_detail",
    });
    const combined = policy.resolve(principal(roles), {
      surface: "job_detail",
    });

    expect(roles).toHaveLength(2);
    expect(techOnly.rowScope).toBe("own");
    expect(adminOnly.rowScope).toBe("all");
    expect(combined.rowScope).toBe("all");
    expect(combined.fields.summary).toEqual(techOnly.fields.summary);
    expect(combined.fields.assignments).toContain("write");
    expect(techOnly.fields.assignments).not.toContain("write");
    expect(combined.actions).toEqual(
      expect.arrayContaining(["delete", "restore"]),
    );
    expect(adminOnly.actions).toEqual(
      expect.arrayContaining(["delete", "restore"]),
    );
    expect(techOnly.actions).not.toContain("delete");
  });

  it("field_tech + office_admin unions customer_detail grants (tech alone has none)", async () => {
    const store = new MemoryJobStore();
    const userId = "union-customer-user";
    store.setUserRoles(userId, ["field_tech", "office_admin"]);

    const roles = await loadRolesForUser(userId, store);
    const techCustomer = policy.resolve(principal(["field_tech"]), {
      surface: "customer_detail",
      mode: "detail",
    });
    const combinedCustomer = policy.resolve(principal(roles), {
      surface: "customer_detail",
      mode: "detail",
    });

    expect(techCustomer.fields.profile).toEqual([]);
    expect(combinedCustomer.fields.profile).toEqual(["read", "write"]);
    expect(combinedCustomer.fields.billing).toEqual(["read", "write"]);
  });
});

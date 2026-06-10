import { describe, expect, it } from "vitest";

import {
  principalHoldsRole,
  principalRoleIds,
  principalWithRoles,
} from "./principal.js";

describe("principal helpers", () => {
  it("principalWithRoles builds company-wide bindings", () => {
    expect(principalWithRoles("u1", ["r1", "r2"])).toEqual({
      id: "u1",
      bindings: [
        { roleId: "r1", scopeId: null },
        { roleId: "r2", scopeId: null },
      ],
    });
  });

  it("principalRoleIds dedupes role ids", () => {
    const principal = {
      id: "u1",
      bindings: [
        { roleId: "r1", scopeId: "s1" },
        { roleId: "r1", scopeId: "s2" },
        { roleId: "r2", scopeId: null },
      ],
    };
    expect(principalRoleIds(principal)).toEqual(["r1", "r2"]);
  });

  it("principalHoldsRole matches any scoped binding", () => {
    const principal = principalWithRoles("u1", ["r1"]);
    expect(principalHoldsRole(principal, "r1")).toBe(true);
    expect(principalHoldsRole(principal, "r2")).toBe(false);
  });
});

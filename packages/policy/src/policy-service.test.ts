import { describe, expect, it } from "vitest";

import type { Principal } from "@latch/contracts";

import { unionGrants, mergeRowScope } from "./merge.js";
import {
  DATA_MASTER_ROLE_ID,
  PolicyService,
  synthesizeDataMasterBinding,
} from "./policy-service.js";
import { definePolicyRegistry, defineSurfacePolicy } from "./registry.js";

const principal = (...roles: string[]): Principal => ({ id: "user-1", roles });

describe("merge helpers", () => {
  it("mergeRowScope: all wins over own", () => {
    expect(mergeRowScope(["own", "all"])).toBe("all");
    expect(mergeRowScope(["own", undefined])).toBe("own");
  });

  it("unionGrants: denyWins strips denied actions", () => {
    const fields = unionGrants(
      [
        { field: "financial_terms", actions: ["read", "write"], effect: "deny" },
        { field: "financial_terms", actions: ["read"] },
      ],
      { denyWins: true },
    );
    expect(fields.financial_terms).toEqual([]);
  });
});

const fixtureRegistry = definePolicyRegistry(
  defineSurfacePolicy(
    {
      surface: "alpha",
      roles: {
        role_a: {
          rowScope: "own",
          fields: [
            { field: "foo", actions: ["read", "write"] },
            {
              field: "bar",
              actions: ["read", "write"],
              effect: "deny",
            },
          ],
        },
        role_b: {
          rowScope: "all",
          fields: [{ field: "foo", actions: ["read"] }],
        },
      },
    },
    {
      fieldIds: ["foo", "bar"],
      surfaceActionsByRole: {
        role_a: ["read"],
        role_b: ["read", "delete"],
      },
      kind: "business",
    },
  ),
  defineSurfacePolicy(
    {
      surface: "beta",
      roles: {
        viewer: {
          fields: [{ field: "qux", actions: ["read"] }],
        },
      },
    },
    {
      fieldIds: ["qux"],
      surfaceActionsByRole: {
        viewer: ["read"],
      },
      kind: "business",
    },
  ),
  defineSurfacePolicy(
    {
      surface: "iam_console",
      roles: {
        iam_master: {
          rowScope: "all",
          fields: [{ field: "assignments", actions: ["read", "write"] }],
        },
      },
    },
    {
      fieldIds: ["assignments"],
      surfaceActionsByRole: {
        iam_master: ["read", "write"],
      },
      kind: "iam",
    },
  ),
);

const throwawayBusinessSurface = defineSurfacePolicy(
  {
    surface: "throwaway_widget",
    roles: {
      viewer: {
        fields: [{ field: "widget_name", actions: ["read"] }],
      },
    },
  },
  {
    fieldIds: ["widget_name"],
    surfaceActionsByRole: {
      viewer: ["read"],
    },
    kind: "business",
  },
);

describe("PolicyService — fixture registry (domain-free)", () => {
  const policy = new PolicyService({ registry: fixtureRegistry });

  it("alpha / role_a: denyWins strips bar read/write", () => {
    const manifest = policy.resolve(principal("role_a"), {
      surface: "alpha",
    });

    expect(manifest.surface).toBe("alpha");
    expect(manifest.rowScope).toBe("own");
    expect(manifest.fields.foo).toEqual(["read", "write"]);
    expect(manifest.fields.bar).toEqual([]);
    expect(manifest.actions).toEqual(["read"]);
  });

  it("alpha / multi-role: all rowScope wins; surface actions union", () => {
    const manifest = policy.resolve(principal("role_a", "role_b"), {
      surface: "alpha",
    });

    expect(manifest.rowScope).toBe("all");
    expect(manifest.fields.foo).toEqual(["read", "write"]);
    expect(manifest.actions).toEqual(["read", "delete"]);
  });

  it("beta / viewer: minimal surface resolves", () => {
    const manifest = policy.resolve(principal("viewer"), {
      surface: "beta",
    });

    expect(manifest.fields.qux).toEqual(["read"]);
    expect(manifest.actions).toEqual(["read"]);
    expect(manifest.rowScope).toBeUndefined();
  });

  it("unknown surface throws", () => {
    expect(() =>
      policy.resolve(principal("role_a"), { surface: "gamma" }),
    ).toThrow(/Unknown surface/);
  });
});

describe("PolicyService — data_master built-in", () => {
  it("synthesizeDataMasterBinding: read/write on all field ids", () => {
    const surfaceDef = throwawayBusinessSurface;
    const binding = synthesizeDataMasterBinding(surfaceDef);

    expect(binding.rowScope).toBe("all");
    expect(binding.fields).toEqual([
      { field: "widget_name", actions: ["read", "write"] },
    ]);
    expect(binding.surfaceActions).toEqual(["read", "write"]);
  });

  it("data_master on business surface without per-role YAML entry", () => {
    const registry = definePolicyRegistry(throwawayBusinessSurface);
    const policy = new PolicyService({ registry });

    const manifest = policy.resolve(principal(DATA_MASTER_ROLE_ID), {
      surface: "throwaway_widget",
    });

    expect(manifest.rowScope).toBe("all");
    expect(manifest.fields.widget_name).toEqual(["read", "write"]);
    expect(manifest.actions).toEqual(["read", "write"]);
  });

  it("data_master on fixture alpha: read/write all fields", () => {
    const policy = new PolicyService({ registry: fixtureRegistry });

    const manifest = policy.resolve(principal(DATA_MASTER_ROLE_ID), {
      surface: "alpha",
    });

    expect(manifest.rowScope).toBe("all");
    expect(manifest.fields.foo).toEqual(["read", "write"]);
    expect(manifest.fields.bar).toEqual(["read", "write"]);
    expect(manifest.actions).toEqual(["read", "write"]);
  });

  it("data_master does not gain IAM surface write", () => {
    const policy = new PolicyService({ registry: fixtureRegistry });

    const manifest = policy.resolve(principal(DATA_MASTER_ROLE_ID), {
      surface: "iam_console",
    });

    expect(manifest.fields.assignments).toEqual([]);
    expect(manifest.actions).toEqual([]);
    expect(manifest.rowScope).toBeUndefined();
  });

  it("iam_master on IAM surface: role_assignments write equivalent", () => {
    const policy = new PolicyService({ registry: fixtureRegistry });

    const manifest = policy.resolve(principal("iam_master"), {
      surface: "iam_console",
    });

    expect(manifest.rowScope).toBe("all");
    expect(manifest.fields.assignments).toEqual(["read", "write"]);
    expect(manifest.actions).toEqual(["read", "write"]);
  });

  it("denyWins: explicit deny on a field blocks data_master read/write", () => {
    const registry = definePolicyRegistry(
      defineSurfacePolicy(
        {
          surface: "locked",
          roles: {
            locker: {
              fields: [
                {
                  field: "secret",
                  actions: ["read", "write"],
                  effect: "deny",
                },
              ],
            },
          },
        },
        {
          fieldIds: ["secret"],
          surfaceActionsByRole: { locker: [] },
          kind: "business",
        },
      ),
    );
    const policy = new PolicyService({ registry });

    const manifest = policy.resolve(
      principal(DATA_MASTER_ROLE_ID, "locker"),
      { surface: "locked" },
    );

    expect(manifest.fields.secret).toEqual([]);
  });
});

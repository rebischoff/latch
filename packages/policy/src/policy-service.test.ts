import { describe, expect, it } from "vitest";

import type { Principal } from "@latch/contracts";

import { createMemoryRoleGrantProvider } from "./grant-provider.js";
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

const fixtureGrantProvider = createMemoryRoleGrantProvider({
  alpha: {
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
      surfaceActions: ["read"],
    },
    role_b: {
      rowScope: "all",
      fields: [{ field: "foo", actions: ["read"] }],
      surfaceActions: ["read", "delete"],
    },
  },
  beta: {
    viewer: {
      fields: [{ field: "qux", actions: ["read"] }],
      surfaceActions: ["read"],
    },
  },
  iam_console: {
    iam_master: {
      rowScope: "all",
      fields: [{ field: "assignments", actions: ["read", "write"] }],
      surfaceActions: ["read", "write"],
    },
  },
});

const fixtureRegistry = definePolicyRegistry(
  defineSurfacePolicy({
    surface: "alpha",
    fieldIds: ["foo", "bar"],
    fieldActions: ["read", "write"],
    surfaceActions: ["read", "delete"],
    kind: "business",
  }),
  defineSurfacePolicy({
    surface: "beta",
    fieldIds: ["qux"],
    fieldActions: ["read"],
    surfaceActions: ["read"],
    kind: "business",
  }),
  defineSurfacePolicy({
    surface: "iam_console",
    fieldIds: ["assignments"],
    fieldActions: ["read", "write"],
    surfaceActions: ["read", "write"],
    kind: "iam",
  }),
);

const throwawayBusinessSurface = defineSurfacePolicy({
  surface: "throwaway_widget",
  fieldIds: ["widget_name"],
  fieldActions: ["read", "write"],
  surfaceActions: ["read"],
  kind: "business",
});

const throwawayGrantProvider = createMemoryRoleGrantProvider({
  throwaway_widget: {
    viewer: {
      fields: [{ field: "widget_name", actions: ["read"] }],
      surfaceActions: ["read"],
    },
  },
});

describe("PolicyService — fixture registry (domain-free)", () => {
  const policy = new PolicyService({
    registry: fixtureRegistry,
    grantProvider: fixtureGrantProvider,
  });

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
    const binding = synthesizeDataMasterBinding(throwawayBusinessSurface);

    expect(binding.rowScope).toBe("all");
    expect(binding.fields).toEqual([
      { field: "widget_name", actions: ["read", "write"] },
    ]);
    expect(binding.surfaceActions).toEqual(["read", "write"]);
  });

  it("data_master on business surface without per-role grant entry", () => {
    const registry = definePolicyRegistry(throwawayBusinessSurface);
    const policy = new PolicyService({
      registry,
      grantProvider: throwawayGrantProvider,
    });

    const manifest = policy.resolve(principal(DATA_MASTER_ROLE_ID), {
      surface: "throwaway_widget",
    });

    expect(manifest.rowScope).toBe("all");
    expect(manifest.fields.widget_name).toEqual(["read", "write"]);
    expect(manifest.actions).toEqual(["read", "write"]);
  });

  it("data_master on fixture alpha: read/write all fields", () => {
    const policy = new PolicyService({
      registry: fixtureRegistry,
      grantProvider: fixtureGrantProvider,
    });

    const manifest = policy.resolve(principal(DATA_MASTER_ROLE_ID), {
      surface: "alpha",
    });

    expect(manifest.rowScope).toBe("all");
    expect(manifest.fields.foo).toEqual(["read", "write"]);
    expect(manifest.fields.bar).toEqual(["read", "write"]);
    expect(manifest.actions).toEqual(["read", "write"]);
  });

  it("data_master does not gain IAM surface write", () => {
    const policy = new PolicyService({
      registry: fixtureRegistry,
      grantProvider: fixtureGrantProvider,
    });

    const manifest = policy.resolve(principal(DATA_MASTER_ROLE_ID), {
      surface: "iam_console",
    });

    expect(manifest.fields.assignments).toEqual([]);
    expect(manifest.actions).toEqual([]);
    expect(manifest.rowScope).toBeUndefined();
  });

  it("iam_master on IAM surface: role_assignments write equivalent", () => {
    const policy = new PolicyService({
      registry: fixtureRegistry,
      grantProvider: fixtureGrantProvider,
    });

    const manifest = policy.resolve(principal("iam_master"), {
      surface: "iam_console",
    });

    expect(manifest.rowScope).toBe("all");
    expect(manifest.fields.assignments).toEqual(["read", "write"]);
    expect(manifest.actions).toEqual(["read", "write"]);
  });

  it("denyWins: explicit deny on a field blocks data_master read/write", () => {
    const registry = definePolicyRegistry(
      defineSurfacePolicy({
        surface: "locked",
        fieldIds: ["secret"],
        fieldActions: ["read", "write"],
        surfaceActions: [],
        kind: "business",
      }),
    );
    const grantProvider = createMemoryRoleGrantProvider({
      locked: {
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
    });
    const policy = new PolicyService({ registry, grantProvider });

    const manifest = policy.resolve(
      principal(DATA_MASTER_ROLE_ID, "locker"),
      { surface: "locked" },
    );

    expect(manifest.fields.secret).toEqual([]);
  });
});

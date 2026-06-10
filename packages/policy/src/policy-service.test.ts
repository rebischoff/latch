import { describe, expect, it } from "vitest";

import { principalWithRoles, type Principal } from "@latch/contracts";

import { createMemoryRoleGrantProvider } from "./grant-provider.js";
import { unionGrants, mergeRowScope } from "./merge.js";
import {
  PolicyService,
  synthesizeDataMasterBinding,
  synthesizeIamMasterBinding,
} from "./policy-service.js";
import { definePolicyRegistry, defineSurfacePolicy } from "./registry.js";

const principal = (...roles: string[]): Principal =>
  principalWithRoles("user-1", roles);

// System rows carry DB-generated UUIDs; `role_class` (via roleClasses) identifies
// them, not the id value — so any UUID works here. See P11.
const SYSTEM_DATA_ID = "11111111-1111-4111-8111-111111111111";
const SYSTEM_IAM_ID = "22222222-2222-4222-8222-222222222222";

/** Principal holding the given system class(es), tagged via `roleClasses`. */
const systemPrincipal = (
  ...classes: Array<"system_data" | "system_iam">
): Principal => {
  const idByClass = {
    system_data: SYSTEM_DATA_ID,
    system_iam: SYSTEM_IAM_ID,
  } as const;
  const roles = classes.map((c) => idByClass[c]);
  return principalWithRoles("user-1", roles, {
    roleClasses: Object.fromEntries(classes.map((c) => [idByClass[c], c])),
  });
};

describe("merge helpers", () => {
  it("mergeRowScope: all beats scope beats own", () => {
    expect(mergeRowScope(["own", "all"])).toBe("all");
    expect(mergeRowScope(["own", "scope"])).toBe("scope");
    expect(mergeRowScope(["scope", "all"])).toBe("all");
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

const throwawayIamSurface = defineSurfacePolicy({
  surface: "throwaway_iam",
  fieldIds: ["role_assignments"],
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write"],
  kind: "iam",
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

describe("PolicyService — system_data synthesis", () => {
  it("synthesizeDataMasterBinding: read/write on all field ids", () => {
    const binding = synthesizeDataMasterBinding(throwawayBusinessSurface);

    expect(binding.rowScope).toBe("all");
    expect(binding.fields).toEqual([
      { field: "widget_name", actions: ["read", "write"] },
    ]);
    expect(binding.surfaceActions).toEqual(["read", "write"]);
  });

  it("system_data UUID on business surface without per-role grant entry", () => {
    const registry = definePolicyRegistry(throwawayBusinessSurface);
    const policy = new PolicyService({
      registry,
      grantProvider: throwawayGrantProvider,
    });

    const manifest = policy.resolve(systemPrincipal("system_data"), {
      surface: "throwaway_widget",
    });

    expect(manifest.rowScope).toBe("all");
    expect(manifest.fields.widget_name).toEqual(["read", "write"]);
    expect(manifest.actions).toEqual(["read", "write"]);
  });

  it("system_data UUID on fixture alpha: read/write all fields", () => {
    const policy = new PolicyService({
      registry: fixtureRegistry,
      grantProvider: fixtureGrantProvider,
    });

    const manifest = policy.resolve(systemPrincipal("system_data"), {
      surface: "alpha",
    });

    expect(manifest.rowScope).toBe("all");
    expect(manifest.fields.foo).toEqual(["read", "write"]);
    expect(manifest.fields.bar).toEqual(["read", "write"]);
    expect(manifest.actions).toEqual(["read", "write"]);
  });

  it("system_data UUID does not gain IAM surface write", () => {
    const policy = new PolicyService({
      registry: fixtureRegistry,
      grantProvider: fixtureGrantProvider,
    });

    const manifest = policy.resolve(systemPrincipal("system_data"), {
      surface: "iam_console",
    });

    expect(manifest.fields.assignments).toEqual([]);
    expect(manifest.actions).toEqual([]);
    expect(manifest.rowScope).toBeUndefined();
  });

  it("denyWins: explicit deny on a field blocks system_data read/write", () => {
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
      principalWithRoles("user-1", [SYSTEM_DATA_ID, "locker"], {
        roleClasses: { [SYSTEM_DATA_ID]: "system_data" },
      }),
      { surface: "locked" },
    );

    expect(manifest.fields.secret).toEqual([]);
  });
});

describe("PolicyService — system_iam synthesis", () => {
  it("synthesizeIamMasterBinding: read/write on all field ids", () => {
    const binding = synthesizeIamMasterBinding(throwawayIamSurface);

    expect(binding.rowScope).toBe("all");
    expect(binding.fields).toEqual([
      { field: "role_assignments", actions: ["read", "write"] },
    ]);
    expect(binding.surfaceActions).toEqual(["read", "write"]);
  });

  it("system_iam UUID on IAM surface without per-role grant entry", () => {
    const registry = definePolicyRegistry(throwawayIamSurface);
    const policy = new PolicyService({
      registry,
      grantProvider: throwawayGrantProvider,
    });

    const manifest = policy.resolve(systemPrincipal("system_iam"), {
      surface: "throwaway_iam",
    });

    expect(manifest.rowScope).toBe("all");
    expect(manifest.fields.role_assignments).toEqual(["read", "write"]);
    expect(manifest.actions).toEqual(["read", "write"]);
  });

  it("system_iam UUID on fixture iam_console: read/write all fields", () => {
    const policy = new PolicyService({
      registry: fixtureRegistry,
      grantProvider: fixtureGrantProvider,
    });

    const manifest = policy.resolve(systemPrincipal("system_iam"), {
      surface: "iam_console",
    });

    expect(manifest.rowScope).toBe("all");
    expect(manifest.fields.assignments).toEqual(["read", "write"]);
    expect(manifest.actions).toEqual(["read", "write"]);
  });

  it("system_iam UUID does not gain business surface write", () => {
    const policy = new PolicyService({
      registry: fixtureRegistry,
      grantProvider: fixtureGrantProvider,
    });

    const manifest = policy.resolve(systemPrincipal("system_iam"), {
      surface: "alpha",
    });

    expect(manifest.fields.foo).toEqual([]);
    expect(manifest.fields.bar).toEqual([]);
    expect(manifest.actions).toEqual([]);
    expect(manifest.rowScope).toBeUndefined();
  });
});

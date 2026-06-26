import { describe, expect, it } from "vitest";

import {
  principalWithRoles,
  type Principal,
  type RoleBinding,
} from "@latch/contracts";

import { createMemoryRoleGrantProvider } from "./grant-provider";
import { unionGrants, mergeRowScope } from "./merge";
import {
  PolicyService,
  synthesizeDataMasterBinding,
  synthesizeIamMasterBinding,
} from "./policy-service";
import { definePolicyRegistry, defineSurfacePolicy } from "./registry";

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
    expect(binding.surfaceActions).toEqual(["read", "write", "delete"]);
  });

  it("synthesizeDataMasterBinding: includes custom surfaceActions from registry", () => {
    const surface = defineSurfacePolicy({
      surface: "employee_detail",
      fieldIds: ["profile", "emails"],
      fieldActions: ["read", "write"],
      surfaceActions: ["read", "write", "delete", "add_as_db_user"],
      kind: "business",
    });

    const binding = synthesizeDataMasterBinding(surface);

    expect(binding.surfaceActions).toEqual([
      "read",
      "write",
      "delete",
      "add_as_db_user",
    ]);
  });

  it("system_data UUID on business surface with custom action in manifest", () => {
    const registry = definePolicyRegistry(
      defineSurfacePolicy({
        surface: "employee_detail",
        fieldIds: ["profile"],
        fieldActions: ["read", "write"],
        surfaceActions: ["read", "write", "delete", "add_as_db_user"],
        kind: "business",
      }),
    );
    const policy = new PolicyService({ registry });

    const manifest = policy.resolve(systemPrincipal("system_data"), {
      surface: "employee_detail",
    });

    expect(manifest.actions).toContain("add_as_db_user");
    expect(manifest.actions).toEqual([
      "read",
      "write",
      "delete",
      "add_as_db_user",
    ]);
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
    expect(manifest.actions).toEqual(["read", "write", "delete"]);
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
    expect(manifest.actions).toEqual(["read", "write", "delete"]);
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

const ROLE_SCOPE = "role_scope_mgr";
const ROLE_SCOPE_B = "role_scope_b";
const ROLE_OWN = "role_own";
const ROLE_ALL = "role_all";
const SCOPE_S1 = "scope-s1";
const SCOPE_S2 = "scope-s2";

const principalWithBindings = (
  bindings: RoleBinding[],
  extras?: Pick<Principal, "roleClasses">,
): Principal => ({
  id: "user-1",
  bindings,
  ...extras,
});

const scopedWidgetSurface = defineSurfacePolicy({
  surface: "scoped_widget",
  fieldIds: ["widget_name"],
  fieldActions: ["read", "write"],
  surfaceActions: ["read"],
  kind: "business",
});

const scopedIamSurface = defineSurfacePolicy({
  surface: "scoped_iam",
  fieldIds: ["assignments"],
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write"],
  kind: "iam",
});

const scopedGrantProvider = createMemoryRoleGrantProvider({
  scoped_widget: {
    [ROLE_SCOPE]: {
      rowScope: "scope",
      fields: [{ field: "widget_name", actions: ["read", "write"] }],
      surfaceActions: ["read"],
    },
    [ROLE_SCOPE_B]: {
      rowScope: "scope",
      fields: [{ field: "widget_name", actions: ["read"] }],
      surfaceActions: ["read"],
    },
    [ROLE_OWN]: {
      rowScope: "own",
      fields: [{ field: "widget_name", actions: ["read"] }],
      surfaceActions: ["read"],
    },
    [ROLE_ALL]: {
      rowScope: "all",
      fields: [{ field: "widget_name", actions: ["read", "write"] }],
      surfaceActions: ["read"],
    },
  },
});

const scopedRegistry = definePolicyRegistry(
  scopedWidgetSurface,
  scopedIamSurface,
);

describe("scopeIds resolve", () => {
  const policy = new PolicyService({
    registry: scopedRegistry,
    grantProvider: scopedGrantProvider,
  });

  it("6a: single scoped binding → one scopeId", () => {
    const manifest = policy.resolve(
      principalWithBindings([
        { roleId: ROLE_SCOPE, scopeId: SCOPE_S1 },
      ]),
      { surface: "scoped_widget" },
    );

    expect(manifest.rowScope).toBe("scope");
    expect(manifest.scopeIds).toEqual([SCOPE_S1]);
  });

  it("6b: two bindings same role → union of scope ids", () => {
    const manifest = policy.resolve(
      principalWithBindings([
        { roleId: ROLE_SCOPE, scopeId: SCOPE_S1 },
        { roleId: ROLE_SCOPE, scopeId: SCOPE_S2 },
      ]),
      { surface: "scoped_widget" },
    );

    expect(manifest.rowScope).toBe("scope");
    expect(manifest.scopeIds).toEqual([SCOPE_S1, SCOPE_S2]);
  });

  it("6c: scope + all roles → all wins, scopeIds omitted", () => {
    const manifest = policy.resolve(
      principalWithBindings([
        { roleId: ROLE_SCOPE, scopeId: SCOPE_S1 },
        { roleId: ROLE_ALL, scopeId: null },
      ]),
      { surface: "scoped_widget" },
    );

    expect(manifest.rowScope).toBe("all");
    expect(manifest.scopeIds).toBeUndefined();
  });

  it("6d: scope + own roles → scope wins, scopeIds from scope role only", () => {
    const manifest = policy.resolve(
      principalWithBindings([
        { roleId: ROLE_SCOPE, scopeId: SCOPE_S1 },
        { roleId: ROLE_OWN, scopeId: SCOPE_S2 },
      ]),
      { surface: "scoped_widget" },
    );

    expect(manifest.rowScope).toBe("scope");
    expect(manifest.scopeIds).toEqual([SCOPE_S1]);
  });

  it("6e: scope grant with null scopeId binding → empty scopeIds", () => {
    const manifest = policy.resolve(
      principalWithBindings([{ roleId: ROLE_SCOPE, scopeId: null }]),
      { surface: "scoped_widget" },
    );

    expect(manifest.rowScope).toBe("scope");
    expect(manifest.scopeIds).toEqual([]);
  });

  it("6f: system_data on business surface → all, scopeIds omitted", () => {
    const manifest = policy.resolve(
      principalWithBindings(
        [{ roleId: SYSTEM_DATA_ID, scopeId: SCOPE_S1 }],
        { roleClasses: { [SYSTEM_DATA_ID]: "system_data" } },
      ),
      { surface: "scoped_widget" },
    );

    expect(manifest.rowScope).toBe("all");
    expect(manifest.scopeIds).toBeUndefined();
  });

  it("6g: system_iam on IAM surface → all, scopeIds omitted", () => {
    const manifest = policy.resolve(
      principalWithBindings(
        [{ roleId: SYSTEM_IAM_ID, scopeId: null }],
        { roleClasses: { [SYSTEM_IAM_ID]: "system_iam" } },
      ),
      { surface: "scoped_iam" },
    );

    expect(manifest.rowScope).toBe("all");
    expect(manifest.scopeIds).toBeUndefined();
  });

  it("6h: two scope-rung roles → union across roles", () => {
    const manifest = policy.resolve(
      principalWithBindings([
        { roleId: ROLE_SCOPE, scopeId: SCOPE_S1 },
        { roleId: ROLE_SCOPE_B, scopeId: SCOPE_S2 },
      ]),
      { surface: "scoped_widget" },
    );

    expect(manifest.rowScope).toBe("scope");
    expect(manifest.scopeIds).toEqual([SCOPE_S1, SCOPE_S2]);
  });

  it("6i: system_data + scope role → all wins, scopeIds omitted", () => {
    const manifest = policy.resolve(
      principalWithBindings(
        [
          { roleId: SYSTEM_DATA_ID, scopeId: null },
          { roleId: ROLE_SCOPE, scopeId: SCOPE_S1 },
        ],
        { roleClasses: { [SYSTEM_DATA_ID]: "system_data" } },
      ),
      { surface: "scoped_widget" },
    );

    expect(manifest.rowScope).toBe("all");
    expect(manifest.scopeIds).toBeUndefined();
  });

  it("6j: own-only role binding with scopeId → own, scopeIds omitted", () => {
    const manifest = policy.resolve(
      principalWithBindings([{ roleId: ROLE_OWN, scopeId: SCOPE_S1 }]),
      { surface: "scoped_widget" },
    );

    expect(manifest.rowScope).toBe("own");
    expect(manifest.scopeIds).toBeUndefined();
  });
});

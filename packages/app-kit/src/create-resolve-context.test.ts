import { afterEach, describe, expect, it, vi } from "vitest";

import { principalWithRoles } from "@latch/contracts";
import {
  createMemoryRoleGrantProvider,
  definePolicyRegistry,
  defineSurfacePolicy,
  PolicyService,
} from "@latch/policy";

import {
  createResolveContext,
  runWithManifestRequestScope,
} from "./index.js";

const registry = definePolicyRegistry(
  defineSurfacePolicy({
    surface: "widget_detail",
    fieldIds: ["label", "status"],
    fieldActions: ["read", "write"],
    surfaceActions: ["read", "write"],
    kind: "business",
  }),
);

const grantProvider = createMemoryRoleGrantProvider({
  widget_detail: {
    widget_reader: {
      fields: [
        { field: "label", actions: ["read"] },
        { field: "status", actions: ["read"] },
      ],
      surfaceActions: ["read"],
    },
  },
});

const policyService = new PolicyService({ registry, grantProvider });

type WidgetResolveInput = { surfaceId: string; entityId: string };

describe("createResolveContext", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns PermissionContext with principal, manifest, and surface", async () => {
    const getPrincipal = vi.fn(async () =>
      principalWithRoles("user-1", ["widget_reader"]),
    );

    const { resolveContext } = createResolveContext<WidgetResolveInput>({
      getPrincipal,
      policyService,
      scopeFromInput: (input) => ({
        surface: input.surfaceId,
        entityId: input.entityId,
        mode: "detail",
      }),
      surfaceFromInput: (input) => input.surfaceId,
    });

    const ctx = await runWithManifestRequestScope(() =>
      resolveContext({ surfaceId: "widget_detail", entityId: "w-1" }),
    );

    expect(ctx.principal.id).toBe("user-1");
    expect(ctx.surface).toBe("widget_detail");
    expect(ctx.manifest.surface).toBe("widget_detail");
    expect(ctx.manifest.fields.label).toEqual(["read"]);
    expect(getPrincipal).toHaveBeenCalled();
  });

  it("caches manifest per request when mode is request", async () => {
    process.env.LATCH_MANIFEST_CACHE_MODE = "request";
    const resolveSpy = vi.spyOn(policyService, "resolve");

    const { resolveContext } = createResolveContext<WidgetResolveInput>({
      getPrincipal: async () =>
        principalWithRoles("user-1", ["widget_reader"]),
      policyService,
      scopeFromInput: (input) => ({
        surface: input.surfaceId,
        entityId: input.entityId,
        mode: "detail",
      }),
      surfaceFromInput: (input) => input.surfaceId,
    });

    await runWithManifestRequestScope(async () => {
      await resolveContext({ surfaceId: "widget_detail", entityId: "w-1" });
      await resolveContext({ surfaceId: "widget_detail", entityId: "w-1" });
    });

    expect(resolveSpy).toHaveBeenCalledTimes(1);
    resolveSpy.mockRestore();
  });

  it("resolveContextFresh bypasses the read cache", async () => {
    process.env.LATCH_MANIFEST_CACHE_MODE = "request";
    const resolveSpy = vi.spyOn(policyService, "resolve");

    const { resolveContext, resolveContextFresh } =
      createResolveContext<WidgetResolveInput>({
        getPrincipal: async () =>
          principalWithRoles("user-1", ["widget_reader"]),
        policyService,
        scopeFromInput: (input) => ({
          surface: input.surfaceId,
          entityId: input.entityId,
          mode: "detail",
        }),
        surfaceFromInput: (input) => input.surfaceId,
      });

    await runWithManifestRequestScope(async () => {
      await resolveContext({ surfaceId: "widget_detail", entityId: "w-1" });
      await resolveContextFresh({ surfaceId: "widget_detail", entityId: "w-1" });
    });

    expect(resolveSpy).toHaveBeenCalledTimes(2);
    resolveSpy.mockRestore();
  });
});

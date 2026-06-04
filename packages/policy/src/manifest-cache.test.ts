import { describe, expect, it, vi } from "vitest";

import type { Principal } from "@latch/contracts";

import {
  createCachingPolicyService,
  createMapManifestCacheStore,
  InMemoryManifestCacheStore,
  manifestCacheKey,
  parseManifestCacheKey,
  parseManifestCacheMode,
  POLICY_VERSION_KEY_SENTINEL,
} from "./manifest-cache.js";
import { PolicyService } from "./policy-service.js";
import { definePolicyRegistry, defineSurfacePolicy } from "./registry.js";

const principal = (
  roles: string[],
  opts?: { id?: string; policyVersion?: number },
): Principal => ({
  id: opts?.id ?? "user-1",
  roles,
  ...(opts?.policyVersion !== undefined
    ? { policyVersion: opts.policyVersion }
    : {}),
});

const miniRegistry = definePolicyRegistry(
  defineSurfacePolicy(
    {
      surface: "widgets",
      roles: {
        editor: {
          fields: [{ field: "name", actions: ["read", "write"] }],
        },
      },
    },
    {
      fieldIds: ["name"],
      surfaceActionsByRole: { editor: ["read"] },
      kind: "business",
    },
  ),
);

describe("parseManifestCacheMode", () => {
  it("defaults to request when raw is empty", () => {
    expect(parseManifestCacheMode(undefined)).toBe("request");
    expect(parseManifestCacheMode("")).toBe("request");
    expect(parseManifestCacheMode("  ")).toBe("request");
  });

  it("accepts known modes case-insensitively", () => {
    expect(parseManifestCacheMode("NONE")).toBe("none");
    expect(parseManifestCacheMode("Request")).toBe("request");
  });

  it("throws for unknown mode", () => {
    expect(() => parseManifestCacheMode("redis")).toThrow(
      /Invalid manifestCacheMode/,
    );
  });
});

describe("manifestCacheKey", () => {
  it("includes principalId, policyVersion, surface, mode, and entityId", () => {
    const key = manifestCacheKey(
      principal(["editor"], { id: "u-9", policyVersion: 3 }),
      { surface: "widgets", mode: "detail", entityId: "rec-1" },
    );

    expect(parseManifestCacheKey(key)).toEqual({
      principalId: "u-9",
      policyVersion: 3,
      surfaceId: "widgets",
      mode: "detail",
      entityId: "rec-1",
    });
  });

  it("uses sentinel when policyVersion is omitted", () => {
    const key = manifestCacheKey(principal(["editor"]), {
      surface: "widgets",
      mode: "list",
    });

    expect(key).toContain(POLICY_VERSION_KEY_SENTINEL);
    expect(parseManifestCacheKey(key).policyVersion).toBeUndefined();
  });

  it("differs by mode and entityId on the same surface", () => {
    const base = principal(["editor"], { policyVersion: 1 });
    const listKey = manifestCacheKey(base, {
      surface: "widgets",
      mode: "list",
    });
    const detailKey = manifestCacheKey(base, {
      surface: "widgets",
      mode: "detail",
      entityId: "rec-1",
    });

    expect(listKey).not.toBe(detailKey);
  });
});

describe("CachingPolicyService", () => {
  const inner = new PolicyService({ registry: miniRegistry });
  const scope = { surface: "widgets" as const, mode: "list" as const };

  it("mode none returns inner PolicyService unchanged", () => {
    const wrapped = createCachingPolicyService(inner, { mode: "none" });
    expect(wrapped).toBe(inner);
  });

  it("request mode: second resolve with same key does not call inner twice", () => {
    const map = new Map<string, import("@latch/contracts").Manifest>();
    const store = createMapManifestCacheStore(map);
    const wrapped = createCachingPolicyService(
      inner,
      { mode: "request" },
      store,
    );
    expect(wrapped).not.toBe(inner);

    const spy = vi.spyOn(inner, "resolve");
    const p = principal(["editor"], { policyVersion: 2 });

    const first = wrapped.resolve(p, scope);
    const second = wrapped.resolve(p, scope);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    expect(first.policyVersion).toBe(2);
  });

  it("policyVersion change is a cache miss", () => {
    const map = new Map<string, import("@latch/contracts").Manifest>();
    const wrapped = createCachingPolicyService(
      inner,
      { mode: "request" },
      createMapManifestCacheStore(map),
    );

    const spy = vi.spyOn(inner, "resolve");

    wrapped.resolve(principal(["editor"], { policyVersion: 1 }), scope);
    wrapped.resolve(principal(["editor"], { policyVersion: 2 }), scope);

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("bypassCache always calls inner resolve", () => {
    const map = new Map<string, import("@latch/contracts").Manifest>();
    const wrapped = createCachingPolicyService(
      inner,
      { mode: "request" },
      createMapManifestCacheStore(map),
    ) as import("./manifest-cache.js").CachingPolicyService;

    const spy = vi.spyOn(inner, "resolve");
    const p = principal(["editor"], { policyVersion: 1 });

    wrapped.resolve(p, scope);
    wrapped.resolve(p, scope, { bypassCache: true });

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("ttl mode creates an in-memory store when none is passed", () => {
    const wrapped = createCachingPolicyService(inner, {
      mode: "ttl",
      ttlMs: 60_000,
    }) as import("./manifest-cache.js").CachingPolicyService;

    const spy = vi.spyOn(inner, "resolve");
    const p = principal(["editor"], { policyVersion: 5 });

    wrapped.resolve(p, scope);
    wrapped.resolve(p, scope);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("session mode throws at construction", () => {
    expect(
      () =>
        createCachingPolicyService(inner, { mode: "session" }),
    ).toThrow(/session/);
  });

  it("request store deleteByVersion drops entries for the old generation", () => {
    const map = new Map<string, import("@latch/contracts").Manifest>();
    const cacheStore = createMapManifestCacheStore(map);
    const wrapped = createCachingPolicyService(
      inner,
      { mode: "request" },
      cacheStore,
    );

    const spy = vi.spyOn(inner, "resolve");
    const p = principal(["editor"], { policyVersion: 4 });

    wrapped.resolve(p, scope);
    wrapped.resolve(p, scope);
    expect(spy).toHaveBeenCalledTimes(1);

    cacheStore.deleteByVersion(4);
    wrapped.resolve(p, scope);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("ttl store deleteByVersion drops entries for the old generation", () => {
    const cacheStore = new InMemoryManifestCacheStore(60_000);
    const wrapped = createCachingPolicyService(
      inner,
      { mode: "ttl", ttlMs: 60_000 },
      cacheStore,
    );

    const spy = vi.spyOn(inner, "resolve");
    const p = principal(["editor"], { policyVersion: 7 });

    wrapped.resolve(p, scope);
    wrapped.resolve(p, scope);
    expect(spy).toHaveBeenCalledTimes(1);

    cacheStore.deleteByVersion(7);
    wrapped.resolve(p, scope);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("rejects stale cached manifest when principal policyVersion no longer matches", () => {
    const map = new Map<string, import("@latch/contracts").Manifest>();
    const wrapped = createCachingPolicyService(
      inner,
      { mode: "request" },
      createMapManifestCacheStore(map),
    );

    const key = manifestCacheKey(
      principal(["editor"], { policyVersion: 1 }),
      scope,
    );
    map.set(key, {
      surface: "widgets",
      actions: ["read"],
      rowScope: "all",
      fields: { name: ["read", "write"] },
      policyVersion: 1,
    });

    const spy = vi.spyOn(inner, "resolve");
    const bumped = principal(["editor"], { policyVersion: 2 });
    const manifest = wrapped.resolve(bumped, scope);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(manifest.policyVersion).toBe(2);
  });
});

/**
 * Phase 06 DoD: repeatable check that cache hits skip redundant `PolicyService.resolve`.
 * Run: `npm run test -- -t "Phase 06"`
 */
describe("manifest cache benchmark (Phase 06 DoD)", () => {
  const inner = new PolicyService({ registry: miniRegistry });
  const scope = { surface: "widgets" as const, mode: "list" as const };
  const p = principal(["editor"], { policyVersion: 2 });

  const logMicroTiming = (
    label: string,
    iterations: number,
    run: () => void,
  ): void => {
    if (!process.env.LATCH_MANIFEST_CACHE_BENCHMARK_LOG) {
      return;
    }
    const t0 = performance.now();
    for (let i = 0; i < iterations; i += 1) {
      run();
    }
    const ms = performance.now() - t0;
    // eslint-disable-next-line no-console -- opt-in local benchmark only
    console.log(
      `[manifest-cache benchmark] ${label}: ${iterations} resolves in ${ms.toFixed(2)}ms`,
    );
  };

  it("regression: two cached reads with the same key invoke inner resolve once", () => {
    const map = new Map<string, import("@latch/contracts").Manifest>();
    const wrapped = createCachingPolicyService(
      inner,
      { mode: "request" },
      createMapManifestCacheStore(map),
    );

    const spy = vi.spyOn(inner, "resolve");

    wrapped.resolve(p, scope);
    wrapped.resolve(p, scope);

    expect(
      spy,
      "cache bypassed: expected one inner resolve for two identical cached reads",
    ).toHaveBeenCalledTimes(1);

    logMicroTiming("cached (request mode)", 500, () => {
      wrapped.resolve(p, scope);
      wrapped.resolve(p, scope);
    });
  });

  it("regression guard baseline: mode none always calls inner per read", () => {
    const uncached = createCachingPolicyService(inner, { mode: "none" });
    const spy = vi.spyOn(inner, "resolve");

    uncached.resolve(p, scope);
    uncached.resolve(p, scope);

    expect(spy).toHaveBeenCalledTimes(2);

    logMicroTiming("uncached (none mode)", 500, () => {
      uncached.resolve(p, scope);
      uncached.resolve(p, scope);
    });
  });
});

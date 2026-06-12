import { cache } from "react";

import type {
  Manifest,
  PermissionContext,
  PolicyScope,
  Principal,
  SurfaceId,
} from "@latch/contracts";
import {
  createCachingPolicyService,
  manifestCacheKey,
  parseManifestCacheKey,
  type ManifestCacheMode,
  type ManifestCacheStore,
  type PolicyService,
} from "@latch/policy";

import { getManifestCacheMode } from "./manifest-cache-config.js";
import { getRequestManifestCacheStore } from "./manifest-request-scope.js";

export type ResolveContextOptions = {
  /**
   * Mutations must bypass the read cache (`stalePolicyOnWrite: recheck`).
   * Prefer {@link ResolveContextApi.resolveContextFresh} at mutation call sites.
   */
  bypassCache?: boolean;
};

export type CreateResolveContextOptions<TInput extends { surfaceId: string }> =
  {
    getPrincipal: () => Promise<Principal>;
    policyService: PolicyService;
    /**
     * When set, builds a per-request `PolicyService` (e.g. DB-preloaded grants).
     * Takes precedence over `policyService` for resolve.
     */
    getPolicyService?: (principal: Principal) => Promise<PolicyService>;
    scopeFromInput: (input: TInput) => PolicyScope;
    surfaceFromInput: (input: TInput) => SurfaceId;
    getManifestCacheMode?: () => ManifestCacheMode;
    getRequestManifestCacheStore?: () => ManifestCacheStore;
  };

export type ResolveContextApi<TInput extends { surfaceId: string }> = {
  resolveContext: (
    input: TInput,
    options?: ResolveContextOptions,
  ) => Promise<PermissionContext>;
  resolveContextFresh: (input: TInput) => Promise<PermissionContext>;
};

const policyScopeFromCacheKey = (key: string): PolicyScope => {
  const parts = parseManifestCacheKey(key);
  return {
    surface: parts.surfaceId,
    ...(parts.mode !== undefined ? { mode: parts.mode } : {}),
    ...(parts.entityId !== undefined ? { entityId: parts.entityId } : {}),
  };
};

/** Wires `getPrincipal` → cached manifest → `PermissionContext`. */
export const createResolveContext = <TInput extends { surfaceId: string }>(
  options: CreateResolveContextOptions<TInput>,
): ResolveContextApi<TInput> => {
  const getCacheMode = options.getManifestCacheMode ?? getManifestCacheMode;
  const getRequestStore =
    options.getRequestManifestCacheStore ?? getRequestManifestCacheStore;

  const getRequestPrincipal = cache(options.getPrincipal);

  const getRequestPolicyService = cache(async (): Promise<PolicyService> => {
    if (!options.getPolicyService) {
      return options.policyService;
    }
    const principal = await getRequestPrincipal();
    return options.getPolicyService(principal);
  });

  const resolveManifestWithCache = async (
    principal: Principal,
    scope: PolicyScope,
    bypassCache: boolean,
  ): Promise<Manifest> => {
    const mode = getCacheMode();
    const policyService = createCachingPolicyService(
      await getRequestPolicyService(),
      { mode },
      mode === "request" ? getRequestStore() : undefined,
    );

    return policyService.resolve(
      principal,
      scope,
      bypassCache ? { bypassCache: true } : undefined,
    );
  };

  const resolveManifestForRequest = cache(
    async (cacheKey: string, bypassCache: boolean): Promise<Manifest> => {
      const principal = await getRequestPrincipal();
      const scope = policyScopeFromCacheKey(cacheKey);
      if (manifestCacheKey(principal, scope) !== cacheKey) {
        throw new Error("Manifest cache key mismatch for principal/scope");
      }
      return await resolveManifestWithCache(principal, scope, bypassCache);
    },
  );

  const resolveContextImpl = async (
    input: TInput,
    resolveOptions?: ResolveContextOptions,
  ): Promise<PermissionContext> => {
    const principal = await getRequestPrincipal();
    const scope = options.scopeFromInput(input);
    const cacheKey = manifestCacheKey(principal, scope);
    const manifest = await resolveManifestForRequest(
      cacheKey,
      resolveOptions?.bypassCache ?? false,
    );

    return {
      principal,
      manifest,
      surface: options.surfaceFromInput(input),
    };
  };

  return {
    resolveContext: (input, resolveOptions) =>
      resolveContextImpl(input, resolveOptions),
    resolveContextFresh: (input) =>
      resolveContextImpl(input, { bypassCache: true }),
  };
};

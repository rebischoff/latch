import type { Manifest, PolicyScope, Principal } from "@latch/contracts";
import { PolicyService } from "./policy-service.js";
/** v1 cache modes; `session` is seam-only until a session store exists. */
export type ManifestCacheMode = "none" | "request" | "ttl" | "session";
/**
 * Parse global option / env value (`LATCH_MANIFEST_CACHE_MODE`).
 * @throws when `raw` is set but not a known mode
 */
export declare const parseManifestCacheMode: (raw: string | undefined, defaultMode?: ManifestCacheMode) => ManifestCacheMode;
export interface ManifestCacheConfig {
    mode: ManifestCacheMode;
    /** Required when `mode` is `ttl`. */
    ttlMs?: number;
}
export interface ManifestCacheKeyParts {
    principalId: string;
    policyVersion: number | undefined;
    surfaceId: string;
    mode: PolicyScope["mode"] | undefined;
    entityId: string | undefined;
}
/** Sentinel in cache keys when `Principal.policyVersion` is omitted (stub principals). */
export declare const POLICY_VERSION_KEY_SENTINEL = "__none__";
/** Stable cache key per Phase 06 decisions. */
export declare const manifestCacheKey: (principal: Principal, scope: PolicyScope) => string;
export declare const parseManifestCacheKey: (key: string) => ManifestCacheKeyParts;
export interface ManifestCacheStore {
    get(key: string): Manifest | undefined;
    set(key: string, manifest: Manifest): void;
    /** Drop TTL entries keyed with the given generation (IAM bump). */
    deleteByVersion(policyVersion: number): void;
}
/** Adapter for per-request `Map` stores (`manifestCacheMode: request`). */
export declare const createMapManifestCacheStore: (map: Map<string, Manifest>) => ManifestCacheStore;
/** In-process TTL store for `manifestCacheMode: ttl`. */
export declare class InMemoryManifestCacheStore implements ManifestCacheStore {
    private readonly ttlMs;
    private readonly entries;
    constructor(ttlMs: number);
    get: (key: string) => Manifest | undefined;
    set: (key: string, manifest: Manifest) => void;
    deleteByVersion: (policyVersion: number) => void;
}
export interface ResolveManifestOptions {
    /** Mutations must bypass the read cache (`stalePolicyOnWrite: recheck`). */
    bypassCache?: boolean;
}
/** Wraps `PolicyService.resolve` with optional manifest caching. */
export declare class CachingPolicyService {
    private readonly inner;
    private readonly config;
    private readonly store;
    constructor(inner: PolicyService, config: ManifestCacheConfig, store?: ManifestCacheStore);
    resolve: (principal: Principal, scope: PolicyScope, options?: ResolveManifestOptions) => Manifest;
}
/**
 * Returns a caching wrapper, or the inner service when `mode` is `none`.
 * For `request`, pass a per-request store (e.g. `createMapManifestCacheStore(map)`).
 */
export declare const createCachingPolicyService: (inner: PolicyService, config: ManifestCacheConfig, store?: ManifestCacheStore) => PolicyService | CachingPolicyService;
//# sourceMappingURL=manifest-cache.d.ts.map
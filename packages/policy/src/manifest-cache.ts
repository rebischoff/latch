import type { Manifest, PolicyScope, Principal } from "@latch/contracts";

import { PolicyService } from "./policy-service.js";

/** v1 cache modes; `session` is seam-only until a session store exists. */
export type ManifestCacheMode = "none" | "request" | "ttl" | "session";

const MANIFEST_CACHE_MODES: readonly ManifestCacheMode[] = [
  "none",
  "request",
  "ttl",
  "session",
];

/**
 * Parse global option / env value (`LATCH_MANIFEST_CACHE_MODE`).
 * @throws when `raw` is set but not a known mode
 */
export const parseManifestCacheMode = (
  raw: string | undefined,
  defaultMode: ManifestCacheMode = "request",
): ManifestCacheMode => {
  if (raw === undefined || raw.trim() === "") {
    return defaultMode;
  }
  const normalized = raw.trim().toLowerCase();
  if ((MANIFEST_CACHE_MODES as readonly string[]).includes(normalized)) {
    return normalized as ManifestCacheMode;
  }
  throw new Error(
    `Invalid manifestCacheMode "${raw}"; expected one of: ${MANIFEST_CACHE_MODES.join(", ")}`,
  );
};

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
export const POLICY_VERSION_KEY_SENTINEL = "__none__";

/** Stable cache key per Phase 06 decisions. */
export const manifestCacheKey = (
  principal: Principal,
  scope: PolicyScope,
): string => {
  const version =
    principal.policyVersion === undefined
      ? POLICY_VERSION_KEY_SENTINEL
      : String(principal.policyVersion);
  const mode = scope.mode ?? "";
  const entityId = scope.entityId ?? "";
  return [principal.id, version, scope.surface, mode, entityId].join("\0");
};

export const parseManifestCacheKey = (key: string): ManifestCacheKeyParts => {
  const [principalId, versionRaw, surfaceId, modeRaw, entityIdRaw] =
    key.split("\0");
  const policyVersion =
    versionRaw === POLICY_VERSION_KEY_SENTINEL
      ? undefined
      : Number(versionRaw);
  const mode =
    modeRaw === "" ? undefined : (modeRaw as PolicyScope["mode"]);
  const entityId = entityIdRaw === "" ? undefined : entityIdRaw;
  return { principalId, policyVersion, surfaceId, mode, entityId };
};

export interface ManifestCacheStore {
  get(key: string): Manifest | undefined;
  set(key: string, manifest: Manifest): void;
  /** Drop TTL entries keyed with the given generation (IAM bump). */
  deleteByVersion(policyVersion: number): void;
}

/** Adapter for per-request `Map` stores (`manifestCacheMode: request`). */
export const createMapManifestCacheStore = (
  map: Map<string, Manifest>,
): ManifestCacheStore => ({
  get: (key) => map.get(key),
  set: (key, manifest) => {
    map.set(key, manifest);
  },
  deleteByVersion: (policyVersion) => {
    const needle = `\0${policyVersion}\0`;
    for (const key of map.keys()) {
      if (key.includes(needle)) {
        map.delete(key);
      }
    }
  },
});

interface TtlCacheEntry {
  manifest: Manifest;
  expiresAt: number;
}

/** In-process TTL store for `manifestCacheMode: ttl`. */
export class InMemoryManifestCacheStore implements ManifestCacheStore {
  private readonly entries = new Map<string, TtlCacheEntry>();

  constructor(private readonly ttlMs: number) {
    if (ttlMs <= 0) {
      throw new Error("ttlMs must be positive");
    }
  }

  get = (key: string): Manifest | undefined => {
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.manifest;
  };

  set = (key: string, manifest: Manifest): void => {
    this.entries.set(key, {
      manifest,
      expiresAt: Date.now() + this.ttlMs,
    });
  };

  deleteByVersion = (policyVersion: number): void => {
    const needle = `\0${policyVersion}\0`;
    for (const key of [...this.entries.keys()]) {
      if (key.includes(needle)) {
        this.entries.delete(key);
      }
    }
  };
};

export interface ResolveManifestOptions {
  /** Mutations must bypass the read cache (`stalePolicyOnWrite: recheck`). */
  bypassCache?: boolean;
}

const policyVersionsMatch = (
  principal: Principal,
  manifest: Manifest,
): boolean => manifest.policyVersion === principal.policyVersion;

const withPolicyVersionEcho = (
  principal: Principal,
  manifest: Manifest,
): Manifest =>
  principal.policyVersion === undefined
    ? manifest
    : { ...manifest, policyVersion: principal.policyVersion };

/** Wraps `PolicyService.resolve` with optional manifest caching. */
export class CachingPolicyService {
  private readonly store: ManifestCacheStore;

  constructor(
    private readonly inner: PolicyService,
    private readonly config: ManifestCacheConfig,
    store?: ManifestCacheStore,
  ) {
    if (config.mode === "session") {
      throw new Error(
        "manifestCacheMode 'session' is not implemented; use 'request', 'ttl', or 'none'",
      );
    }
    if (config.mode === "request" && store === undefined) {
      throw new Error(
        "manifestCacheMode 'request' requires a per-request ManifestCacheStore",
      );
    }
    if (config.mode === "ttl") {
      if (config.ttlMs === undefined) {
        throw new Error("manifestCacheMode 'ttl' requires ttlMs");
      }
      this.store = store ?? new InMemoryManifestCacheStore(config.ttlMs);
      return;
    }
    this.store = store!;
  }

  resolve = (
    principal: Principal,
    scope: PolicyScope,
    options?: ResolveManifestOptions,
  ): Manifest => {
    if (options?.bypassCache) {
      return withPolicyVersionEcho(principal, this.inner.resolve(principal, scope));
    }

    const key = manifestCacheKey(principal, scope);
    const cached = this.store.get(key);
    if (cached !== undefined && policyVersionsMatch(principal, cached)) {
      return cached;
    }

    const manifest = withPolicyVersionEcho(
      principal,
      this.inner.resolve(principal, scope),
    );
    this.store.set(key, manifest);
    return manifest;
  };
}

/**
 * Returns a caching wrapper, or the inner service when `mode` is `none`.
 * For `request`, pass a per-request store (e.g. `createMapManifestCacheStore(map)`).
 */
export const createCachingPolicyService = (
  inner: PolicyService,
  config: ManifestCacheConfig,
  store?: ManifestCacheStore,
): PolicyService | CachingPolicyService => {
  parseManifestCacheMode(config.mode);
  if (config.mode === "none") {
    return inner;
  }
  return new CachingPolicyService(inner, config, store);
};

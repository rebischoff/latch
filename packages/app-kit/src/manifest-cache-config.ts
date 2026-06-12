import {
  parseManifestCacheMode,
  type ManifestCacheMode,
} from "@latch/policy";

/** Production default when `LATCH_MANIFEST_CACHE_MODE` is unset. */
export const DEFAULT_MANIFEST_CACHE_MODE: ManifestCacheMode = "request";

/**
 * Current manifest cache mode from `LATCH_MANIFEST_CACHE_MODE`.
 * Evaluated per call so Vitest can override env in individual suites.
 */
export const getManifestCacheMode = (): ManifestCacheMode =>
  parseManifestCacheMode(
    process.env.LATCH_MANIFEST_CACHE_MODE,
    DEFAULT_MANIFEST_CACHE_MODE,
  );

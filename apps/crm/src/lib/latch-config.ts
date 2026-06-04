import {
  parseManifestCacheMode,
  type ManifestCacheMode,
} from "@latch/policy";

/** Aligns with global option `manifestCacheMode` (CRM production default). */
export const CRM_DEFAULT_MANIFEST_CACHE_MODE: ManifestCacheMode = "request";

/**
 * Current manifest cache mode from `LATCH_MANIFEST_CACHE_MODE`.
 * Evaluated per call so Vitest can override env in individual suites.
 */
export const getManifestCacheMode = (): ManifestCacheMode =>
  parseManifestCacheMode(
    process.env.LATCH_MANIFEST_CACHE_MODE,
    CRM_DEFAULT_MANIFEST_CACHE_MODE,
  );

import { type ManifestCacheMode } from "@latch/policy";
/** Production default when `LATCH_MANIFEST_CACHE_MODE` is unset. */
export declare const DEFAULT_MANIFEST_CACHE_MODE: ManifestCacheMode;
/**
 * Current manifest cache mode from `LATCH_MANIFEST_CACHE_MODE`.
 * Evaluated per call so Vitest can override env in individual suites.
 */
export declare const getManifestCacheMode: () => ManifestCacheMode;
//# sourceMappingURL=manifest-cache-config.d.ts.map
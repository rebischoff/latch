import { type ManifestCacheStore } from "@latch/policy";
/**
 * Request-scoped manifest map for `manifestCacheMode: request`.
 * Prefer React `cache()` in production RSC; tests use {@link runWithManifestRequestScope}.
 */
export declare const getRequestManifestCacheStore: () => ManifestCacheStore;
/** Simulates one server request in Vitest (React `cache()` is not request-scoped in Node). */
export declare const runWithManifestRequestScope: <T>(fn: () => T | Promise<T>) => T | Promise<T>;
//# sourceMappingURL=manifest-request-scope.d.ts.map
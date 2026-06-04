import { AsyncLocalStorage } from "node:async_hooks";
import { cache } from "react";

import type { Manifest } from "@latch/contracts";
import { createMapManifestCacheStore, type ManifestCacheStore } from "@latch/policy";

const requestManifestStoreAls = new AsyncLocalStorage<Map<string, Manifest>>();

/** Per RSC/HTTP request when React `cache()` is active (Next.js server). */
const getRequestManifestMapFromReactCache = cache(
  (): Map<string, Manifest> => new Map(),
);

/**
 * Request-scoped manifest map for `manifestCacheMode: request`.
 * Prefer React `cache()` in production RSC; tests use {@link runWithManifestRequestScope}.
 */
export const getRequestManifestCacheStore = (): ManifestCacheStore => {
  const alsMap = requestManifestStoreAls.getStore();
  if (alsMap) {
    return createMapManifestCacheStore(alsMap);
  }
  return createMapManifestCacheStore(getRequestManifestMapFromReactCache());
};

/** Simulates one server request in Vitest (React `cache()` is not request-scoped in Node). */
export const runWithManifestRequestScope = <T>(
  fn: () => T | Promise<T>,
): T | Promise<T> => requestManifestStoreAls.run(new Map(), fn);

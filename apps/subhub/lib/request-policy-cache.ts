import { principalRoleIds, type Principal } from "@latch/contracts";
import type { MemoryRoleGrantProvider } from "@latch/policy";

const PRINCIPAL_CACHE_TTL_MS =
  process.env.NODE_ENV === "development" ? 5 * 60_000 : 15_000;

type PrincipalCacheEntry = {
  sessionKey: string;
  principal: Principal;
  expiresAt: number;
};

type GrantsCacheEntry = {
  key: string;
  provider: MemoryRoleGrantProvider;
};

let principalCache: PrincipalCacheEntry | undefined;
let grantsCache: GrantsCacheEntry | undefined;
let principalInflight: {
  sessionKey: string;
  promise: Promise<Principal>;
} | undefined;
let grantsInflight: {
  key: string;
  promise: Promise<MemoryRoleGrantProvider>;
} | undefined;

const grantsCacheKey = (principal: Principal): string => {
  const version = principal.policyVersion ?? -1;
  const roles = [...principalRoleIds(principal)].sort().join(",");
  return `${version}\0${roles}`;
};

/** Short-lived process cache — safe across layout + API requests in dev. */
export const readPrincipalProcessCache = (
  sessionKey: string,
): Principal | undefined => {
  const entry = principalCache;
  if (!entry || entry.sessionKey !== sessionKey) {
    return undefined;
  }
  if (Date.now() >= entry.expiresAt) {
    principalCache = undefined;
    return undefined;
  }
  return entry.principal;
};

export const writePrincipalProcessCache = (
  sessionKey: string,
  principal: Principal,
): void => {
  principalCache = {
    sessionKey,
    principal,
    expiresAt: Date.now() + PRINCIPAL_CACHE_TTL_MS,
  };
};

/** Coalesce parallel principal loads (RSC layout + API route on first paint). */
export const resolvePrincipalWithProcessCache = (
  sessionKey: string,
  load: () => Promise<Principal>,
): { promise: Promise<Principal>; source: "process" | "inflight" | "loaded" } => {
  const cached = readPrincipalProcessCache(sessionKey);
  if (cached) {
    return { promise: Promise.resolve(cached), source: "process" };
  }

  if (principalInflight?.sessionKey === sessionKey) {
    return { promise: principalInflight.promise, source: "inflight" };
  }

  const promise = load()
    .then((principal) => {
      writePrincipalProcessCache(sessionKey, principal);
      return principal;
    })
    .finally(() => {
      if (principalInflight?.sessionKey === sessionKey) {
        principalInflight = undefined;
      }
    });

  principalInflight = { sessionKey, promise };
  return { promise, source: "loaded" };
};

export const readGrantsProcessCache = (
  principal: Principal,
): MemoryRoleGrantProvider | undefined => {
  const key = grantsCacheKey(principal);
  if (grantsCache?.key === key) {
    return grantsCache.provider;
  }
  return undefined;
};

export const writeGrantsProcessCache = (
  principal: Principal,
  provider: MemoryRoleGrantProvider,
): void => {
  grantsCache = { key: grantsCacheKey(principal), provider };
};

/** Coalesce parallel grant preloads for the same principal. */
export const resolveGrantsWithProcessCache = (
  principal: Principal,
  load: () => Promise<MemoryRoleGrantProvider>,
): Promise<MemoryRoleGrantProvider> => {
  const cached = readGrantsProcessCache(principal);
  if (cached) {
    return Promise.resolve(cached);
  }

  const key = grantsCacheKey(principal);
  if (grantsInflight?.key === key) {
    return grantsInflight.promise;
  }

  const promise = load()
    .then((provider) => {
      writeGrantsProcessCache(principal, provider);
      return provider;
    })
    .finally(() => {
      if (grantsInflight?.key === key) {
        grantsInflight = undefined;
      }
    });

  grantsInflight = { key, promise };
  return promise;
};

export const invalidatePolicyProcessCaches = (): void => {
  principalCache = undefined;
  grantsCache = undefined;
  principalInflight = undefined;
  grantsInflight = undefined;
};

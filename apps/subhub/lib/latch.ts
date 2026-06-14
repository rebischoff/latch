import { createDatabaseConnections } from "@latch/adapter-neon";
import {
  createBetterAuth,
  createGetPrincipal,
  readBetterAuthSession,
} from "@latch/adapter-better-auth";
import {
  createEnsureAuditBootstrap,
  createResolveContext,
  preloadRoleGrantsFromDb,
} from "@latch/app-kit";
import { principalRoleIds, type PolicyScope, type SurfaceId } from "@latch/contracts";
import { PolicyService } from "@latch/policy";
import { headers } from "next/headers";

import { minPasswordLength } from "./auth-password.js";
import { getConnections, getPool } from "./db.js";
import { subhubRegistry } from "./policy-registry.js";

let authInstance: ReturnType<typeof createBetterAuth> | undefined;

export const getAuth = (): ReturnType<typeof createBetterAuth> => {
  authInstance ??= createBetterAuth({ minPasswordLength, pool: getPool });
  return authInstance;
};

/**
 * Lazy Better Auth instance for rare direct imports.
 * Route handlers should use `createAuthRouteHandlers(getAuth)` — not this Proxy.
 */
export const auth = new Proxy({} as ReturnType<typeof createBetterAuth>, {
  get(_target, prop, receiver) {
    return Reflect.get(getAuth(), prop, receiver);
  },
  has(_target, prop) {
    return prop in getAuth();
  },
});

export const getPrincipal = createGetPrincipal({
  readSession: () => readBetterAuthSession(getAuth(), () => headers()),
  pool: getPool,
});

const registry = subhubRegistry;

const policyService = new PolicyService({ registry });

export type ResolveContextInput = {
  surfaceId: SurfaceId;
  entityId?: string;
};

const scopeFromInput = (input: ResolveContextInput): PolicyScope =>
  input.entityId !== undefined
    ? { surface: input.surfaceId, entityId: input.entityId, mode: "detail" }
    : { surface: input.surfaceId, mode: "list" };

const { resolveContext, resolveContextFresh } = createResolveContext({
  getPrincipal,
  policyService,
  getPolicyService: async (principal) => {
    const grantProvider = await preloadRoleGrantsFromDb(
      getPool(),
      principalRoleIds(principal),
    );
    return new PolicyService({ registry, grantProvider });
  },
  scopeFromInput,
  surfaceFromInput: (input) => input.surfaceId,
});

export { resolveContext, resolveContextFresh, policyService };

export const { ensureAuditWriter, ensureAuditMode, ensureAuditBootstrap } =
  createEnsureAuditBootstrap({ getConnections });

export { createDatabaseConnections, getConnections, getPool };

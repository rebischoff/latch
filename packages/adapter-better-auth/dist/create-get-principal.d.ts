import { type Principal } from "@latch/contracts";
import type { Pool } from "pg";
import type { ProviderSession } from "./provider-session.js";
export type GetPrincipal = () => Promise<Principal>;
export type CreateGetPrincipalOptions = {
    readSession: () => Promise<ProviderSession | null>;
    /** When set, roles/scopes load from Postgres via `loadPrincipalFromDb`. */
    pool?: Pool | (() => Pool | undefined);
    /** Override subject → `latch_users.id` mapping (defaults to {@link resolveLatchUserId}). */
    resolveUserId?: (session: ProviderSession, pool: Pool) => Promise<string>;
    /** Override principal load (defaults to {@link loadPrincipalFromDb}). */
    loadPrincipal?: (pool: Pool, userId: string) => Promise<Principal>;
};
/**
 * Identity port: Better Auth session supplies subject (+ optional email);
 * {@link Principal} id, bindings, and `roleClasses` always come from the DB.
 */
export declare const createGetPrincipal: (options: CreateGetPrincipalOptions) => GetPrincipal;
//# sourceMappingURL=create-get-principal.d.ts.map
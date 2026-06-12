import type { Auth } from "better-auth";
export type CreateBetterAuthOptions = {
    secret?: string;
    baseURL?: string;
    minPasswordLength?: number;
};
/**
 * Better Auth server config — session/JWT only (no `database` option).
 * Provider user rows are ephemeral; `latch_users` is the sole identity table.
 */
export declare const createBetterAuth: (options?: CreateBetterAuthOptions) => Auth;
export type BetterAuthInstance = Auth;
//# sourceMappingURL=better-auth-server.d.ts.map
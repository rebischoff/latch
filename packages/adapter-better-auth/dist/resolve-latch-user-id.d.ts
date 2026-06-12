import type { Pool } from "pg";
export type ResolveLatchUserInput = {
    /** Better Auth subject / session user id. */
    subject: string;
    /** Login email from the provider session (optional bridge to `login_email`). */
    email?: string;
};
/**
 * Map a Better Auth subject to stable `latch_users.id`.
 * Tries direct id match first, then `login_email` when email is present.
 * Falls back to the provider subject when no row matches (empty role bindings).
 */
export declare const resolveLatchUserId: (pool: Pool, input: ResolveLatchUserInput) => Promise<string>;
//# sourceMappingURL=resolve-latch-user-id.d.ts.map
import type { Auth } from "better-auth";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";
import type { Pool } from "pg";

import { latchCredentialsPlugin } from "./latch-credentials-plugin.js";

export type CreateBetterAuthOptions = {
  secret?: string;
  baseURL?: string;
  minPasswordLength?: number;
  /** When set, sign-in hydrates the memory adapter from `latch_users.password_hash`. */
  pool?: Pool | (() => Pool);
};

export type BetterAuthInstance = Auth & {
  $context: Promise<{
    internalAdapter: {
      findUserByEmail: (
        email: string,
        options: { includeAccounts: boolean },
      ) => Promise<{
        user: { id: string };
        accounts: Array<{ providerId: string; password?: string | null }>;
      } | null>;
      createUser: (input: {
        email: string;
        name: string;
        emailVerified: boolean;
      }) => Promise<{ id: string } | null>;
      linkAccount: (input: {
        userId: string;
        providerId: string;
        accountId: string;
        password: string;
      }) => Promise<unknown>;
      updatePassword: (userId: string, password: string) => Promise<void>;
    };
  }>;
};

/**
 * Better Auth server config — session/JWT only (no `database` option).
 * Provider user rows are ephemeral; `latch_users` is the sole identity table.
 */
export const createBetterAuth = (
  options: CreateBetterAuthOptions = {},
): BetterAuthInstance => {
  const secret =
    options.secret ??
    process.env.BETTER_AUTH_SECRET?.trim() ??
    process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "BETTER_AUTH_SECRET or AUTH_SECRET is required for Better Auth",
    );
  }

  let authInstance: BetterAuthInstance | undefined;

  const plugins = [
    nextCookies(),
    ...(options.pool
      ? [
          latchCredentialsPlugin(options.pool, () => {
            if (!authInstance) {
              throw new Error("Better Auth is not initialized");
            }
            return authInstance;
          }),
        ]
      : []),
  ];

  authInstance = betterAuth({
    secret,
    baseURL: options.baseURL ?? process.env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: options.minPasswordLength ?? 8,
    },
    plugins,
  }) as unknown as BetterAuthInstance;

  return authInstance;
};


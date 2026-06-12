import type { Auth } from "better-auth";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";

export type CreateBetterAuthOptions = {
  secret?: string;
  baseURL?: string;
  minPasswordLength?: number;
};

/**
 * Better Auth server config — session/JWT only (no `database` option).
 * Provider user rows are ephemeral; `latch_users` is the sole identity table.
 */
export const createBetterAuth = (
  options: CreateBetterAuthOptions = {},
): Auth => {
  const secret =
    options.secret ??
    process.env.BETTER_AUTH_SECRET?.trim() ??
    process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "BETTER_AUTH_SECRET or AUTH_SECRET is required for Better Auth",
    );
  }

  return betterAuth({
    secret,
    baseURL: options.baseURL ?? process.env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: options.minPasswordLength ?? 8,
    },
    plugins: [nextCookies()],
  }) as unknown as Auth;
};

export type BetterAuthInstance = Auth;

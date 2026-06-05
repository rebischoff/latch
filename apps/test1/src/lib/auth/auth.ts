import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";

/**
 * Better Auth server config — authentication only (no org/role plugins).
 *
 * No `database` option → built-in in-memory store (authn only).
 * Better Auth user rows are separate from `latch_users`; `getPrincipal()` resolves
 * `Principal.id` by `login_email` against seed rows — see docs/AUTH.md.
 */
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    // Align with TEST1_DEV_PASSWORD default (`demo`) — dev only.
    minPasswordLength: 4,
  },
  plugins: [nextCookies()],
});

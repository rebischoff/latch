import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";

/**
 * Better Auth server config — authentication only (no org/role plugins).
 *
 * No `database` option → built-in in-memory store until task 05 wires Neon.
 * Better Auth user rows are separate from `latch_users`; seed alignment is task 05.
 * Login E2E waits for task 05 seed — see docs/CONFIG.md § Better Auth (dev).
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

import type { BetterAuthInstance } from "./better-auth-server.js";

export type AuthRouteInput = BetterAuthInstance | (() => BetterAuthInstance);

const resolveAuth = (input: AuthRouteInput): BetterAuthInstance =>
  typeof input === "function" ? input() : input;

/**
 * Next.js App Router handlers for `app/api/auth/[...all]/route.ts`.
 *
 * Accepts a Better Auth instance or a lazy getter (`getAuth`). Does not use
 * `toNextJsHandler` directly — that helper's `"handler" in auth` check breaks
 * on the lazy `auth` Proxy in template `lib/latch.ts`.
 */
export const createAuthRouteHandlers = (
  authInput: AuthRouteInput,
): {
  GET: (request: Request) => Promise<Response>;
  POST: (request: Request) => Promise<Response>;
} => {
  const handler = async (request: Request): Promise<Response> => {
    const auth = resolveAuth(authInput);
    if (typeof auth.handler !== "function") {
      throw new TypeError(
        "createAuthRouteHandlers expected a Better Auth instance with a .handler method",
      );
    }
    return auth.handler(request);
  };

  return {
    GET: handler,
    POST: handler,
  };
};

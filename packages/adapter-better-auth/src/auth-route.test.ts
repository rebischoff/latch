import { describe, expect, it, vi } from "vitest";

import { createAuthRouteHandlers } from "./auth-route.js";
import type { BetterAuthInstance } from "./better-auth-server.js";

const mockAuth = (): BetterAuthInstance => {
  const handler = vi.fn(async () => new Response("ok", { status: 200 }));
  return { handler } as unknown as BetterAuthInstance;
};

describe("createAuthRouteHandlers", () => {
  it("invokes .handler on a Better Auth instance", async () => {
    const auth = mockAuth();
    const { GET } = createAuthRouteHandlers(auth);
    const request = new Request("http://localhost/api/auth/get-session");

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(auth.handler).toHaveBeenCalledWith(request);
  });

  it("resolves a lazy getter (getAuth pattern)", async () => {
    const auth = mockAuth();
    const { GET } = createAuthRouteHandlers(() => auth);
    const request = new Request("http://localhost/api/auth/get-session");

    await GET(request);

    expect(auth.handler).toHaveBeenCalledWith(request);
  });

  it("does not treat a lazy getter as a callable handler", async () => {
    const auth = mockAuth();
    const { GET } = createAuthRouteHandlers(() => auth);

    await expect(
      GET(new Request("http://localhost/api/auth/get-session")),
    ).resolves.toBeInstanceOf(Response);
  });
});

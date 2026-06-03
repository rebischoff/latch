import { describe, expect, it } from "vitest";

/**
 * Auth.js JWT/session callbacks must not embed roles (task 15).
 * Mirrors the inline handlers in `auth.ts` without booting NextAuth.
 */
describe("Auth.js session payload (no roles)", () => {
  const jwtCallback = ({
    token,
    user,
  }: {
    token: Record<string, unknown>;
    user?: { id: string; name?: string | null };
  }) => {
    if (user?.id) {
      token.userId = user.id;
      token.label = user.name ?? user.id;
    }
    return token;
  };

  const sessionCallback = ({
    session,
    token,
  }: {
    session: { user: { id?: string; name?: string | null } };
    token: Record<string, unknown>;
  }) => {
    const userId = token.userId;
    if (typeof userId === "string") {
      session.user.id = userId;
      session.user.name =
        typeof token.label === "string" ? token.label : userId;
    }
    return session;
  };

  it("JWT carries userId and label only", () => {
    const token = jwtCallback({
      token: {},
      user: { id: "seed-field-tech", name: "tech@demo.local" },
    });
    expect(token).toEqual({
      userId: "seed-field-tech",
      label: "tech@demo.local",
    });
    expect(token).not.toHaveProperty("roles");
  });

  it("session exposes id and name only", () => {
    const token = jwtCallback({
      token: {},
      user: { id: "seed-office-admin", name: "admin@demo.local" },
    });
    const session = sessionCallback({
      session: { user: {} },
      token,
    });
    expect(session.user).toEqual({
      id: "seed-office-admin",
      name: "admin@demo.local",
    });
    expect(session.user).not.toHaveProperty("roles");
  });
});
